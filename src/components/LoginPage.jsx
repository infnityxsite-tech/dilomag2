import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loginStudent as authenticateStudent, loginWithGoogle } from '../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Hexagon, Sparkles, UserCheck, Shield, ChevronRight, Zap, Target, Award, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingAuth, setPendingAuth] = useState(false);
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
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 blur-[120px] rounded-full" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-[#0f172a]/60 backdrop-blur-2xl border border-white/10 p-10 rounded-[2rem] shadow-2xl relative z-10 text-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
            className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20 mb-8 relative"
          >
            <div className="absolute inset-0 bg-white/20 rounded-3xl animate-pulse"></div>
            <UserCheck className="w-12 h-12 text-white relative z-10" />
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Authorization Pending</h2>
          <p className="text-slate-400 text-base mb-10 leading-relaxed">
            Your account is securely verified and currently awaiting administrator approval. Once approved, you will automatically be assigned to your curriculum.
          </p>
          <Button 
            variant="outline" 
            className="w-full h-14 rounded-xl bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white transition-all duration-300 font-semibold" 
            onClick={() => setPendingAuth(false)}
          >
            Return to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#030712] font-sans selection:bg-indigo-500/30">
      
      {/* LEFT PANEL - Brand & Visuals */}
      <div className="hidden md:flex md:w-[55%] relative flex-col justify-between overflow-hidden bg-[#0a0f1c]">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-indigo-600/20 blur-[140px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[0%] right-[0%] w-[60%] h-[60%] bg-violet-600/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute top-[40%] left-[20%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full mix-blend-screen" />
          
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDQwTTEwIDB2NDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-50" />
        </div>

        {/* Content Top: Logo */}
        <div className="relative z-20 p-8 md:p-12 md:px-16 md:pt-16">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-white/10 backdrop-blur-md">
              <Hexagon className="w-7 h-7 text-white fill-white/20" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Infinity X EdTech</span>
          </motion.div>
        </div>

        {/* Content Middle: Value Proposition */}
        <div className="relative z-20 p-8 md:p-12 md:px-16 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold mb-8 backdrop-blur-md">
              <Sparkles className="w-4 h-4" />
              <span>The Future of Learning</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-400 leading-[1.1] tracking-tight mb-8">
              Accelerate your<br/>career with AI.
            </h1>
            
            <p className="text-lg text-slate-400 font-medium leading-relaxed mb-12 max-w-xl">
              Join the elite ecosystem designed for professional mastery. Gain access to dynamic curriculums, real-world labs, and progress tracking built for modern pioneers.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Dynamic Sprints</h4>
                  <p className="text-sm text-slate-500">Adaptive paced learning modules.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Precision Grading</h4>
                  <p className="text-sm text-slate-500">Granular performance analytics.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content Bottom: Footer */}
        <div className="relative z-20 p-8 md:p-12 md:px-16 md:pb-16 flex items-center justify-between">
          <p className="text-slate-500 text-sm font-medium">© 2026 Infinity X EdTech Platform.</p>
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <Award className="w-4 h-4 text-amber-500" /> Premium Education
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Authentication Form */}
      <div className="w-full md:w-[45%] flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-[#030712] border-l border-white/5">
        
        {/* Mobile background elements */}
        <div className="absolute inset-0 md:hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-full bg-[#030712]" />
          <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-[440px] relative z-10"
        >
          {/* Mobile Logo */}
          <div className="flex md:hidden items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Hexagon className="w-6 h-6 text-white fill-white/20" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Infinity X EdTech</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-3">Sign in to platform</h2>
            <p className="text-slate-400 text-base">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-[#0f172a] border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all pl-4 text-base"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-[#0f172a] border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all pl-4 text-base"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex items-center">
                    <Shield className="w-5 h-5 mr-3 shrink-0" />
                    <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              className="w-full h-14 bg-white hover:bg-slate-100 text-slate-900 font-bold text-base rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <span className="flex items-center justify-center">
                  Sign In 
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#030712] px-4 text-slate-500 font-semibold tracking-wider">Or continue with</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleLogin}
            type="button"
            variant="outline"
            className="w-full h-14 bg-[#0f172a] border border-white/10 text-white hover:bg-[#1e293b] hover:text-white font-semibold text-base rounded-xl transition-all"
            disabled={loading}
          >
            <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </Button>

          <div className="mt-12 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Administrator Access?{' '}
              <a href="/admin/login" className="text-indigo-400 hover:text-indigo-300 hover:underline underline-offset-4 transition-all">
                Sign in here
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
