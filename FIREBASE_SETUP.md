# Firebase Setup Guide - AI Diploma Portal

This guide provides detailed instructions for setting up Firebase for the AI Diploma Portal.

## 🔥 Firebase Project Creation

### Step 1: Create a New Firebase Project

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Sign in with your Google account

2. **Create Project**
   - Click "Create a project"
   - Enter project name: `ai-diploma-portal` (or your preferred name)
   - Choose whether to enable Google Analytics (recommended)
   - Select Analytics account or create new one
   - Click "Create project"

3. **Wait for Setup**
   - Firebase will set up your project
   - Click "Continue" when ready

## 🗄️ Firestore Database Setup

### Step 1: Enable Firestore

1. **Navigate to Firestore**
   - In Firebase Console, click "Firestore Database" in the left sidebar
   - Click "Create database"

2. **Security Rules**
   - Choose "Start in test mode" for initial setup
   - Select a location close to your users (e.g., us-central1)
   - Click "Done"

### Step 2: Create Required Collections

#### Collection 1: `authorizedEmails`

```javascript
// Purpose: Store email addresses that can access the student portal
// Collection: authorizedEmails

// Example documents:
// Document 1 (auto-generated ID)
{
  email: "student1@example.com"
}

// Document 2 (auto-generated ID)
{
  email: "student2@example.com"
}

// Document 3 (auto-generated ID)
{
  email: "john.doe@university.edu"
}
```

**To create this collection:**
1. Click "Start collection"
2. Collection ID: `authorizedEmails`
3. Add first document with auto-generated ID
4. Add field: `email` (string) with value: `student@example.com`
5. Click "Save"

#### Collection 2: `admin`

```javascript
// Purpose: Store admin credentials for admin panel access
// Collection: admin

// Document ID: credentials (manually set)
{
  email: "admin@yourcompany.com",
  password: "your-secure-password-here"
}
```

**To create this collection:**
1. Click "Start collection"
2. Collection ID: `admin`
3. Document ID: `credentials` (manually enter this)
4. Add fields:
   - `email` (string): `admin@yourcompany.com`
   - `password` (string): `your-secure-password`
5. Click "Save"

#### Collection 3: `content`

```javascript
// Purpose: Store all dashboard content (lectures, materials, links, notes)
// Collection: content

// Document ID: dashboard (manually set)
{
  lectures: [
    {
      id: "lecture-001",
      title: "Introduction to Artificial Intelligence",
      description: "Overview of AI concepts, history, and applications",
      url: "https://drive.google.com/file/d/1BvExample123456789/preview",
      duration: "45 min",
      date: "2024-01-15",
      thumbnail: "https://drive.google.com/thumbnail?id=1BvExample123456789"
    },
    {
      id: "lecture-002",
      title: "Machine Learning Fundamentals",
      description: "Basic concepts of supervised and unsupervised learning",
      url: "https://drive.google.com/file/d/1BvExample987654321/preview",
      duration: "60 min",
      date: "2024-01-22"
    }
  ],
  materials: [
    {
      id: "material-001",
      title: "AI Fundamentals Textbook",
      description: "Comprehensive guide to artificial intelligence",
      url: "https://drive.google.com/file/d/1BvMaterial123456789/view",
      type: "PDF"
    },
    {
      id: "material-002",
      title: "ML Algorithms Cheat Sheet",
      description: "Quick reference for machine learning algorithms",
      url: "https://docs.google.com/presentation/d/1BvSlides123456789/edit",
      type: "Google Slides"
    }
  ],
  links: [
    {
      id: "link-001",
      title: "Course Telegram Group",
      description: "Join our community for discussions and updates",
      url: "https://t.me/ai_diploma_course"
    },
    {
      id: "link-002",
      title: "Assignment Submission Form",
      description: "Submit your weekly assignments here",
      url: "https://forms.google.com/your-form-id"
    },
    {
      id: "link-003",
      title: "Office Hours Booking",
      description: "Schedule one-on-one sessions with instructors",
      url: "https://calendly.com/your-calendar"
    }
  ],
  notes: [
    {
      id: "note-001",
      title: "Welcome to AI Diploma Course",
      content: "Welcome to our comprehensive AI diploma program! Please check the materials section for your first assignment and join our Telegram group for updates.",
      date: "2024-01-01"
    },
    {
      id: "note-002",
      title: "Week 2 Assignment Reminder",
      content: "Don't forget to submit your machine learning assignment by Friday. The submission form is available in the Important Links section.",
      date: "2024-01-20"
    }
  ]
}
```

