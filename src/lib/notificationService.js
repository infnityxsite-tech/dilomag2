import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { queueNotification } from './auth';

/**
 * Sends a notification email to students assigned to specific diplomas.
 * Prevents duplicate emails by taking the union of students across the provided diplomas.
 * 
 * @param {string[]} diplomaIds - Array of diploma IDs the content is assigned to.
 * @param {string} contentTitle - The title of the new content.
 * @param {string} contentType - The type of content (e.g., 'lecture', 'material', 'homework').
 * @param {string} actionUrl - URL where the student can view the content.
 */
export const notifyStudentsForContent = async (diplomaIds, contentTitle, contentType, actionUrl = 'https://infinityx.edu') => {
  if (!diplomaIds || diplomaIds.length === 0) {
    console.warn('notifyStudentsForContent: No diploma IDs provided. Skipping notifications to prevent global spam.');
    return;
  }

  try {
    // 1. Fetch all authorized students
    const authorizedEmailsRef = collection(db, 'authorizedEmails');
    const snapshot = await getDocs(authorizedEmailsRef);
    
    // 2. Filter students and collect unique emails
    const targetEmails = new Set();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email;
      const classIds = data.classIds || [];
      
      // Check if student belongs to ANY of the target diplomas
      const hasAccess = diplomaIds.some(id => classIds.includes(id));
      if (hasAccess && email) {
        targetEmails.add(email.toLowerCase());
      }
    });

    if (targetEmails.size === 0) {
      console.log(`notifyStudentsForContent: No students found enrolled in diplomas [${diplomaIds.join(', ')}].`);
      return;
    }

    // 3. Build Email Payload
    const subject = `New ${contentType} Available: ${contentTitle}`;
    const htmlPayload = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Infinity X EdTech Platform</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          A new <strong>${contentType.toLowerCase()}</strong> has been added to your curriculum:
        </p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 20px 0;">
          <h3 style="margin: 0; color: #1e293b;">${contentTitle}</h3>
        </div>
        <a href="${actionUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
          View ${contentType}
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          You are receiving this because you are enrolled in a diploma associated with this content.
        </p>
      </div>
    `;

    // 4. Queue Notifications
    const queuePromises = Array.from(targetEmails).map(email => 
      queueNotification(email, subject, htmlPayload)
    );

    await Promise.allSettled(queuePromises);
    console.log(`notifyStudentsForContent: Queued ${targetEmails.size} notifications for "${contentTitle}".`);
    
    return true;
  } catch (error) {
    console.error('Error in notifyStudentsForContent:', error);
    return false;
  }
};
