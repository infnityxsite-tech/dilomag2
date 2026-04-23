import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loginStudent as authenticateStudent, loginWithGoogle } from '../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Hexagon, Shield, UserCheck, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import loginHeroImg from '../assets/login_hero.png';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingAuth, setPendingAuth] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { loginStudent } = useAuth();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const result = await loginWithGoogle();
    
    if (result.success) {
      if (result.status === 'authorized') {
        loginStudent(result.email);
      } else if (result.status === 'pending') {
        setPendingAuth(true);
      }
    } else {
      setError(result.error || 'Google Sign-In failed');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    if (!password) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    try {
      const isAuthenticated = await authenticateStudent(email, password);
      if (isAuthenticated) {
        loginStudent(email);
      } else {
        setError('Access denied. Invalid email or password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  if (pendingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-['Inter'] selection:bg-indigo-500/30">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 blur-[120px] rounded-full" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-[#121214]/80 backdrop-blur-3xl border border-white/10 p-10 rounded-3xl shadow-2xl relative z-10 text-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
            className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 mb-8 relative"
          >
            <div className="absolute inset-0 bg-white/20 rounded-3xl animate-pulse"></div>
            <UserCheck className="w-10 h-10 text-white relative z-10" />
          </motion.div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-4">Authorization Pending</h2>
          <p className="text-slate-400 text-base mb-10 leading-relaxed font-medium">
            Your account is securely verified and currently awaiting administrator approval. Once approved, you will automatically be assigned to your curriculum workspace.
          </p>
          <Button 
            variant="outline" 
            className="w-full h-14 rounded-xl bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-all duration-300 font-bold" 
            onClick={() => setPendingAuth(false)}
          >
            Return to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="login-split-screen">
      
      {/* LEFT PANEL - Authentication Form (Freelancer style) */}
      <div className="login-form-panel">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="login-form-container"
        >
          {/* Logo & Brand */}
          <div className="login-brand">
            <div className="login-brand-icon">
              <Hexagon className="w-6 h-6 text-white" />
            </div>
            <span className="login-brand-name">Infinity X</span>
          </div>

          {/* Welcome Text */}
          <div className="login-welcome">
            <h1 className="login-welcome-title">Welcome back</h1>
          </div>

          {/* Social Login Buttons */}
          <div className="login-social-buttons">
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="login-social-btn"
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>

          {/* OR Divider */}
          <div className="login-divider">
            <div className="login-divider-line"></div>
            <span className="login-divider-text">OR</span>
            <div className="login-divider-line"></div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email" className="login-label">Email or Username</label>
              <Input
                id="login-email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                disabled={loading}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password" className="login-label">Password</label>
              <div className="login-password-wrapper">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input login-input-password"
                  disabled={loading}
                  required
                />
                <button 
                  type="button" 
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="login-options">
              <label className="login-remember">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="login-checkbox"
                />
                <span>Remember me</span>
              </label>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert className="login-error-alert">
                    <Shield className="w-4 h-4 mr-2 shrink-0" />
                    <AlertDescription className="text-sm font-semibold">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Log in'
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="login-signup-row">
            <span>Don't have an account?</span>
            <a href="#" className="login-signup-link">Sign up</a>
          </div>

          {/* Admin Portal Link */}
          <div className="login-admin-link">
            <Shield className="w-4 h-4 text-slate-500" />
            <span>Admin?</span>
            <a href="/admin/login">Access Portal</a>
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL - Hero Image */}
      <div className="login-hero-panel">
        <img 
          src={loginHeroImg} 
          alt="Infinity X - Make it real" 
          className="login-hero-image"
        />
        <div className="login-hero-overlay">
          <p className="login-hero-tagline">make it real.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