**To create this collection:**
1. Click "Start collection"
2. Collection ID: `content`
3. Document ID: `dashboard` (manually enter this)
4. Add fields as arrays:
   - `lectures` (array): Start with empty array `[]`
   - `materials` (array): Start with empty array `[]`
   - `links` (array): Start with empty array `[]`
   - `notes` (array): Start with empty array `[]`
5. Click "Save"

## 🔐 Security Rules Configuration

### Development Rules (Initial Setup)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access on all documents for development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Production Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to authorized emails (students can check if they're authorized)
    match /authorizedEmails/{document} {
      allow read: if true;
      allow write: if false; // Only admin can modify through admin panel
    }
    
    // Allow read access to dashboard content (students can view content)
    match /content/{document} {
      allow read: if true;
      allow write: if false; // Only admin can modify through admin panel
    }
    
    // Restrict admin collection (only server-side access)
    match /admin/{document} {
      allow read, write: if false; // Access only through admin panel logic
    }
  }
}
```

**To update security rules:**
1. Go to Firestore Database > Rules
2. Replace the existing rules with production rules above
3. Click "Publish"

## 🌐 Web App Configuration

### Step 1: Register Web App

1. **Go to Project Settings**
   - Click the gear icon in Firebase Console
   - Select "Project settings"

2. **Add Web App**
   - Scroll down to "Your apps" section
   - Click the web icon `</>`
   - Enter app nickname: `AI Diploma Portal`
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"

3. **Copy Configuration**
   - Copy the Firebase configuration object
   - It should look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyExample123456789",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Step 2: Update Environment Variables

Create or update your `.env` file:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyExample123456789
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 📊 Usage Monitoring

### Enable Analytics

1. **Performance Monitoring**
   - Go to Performance in Firebase Console
   - Click "Get started"
   - Follow setup instructions

2. **Usage Analytics**
   - Go to Analytics > Events
   - Monitor user interactions
   - Set up custom events if needed

### Set Up Billing Alerts

1. **Go to Usage and Billing**
   - Click on Usage tab
   - Set up budget alerts
   - Monitor Firestore reads/writes

2. **Recommended Limits**
   - Document reads: 50,000/day (free tier)
   - Document writes: 20,000/day (free tier)
   - Storage: 1 GB (free tier)

## 🔧 Testing Your Setup

### Test Firebase Connection

1. **Start Development Server**
   ```bash
   cd ai-diploma-platform
   pnpm run dev
   ```

2. **Check Browser Console**
   - Open browser developer tools
   - Look for Firebase connection messages
   - Verify no authentication errors

### Test Database Operations

1. **Add Test Student Email**
   - Go to admin panel (`/admin/login`)
   - Login with admin credentials
   - Add a test email address
   - Verify it appears in Firestore

2. **Test Student Login**
   - Go to main login page
   - Enter the test email
   - Verify successful login and dashboard access

## 🚨 Troubleshooting

### Common Issues

1. **"Firebase project not found"**
   - Verify project ID in environment variables
   - Check if project exists in Firebase Console
   - Ensure project is active (not deleted)

2. **"Permission denied" errors**
   - Check Firestore security rules
   - Verify collections exist with correct names
   - Ensure documents have proper structure

3. **"Invalid API key" errors**
   - Verify API key in environment variables
   - Check if API key is enabled for your domain
   - Regenerate API key if necessary

### Debug Steps

1. **Check Firebase Console**
   - Monitor Firestore usage
   - Check for error logs
   - Verify data structure

2. **Browser Developer Tools**
   - Check Network tab for failed requests
   - Look for console errors
   - Verify environment variables are loaded

## 🔄 Backup and Maintenance

### Regular Backups

1. **Export Firestore Data**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Export data
   firebase firestore:export gs://your-project.appspot.com/backups/$(date +%Y%m%d)
   ```

2. **Automated Backups**
   - Set up Cloud Functions for automatic backups
   - Schedule weekly exports
   - Store backups in Cloud Storage

### Monitoring

- Set up alerts for unusual usage patterns
- Monitor authentication failures
- Track database performance metrics
- Review security rule effectiveness

---

**Firebase setup complete! 🎉**

Your Firebase backend is now ready to power the AI Diploma Portal.

