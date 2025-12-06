# AI Diploma Portal - Educational Platform

A professional educational platform built for AI diploma courses with comprehensive student and admin management features.

## 🚀 Features

### Student Portal
- **Email-based Authentication**: Simple login with pre-authorized email addresses
- **Interactive Dashboard**: Clean, modern interface with multiple content sections
- **Video Lectures**: Embedded video content from Google Drive or other sources
- **Study Materials**: PDF downloads and document access
- **Important Links**: Quick access to Telegram groups, forms, and resources
- **Instructor Notes**: Real-time updates and announcements from instructors

### Admin Panel
- **Student Management**: Add/remove authorized student email addresses
- **Content Management**: Full CRUD operations for lectures, materials, links, and notes
- **Google Drive Integration**: Sync content directly from Google Drive folders
- **Real-time Updates**: Changes reflect immediately on student dashboards
- **Secure Access**: Separate admin authentication with enhanced security

### Technical Features
- **Responsive Design**: Mobile-first approach with cross-device compatibility
- **Modern UI/UX**: Professional styling with smooth animations and transitions
- **Firebase Integration**: Real-time database with Firestore
- **Google Drive API**: Dynamic content fetching and embedding
- **Netlify Ready**: Optimized for easy deployment

## 🛠️ Technology Stack

- **Frontend**: React 19.1.0 with Vite
- **Styling**: TailwindCSS with shadcn/ui components
- **Icons**: Lucide React
- **Backend**: Firebase (Firestore, Authentication)
- **Storage**: Google Drive API integration
- **Deployment**: Netlify-optimized build

## 📋 Prerequisites

Before setting up the project, ensure you have:

1. **Node.js** (v18 or higher)
2. **pnpm** package manager
3. **Firebase Project** with Firestore enabled
4. **Google Drive API** credentials (optional, for Drive integration)
5. **Netlify Account** (for deployment)

## 🔧 Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-diploma-platform

# Install dependencies
pnpm install
```

### 2. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Get your Firebase configuration from Project Settings
4. Update the `.env` file with your Firebase credentials:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 3. Firestore Database Setup

Create the following collections in your Firestore database:

#### Collection: `authorizedEmails`
```javascript
// Document structure
{
  email: "student@example.com"
}
```

#### Collection: `admin`
```javascript
// Document ID: "credentials"
{
  email: "admin@yourcompany.com",
  password: "your-secure-password"
}
```

#### Collection: `content`
```javascript
// Document ID: "dashboard"
{
  lectures: [
    {
      id: "unique-id",
      title: "Introduction to AI",
      description: "Basic concepts and overview",
      url: "https://drive.google.com/file/d/your-file-id/preview",
      duration: "45 min",
      date: "2024-01-15"
    }
  ],
  materials: [
    {
      id: "unique-id",
      title: "AI Fundamentals PDF",
      description: "Comprehensive study guide",
      url: "https://drive.google.com/file/d/your-file-id/view",
      type: "PDF"
    }
  ],
  links: [
    {
      id: "unique-id",
      title: "Course Telegram Group",
      description: "Join for discussions and updates",
      url: "https://t.me/your-group"
    }
  ],
  notes: [
    {
      id: "unique-id",
      title: "Welcome Note",
      content: "Welcome to the AI Diploma course!",
      date: "2024-01-01"
    }
  ]
}
```

### 4. Google Drive Integration (Optional)

1. Create a Google Cloud Project
2. Enable the Google Drive API
3. Create an API key
4. Add the API key to your `.env` file:

```env
# Google Drive API Configuration
REACT_APP_GOOGLE_DRIVE_API_KEY=your-drive-api-key
REACT_APP_LECTURES_FOLDER_ID=your-lectures-folder-id
REACT_APP_MATERIALS_FOLDER_ID=your-materials-folder-id
REACT_APP_RESOURCES_FOLDER_ID=your-resources-folder-id
```

### 5. Development Server

```bash
# Start the development server
pnpm run dev

# The application will be available at http://localhost:5173
```

## 🚀 Deployment to Netlify

### 1. Build the Project

```bash
# Create production build
pnpm run build
```

### 2. Deploy to Netlify

#### Option A: Drag & Drop
1. Go to [Netlify](https://netlify.com)
2. Drag the `dist` folder to the deploy area

#### Option B: Git Integration
1. Push your code to GitHub/GitLab
2. Connect your repository to Netlify
3. Set build command: `pnpm run build`
4. Set publish directory: `dist`

#### Option C: Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

### 3. Environment Variables on Netlify

In your Netlify dashboard, go to Site Settings > Environment Variables and add all your environment variables from the `.env` file.

## 📱 Usage Guide

### For Students

1. **Login**: Visit the platform and enter your authorized email address
2. **Dashboard**: Access lectures, materials, links, and instructor notes
3. **Watch Lectures**: Click on any lecture to view embedded videos
4. **Download Materials**: Access PDFs and study materials
5. **Stay Updated**: Check instructor notes for announcements

### For Administrators

1. **Admin Login**: Go to `/admin/login` and enter admin credentials
2. **Manage Students**: Add or remove authorized email addresses
3. **Content Management**: Add lectures, materials, links, and notes
4. **Google Drive Sync**: Connect Drive folders for automatic content updates
5. **Real-time Updates**: All changes reflect immediately on student dashboards

## 🔒 Security Features

- **Email-based Authorization**: Only pre-approved emails can access student content
- **Admin Authentication**: Separate secure login for administrators
- **Firebase Security Rules**: Database-level security (configure as needed)
- **Environment Variables**: Sensitive data stored securely
- **HTTPS Deployment**: Secure connections on Netlify

## 🎨 Customization

### Branding
- Update logo and branding in `LoginPage.jsx` and `AdminLogin.jsx`
- Modify colors in `App.css` CSS variables
- Change company name from "InfinityX" throughout the codebase

### Styling
- All styles use TailwindCSS classes
- Custom animations and components in `App.css`
- Responsive design breakpoints configured for mobile-first approach

### Features
- Add new content types by extending the database schema
- Implement additional authentication methods
- Add more Google Drive integration features

## 🐛 Troubleshooting

### Common Issues

1. **Blank Page on Load**
   - Check Firebase configuration in `.env`
   - Verify Firestore database setup
   - Check browser console for errors

2. **Authentication Not Working**
   - Verify admin credentials in Firestore
   - Check authorized emails collection
   - Ensure Firebase project is properly configured

3. **Google Drive Integration Issues**
   - Verify API key is correct
   - Check folder IDs are valid
   - Ensure folders are publicly accessible

4. **Build Errors**
   - Run `pnpm install` to ensure all dependencies are installed
   - Check for syntax errors in components
   - Verify environment variables are set

### Development Tips

- Use browser developer tools to debug issues
- Check the Network tab for API call failures
- Monitor Firestore usage in Firebase Console
- Test on multiple devices and browsers

## 📞 Support

For technical support or questions:

1. Check the troubleshooting section above
2. Review Firebase and Google Drive API documentation
3. Check browser console for error messages
4. Verify all environment variables are correctly set

## 📄 License

This project is created for educational purposes. Modify and use according to your needs.

---

**Built with ❤️ for AI Education**

