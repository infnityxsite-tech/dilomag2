import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
  
  // Multi-diploma state
  const [classIds, setClassIds] = useState([]);
  const [activeDiplomaId, setActiveDiplomaId] = useState(null);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem('user');
    const savedIsAdmin = localStorage.getItem('isAdmin');
    const savedClassIds = localStorage.getItem('classIds');
    const savedActiveDiploma = localStorage.getItem('activeDiplomaId');
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    if (savedIsAdmin) {
      setIsAdmin(JSON.parse(savedIsAdmin));
    }

    if (savedClassIds) {
      try {
        setClassIds(JSON.parse(savedClassIds));
      } catch (e) {
        setClassIds([]);
      }
    }

    if (savedActiveDiploma) {
      setActiveDiplomaId(savedActiveDiploma);
    }
    
    setLoading(false);
  }, []);

  /**
   * Fetch classIds for a student email from Firestore
   */
  const fetchStudentClasses = async (email) => {
    try {
      const authorizedEmailsRef = collection(db, 'authorizedEmails');
      const snapshot = await getDocs(authorizedEmailsRef);
      
      let studentClassIds = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.email.toLowerCase() === email.toLowerCase() && data.classIds) {
          studentClassIds = data.classIds;
        }
      });
      
      return studentClassIds;
    } catch (error) {
      console.error('Error fetching student classes:', error);
      return [];
    }
  };

  const loginStudent = async (email) => {
    const userData = { email, type: 'student' };
    setUser(userData);
    setIsAdmin(false);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAdmin', 'false');

    // Fetch and set class IDs
    const fetchedClassIds = await fetchStudentClasses(email);
    setClassIds(fetchedClassIds);
    localStorage.setItem('classIds', JSON.stringify(fetchedClassIds));

    // Set active diploma automatically ONLY if student has exactly ONE class
    if (fetchedClassIds.length === 1) {
      setActiveDiplomaId(fetchedClassIds[0]);
      localStorage.setItem('activeDiplomaId', fetchedClassIds[0]);
    } else {
      setActiveDiplomaId(null);
      localStorage.removeItem('activeDiplomaId');
    }
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
    setClassIds([]);
    setActiveDiplomaId(null);
    localStorage.removeItem('user');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('classIds');
    localStorage.removeItem('activeDiplomaId');
  };

  const switchDiploma = (diplomaId) => {
    setActiveDiplomaId(diplomaId);
    localStorage.setItem('activeDiplomaId', diplomaId);
  };

  const value = {
    user,
    isAdmin,
    loading,
    loginStudent,
    loginAdmin,
    logout,
    // Multi-diploma
    classIds,
    activeDiplomaId,
    switchDiploma,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
