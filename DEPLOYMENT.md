# Deployment Guide - AI Diploma Portal

This guide provides step-by-step instructions for deploying the AI Diploma Portal to Netlify.

## 🚀 Quick Deployment Checklist

- [ ] Firebase project created and configured
- [ ] Environment variables set up
- [ ] Firestore database initialized with required collections
- [ ] Admin credentials added to Firestore
- [ ] Project built successfully (`pnpm run build`)
- [ ] Netlify account ready
- [ ] Domain configured (optional)

## 📋 Pre-Deployment Setup

### 1. Firebase Project Setup

1. **Create Firebase Project**
   ```
   1. Go to https://console.firebase.google.com/
   2. Click "Create a project"
   3. Enter project name (e.g., "ai-diploma-portal")
   4. Enable Google Analytics (optional)
   5. Click "Create project"
   ```

2. **Enable Firestore Database**
   ```
   1. In Firebase Console, go to "Firestore Database"
   2. Click "Create database"
   3. Choose "Start in test mode" (configure security rules later)
   4. Select a location close to your users
   5. Click "Done"
   ```

3. **Get Firebase Configuration**
   ```
   1. Go to Project Settings (gear icon)
   2. Scroll down to "Your apps"
   3. Click "Web" icon to add a web app
   4. Register app with nickname
   5. Copy the configuration object
   ```

### 2. Environment Variables Setup

Create a `.env` file in your project root:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyExample123456789
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Google Drive API (Optional)
REACT_APP_GOOGLE_DRIVE_API_KEY=AIzaSyDriveExample123456789
REACT_APP_LECTURES_FOLDER_ID=1BvExample123456789
REACT_APP_MATERIALS_FOLDER_ID=1BvExample987654321
REACT_APP_RESOURCES_FOLDER_ID=1BvExample456789123
```

### 3. Firestore Database Initialization

Run these commands in the Firestore Console or use the Firebase Admin SDK:

#### Create Admin Credentials
```javascript
// Collection: admin
// Document ID: credentials
{
  email: "admin@yourcompany.com",
  password: "your-secure-admin-password"
}
```

#### Add Sample Authorized Email
```javascript
// Collection: authorizedEmails
// Auto-generated Document ID
{
  email: "student@example.com"
}
```

#### Initialize Dashboard Content
```javascript
// Collection: content
// Document ID: dashboard
{
  lectures: [],
  materials: [],
  links: [],
  notes: []
}
```

## 🏗️ Build Process

### 1. Install Dependencies
```bash
cd ai-diploma-platform
pnpm install
```

### 2. Test Build Locally
```bash
# Create production build
pnpm run build

# Test the build locally (optional)
pnpm run preview
```

### 3. Verify Build Output
```bash
# Check that dist folder is created
ls -la dist/

# Verify main files exist
ls -la dist/assets/
```

## 🌐 Netlify Deployment

### Method 1: Drag & Drop (Quickest)

1. **Build the Project**
   ```bash
   pnpm run build
   ```

2. **Deploy to Netlify**
   ```
   1. Go to https://app.netlify.com/
   2. Sign up or log in
   3. Drag the `dist` folder to the deploy area
   4. Wait for deployment to complete
   5. Note the generated URL
   ```

3. **Configure Environment Variables**
   ```
   1. Go to Site Settings > Environment Variables
   2. Add all variables from your .env file
   3. Click "Save"
   4. Trigger a new deploy
   ```

### Method 2: Git Integration (Recommended)

1. **Push to Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/ai-diploma-portal.git
   git push -u origin main
   ```

2. **Connect to Netlify**
   ```
   1. In Netlify dashboard, click "New site from Git"
   2. Choose your Git provider (GitHub, GitLab, etc.)
   3. Select your repository
   4. Configure build settings:
      - Build command: `pnpm run build`
      - Publish directory: `dist`
   5. Click "Deploy site"
   ```

