import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loginStudent as authenticateStudent } from '../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, GraduationCap, Brain, Sparkles } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginStudent } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl mb-4 shadow-2xl">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            AI Diploma Portal
          </h1>
          <p className="text-purple-200 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Powered by InfinityX
            <Sparkles className="w-4 h-4" />
          </p>
        </div>

        {/* Login Card */}
        <Card className="backdrop-blur-sm bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
              <GraduationCap className="w-6 h-6" />
              Welcome Back
            </CardTitle>
            <CardDescription className="text-purple-200">
              Enter your email and password to access your learning dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-white">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-white">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  disabled={loading}
                  required
                />
              </div>

              {error && (
                <Alert className="bg-red-500/10 border-red-500/20 text-red-200">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying Access...
                  </>
                ) : (
                  'Access Dashboard'
                )}
              </Button>
            </form>

            {/* Admin Link */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-center text-sm text-purple-200">
                Administrator?{' '}
                <a
                  href="/admin/login"
                  className="text-purple-300 hover:text-white font-medium transition-colors"
                >
                  Sign in here
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-purple-200 text-sm">
          <p>© 2024 InfinityX. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

