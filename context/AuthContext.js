import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      setLoading(true);
      console.log('AuthContext: Loading user data...');
      const userData = await authService.getCurrentUser();
      console.log('AuthContext: User data loaded:', userData ? 'Found' : 'None');
      if (userData) {
        console.log('AuthContext: User profile state:', { 
          id: userData.$id, 
          needsProfile: userData.needsProfile,
          type: userData.type 
        });
      }
      setUser(userData);
    } catch (error) {
      console.error('AuthContext: Auth check failed:', error.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  const login = async (email, password) => {
    try {
      await authService.login(email, password);
      await loadUserData();
    } catch (error) {
      throw error;
    }
  };

  const register = async (email, password, fullName, role, skills = []) => {
    try {
      await authService.register(email, password, fullName, role, skills);
      await loadUserData();
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  const forgotPassword = async (email) => {
    try {
      await authService.forgotPassword(email);
    } catch (error) {
      throw error;
    }
  };

  const completePasswordReset = async (userId, secret, password, passwordAgain) => {
    try {
      await authService.completePasswordReset(userId, secret, password, passwordAgain);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      forgotPassword, 
      completePasswordReset,
      refreshUserData: loadUserData 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
