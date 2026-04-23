import { Resend } from 'resend';
import admin from 'firebase-admin';

// Initialize Firebase Admin (singleton pattern to avoid re-initialization)
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Accept POST (from client) and GET (from Vercel Cron)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Removed CRON_SECRET strict check so client can trigger this immediately
  // after writing to the queue. Safe because it only processes existing
  // queue documents which are secured by Firebase Rules on creation.

  if (!db) {
    return res.status(500).json({ error: 'Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY env var.' });
  }

  try {
    // Fetch pending notifications
    const queueRef = db.collection('notification_queue');
    const snapshot = await queueRef.where('status', '==', 'pending').limit(10).get();

    if (snapshot.empty) {
      return res.status(200).json({ message: 'No pending notifications' });
    }

    const results = [];

    // Process each notification
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const { email, subject, html, to } = data;
      const targetEmail = to || email; 

      // Prevent duplicate sending / idempotency
      // Update status to processing first to lock the document
      await doc.ref.update({
        status: 'processing',
        processingAt: admin.firestore.FieldValue.serverTimestamp()
      });

      if (!targetEmail || !subject || !html) {
        await doc.ref.update({ 
          status: 'failed', 
          error: 'Missing required fields',
          attempts: admin.firestore.FieldValue.increment(1)
        });
        results.push({ id: doc.id, success: false, error: 'Missing fields' });
        continue;
      }

      try {
        // Send email via Resend
        // The 'from' email needs to be configured in Resend
        const fromEmail = process.env.EMAIL_FROM || 'InfinityX <noreply@academy.infx.space>';
        
        const emailResponse = await resend.emails.send({
          from: fromEmail,
          to: [targetEmail],
          subject: subject,
          html: html,
        });

        if (emailResponse.error) {
          throw new Error(emailResponse.error.message);
        }

        // Mark as sent and record processedAt timestamp
        await doc.ref.update({
          status: 'sent',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          resendId: emailResponse.data?.id
        });

        results.push({ id: doc.id, success: true });
      } catch (err) {
        console.error(`Failed to send email to ${targetEmail}:`, err);
        await doc.ref.update({
          status: 'failed',
          error: err.message,
          lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
          attempts: admin.firestore.FieldValue.increment(1)
        });
        results.push({ id: doc.id, success: false, error: err.message });
      }
    }

    return res.status(200).json({ processed: results.length, results });

  } catch (error) {
    console.error('Error processing queue:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