3. **Add Environment Variables**
   ```
   1. Go to Site Settings > Environment Variables
   2. Add all your environment variables
   3. Redeploy the site
   ```

### Method 3: Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login and Deploy**
   ```bash
   # Login to Netlify
   netlify login

   # Build the project
   pnpm run build

   # Deploy to production
   netlify deploy --prod --dir=dist
   ```

## 🔧 Post-Deployment Configuration

### 1. Custom Domain (Optional)

```
1. In Netlify dashboard, go to Domain Settings
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS configuration instructions
5. Enable HTTPS (automatic with Netlify)
```

### 2. Redirects Configuration

Create `public/_redirects` file for SPA routing:
```
/*    /index.html   200
```

### 3. Security Headers

Create `public/_headers` file:
```
/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

## 🔒 Security Configuration

### 1. Firebase Security Rules

Update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to authorized emails
    match /authorizedEmails/{document} {
      allow read: if true;
      allow write: if false; // Only admin can modify
    }
    
    // Allow read access to dashboard content
    match /content/{document} {
      allow read: if true;
      allow write: if false; // Only admin can modify
    }
    
    // Restrict admin access
    match /admin/{document} {
      allow read, write: if false; // Only server-side access
    }
  }
}
```

### 2. Environment Variables Security

- Never commit `.env` files to version control
- Use different Firebase projects for development and production
- Regularly rotate API keys and passwords
- Monitor Firebase usage and set up billing alerts

## 📊 Monitoring & Analytics

### 1. Netlify Analytics

```
1. Go to Site Settings > Analytics
2. Enable Netlify Analytics
3. Monitor traffic and performance
```

### 2. Firebase Monitoring

```
1. In Firebase Console, go to Performance
2. Enable Performance Monitoring
3. Monitor app performance and errors
```

### 3. Error Tracking

Add error tracking to your app:

```javascript
// In your main App component
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to your error tracking service
});
```

## 🚨 Troubleshooting Deployment Issues

### Common Build Errors

1. **"Module not found" errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules
   pnpm install
   ```

2. **Environment variables not working**
   ```
   - Ensure variables start with REACT_APP_
   - Check spelling and case sensitivity
   - Verify variables are set in Netlify dashboard
   ```

3. **Firebase connection issues**
   ```
   - Verify Firebase configuration
   - Check Firestore security rules
   - Ensure Firebase project is active
   ```

### Runtime Errors

1. **Blank page after deployment**
   ```
   - Check browser console for errors
   - Verify all environment variables are set
   - Check Firebase configuration
   ```

2. **Authentication not working**
   ```
   - Verify admin credentials in Firestore
   - Check authorized emails collection
   - Ensure proper security rules
   ```

## 📈 Performance Optimization

### 1. Build Optimization

```bash
# Analyze bundle size
pnpm run build
npx vite-bundle-analyzer dist
```

### 2. Netlify Optimization

```
1. Enable asset optimization in Netlify
2. Configure caching headers
3. Use Netlify's CDN for static assets
```

### 3. Firebase Optimization

```
1. Use Firestore indexes for queries
2. Implement pagination for large datasets
3. Cache frequently accessed data
```

## 🔄 Continuous Deployment

### Automatic Deployments

```
1. Connect Git repository to Netlify
2. Enable automatic deployments on push
3. Set up branch-specific deployments
4. Configure build notifications
```

### Deploy Previews

```
1. Enable deploy previews for pull requests
2. Test changes before merging
3. Share preview links with stakeholders
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks

- [ ] Update dependencies monthly
- [ ] Monitor Firebase usage and costs
- [ ] Review and update security rules
- [ ] Backup Firestore data regularly
- [ ] Monitor site performance and uptime

### Getting Help

1. Check Netlify documentation: https://docs.netlify.com/
2. Firebase documentation: https://firebase.google.com/docs
3. React documentation: https://react.dev/
4. Community forums and Stack Overflow

---

**Deployment completed successfully! 🎉**

Your AI Diploma Portal is now live and ready to serve students and administrators.

