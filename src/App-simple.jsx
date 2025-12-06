import React from 'react';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl mb-4 shadow-2xl">
            <div className="w-10 h-10 text-white">🧠</div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            AI Diploma Portal
          </h1>
          <p className="text-purple-200">
            Powered by InfinityX
          </p>
        </div>
        
        <div className="backdrop-blur-sm bg-white/10 border-white/20 shadow-2xl rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl text-white mb-4">Welcome Back</h2>
            <p className="text-purple-200 mb-6">
              Enter your email to access your learning dashboard
            </p>
            
            <div className="space-y-4">
              <input
                type="email"
                placeholder="student@example.com"
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-purple-200 px-4 py-3 rounded-lg"
              />
              
              <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200">
                Access Dashboard
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-center text-sm text-purple-200">
                Administrator?{' '}
                <a href="#" className="text-purple-300 hover:text-white font-medium transition-colors">
                  Sign in here
                </a>
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8 text-purple-200 text-sm">
          <p>© 2024 InfinityX. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default App;

