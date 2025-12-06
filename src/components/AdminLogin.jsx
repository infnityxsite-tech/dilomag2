import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authenticateAdmin } from '../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, ArrowLeft, Lock } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.1),transparent_50%)]"></div>
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Back to Student Login */}
        <div className="mb-6">
          <a
            href="/"
            className="inline-flex items-center text-red-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Student Login
          </a>
        </div>

        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl mb-4 shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Admin Portal
          </h1>
          <p className="text-red-200">
            Administrative Access Only
          </p>
        </div>

        {/* Login Card */}
        <Card className="backdrop-blur-sm bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
              <Lock className="w-6 h-6" />
              Secure Access
            </CardTitle>
            <CardDescription className="text-red-200">
              Enter your administrator credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-white">
                  Admin Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@infinityx.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-red-200 focus:border-red-400 focus:ring-red-400"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-white">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-red-200 focus:border-red-400 focus:ring-red-400"
                  disabled={loading}
                />
              </div>

              {error && (
                <Alert className="bg-red-500/10 border-red-500/20 text-red-200">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Access Admin Panel'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center mt-8 text-red-200 text-sm">
          <p className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Secure administrative access
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

