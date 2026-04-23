import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authenticateAdmin } from '../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, ArrowLeft, Lock, Hexagon, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginAdmin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      const isAuthenticated = await authenticateAdmin(email, password);
      if (isAuthenticated) {
        loginAdmin(email);
      } else {
        setError('Invalid credentials. Access denied.');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-[#050505] font-['Inter'] selection:bg-rose-500/30">
      
      {/* Left Panel - Branding & Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden p-12 border-r border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-rose-900/20 via-[#050505] to-[#050505]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

        {/* Content Top */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Hexagon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Infinity X EdTech</span>
          </div>
          <a href="/" className="flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Student Portal
          </a>
        </div>

        {/* Content Middle */}
        <div className="relative z-10 max-w-lg">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold mb-6">
              <Shield className="w-4 h-4" />
              Restricted Access
            </div>
            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-6">
              Platform Command Center
            </h1>
            <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8">
              Manage diplomas, orchestrate learning modules, and oversee student progress from a unified professional dashboard.
            </p>
          </motion.div>
        </div>

        {/* Content Bottom */}
        <div className="relative z-10">
          <p className="text-slate-500 text-sm font-medium">© 2026 Infinity X EdTech Platform. Authorized Personnel Only.</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-[#0a0a0b]">
        {/* Mobile Background */}
        <div className="absolute inset-0 lg:hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] bg-rose-600/10 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Mobile Header */}
          <div className="flex lg:hidden items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                <Hexagon className="w-6 h-6 text-white" />
              </div>
            </div>
            <a href="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Student Login
            </a>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-2">
              <Terminal className="w-8 h-8 text-rose-500" />
              Admin Portal
            </h2>
            <p className="text-slate-400">Enter your administrator credentials to securely access the platform.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-slate-300 ml-1">
                Admin Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@infinityx.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-[#121214] border-white/10 text-white placeholder:text-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl transition-all"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-slate-300 ml-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-[#121214] border-white/10 text-white placeholder:text-slate-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl transition-all"
                disabled={loading}
              />
            </div>

            {error && (
              <Alert className="bg-red-500/10 border-red-500/20 text-red-400 rounded-xl">
                <Shield className="w-4 h-4 mr-2" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-12 mt-4 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" /> Authenticate
                </>
              )}
            </Button>
          </form>

          <div className="mt-12 text-center">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
              <Shield className="w-4 h-4" /> Secure Administrative Access
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;
