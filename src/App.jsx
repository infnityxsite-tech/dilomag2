import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import StudentDashboard from './components/StudentDashboard';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import MyEvaluationsPage from './components/MyEvaluationsPage';
import SubmitProjectPage from './components/SubmitProjectPage'; // New import
import FeedbackPage from './components/FeedbackPage';
import './App.css';

// Protected Route Component for Students
const ProtectedStudentRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  return user && !isAdmin ? children : <Navigate to="/" />;
};

// Protected Route Component for Admin
const ProtectedAdminRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  return user && isAdmin ? children : <Navigate to="/admin/login" />;
};

// Main App Routes
const AppRoutes = () => {
  const { user, isAdmin } = useAuth();

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          user && !isAdmin ? <Navigate to="/dashboard" /> : 
          user && isAdmin ? <Navigate to="/admin" /> : 
          <LoginPage />
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedStudentRoute>
            <StudentDashboard />
          </ProtectedStudentRoute>
        } 
      />
      <Route 
        path="/my-evaluation" 
        element={
          <ProtectedStudentRoute>
            <MyEvaluationsPage />
          </ProtectedStudentRoute>
        } 
      />
      {/* --- ADDED NEW ROUTE --- */}
      <Route 
        path="/submit-project" 
        element={
          <ProtectedStudentRoute>
            <SubmitProjectPage />
          </ProtectedStudentRoute>
        } 
      />
      {/* -------------------- */}
      <Route 
        path="/admin/login" 
        element={
          user && isAdmin ? <Navigate to="/admin" /> : <AdminLogin />
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedAdminRoute>
            <AdminPanel />
          </ProtectedAdminRoute>
        } 
      />
      <Route 
        path="/feedback" 
        element={
          <ProtectedStudentRoute>
            <FeedbackPage />
          </ProtectedStudentRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" />} />
      
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;