import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem('user');
    const savedIsAdmin = localStorage.getItem('isAdmin');
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    if (savedIsAdmin) {
      setIsAdmin(JSON.parse(savedIsAdmin));
    }
    
    setLoading(false);
  }, []);

  const loginStudent = (email) => {
    const userData = { email, type: 'student' };
    setUser(userData);
    setIsAdmin(false);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAdmin', 'false');
  };

  const loginAdmin = (email) => {
    const userData = { email, type: 'admin' };
    setUser(userData);
    setIsAdmin(true);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAdmin', 'true');
  };

  const logout = () => {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('user');
    localStorage.removeItem('isAdmin');
  };

  const value = {
    user,
    isAdmin,
    loading,
    loginStudent,
    loginAdmin,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

