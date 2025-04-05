import React, { createContext, useState, useEffect } from 'react';
import { FcGoogle } from 'react-icons/fc';
import {
  checkGoogleAuth,
  fetchGoogleUserData,
  initiateGoogleAuth
} from './utils/GoogleAuthService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [googleAuth, setGoogleAuth] = useState({
    authenticated: false,
    email: '',
    loading: true
  });
  const [showPopup, setShowPopup] = useState(false);
  const [shouldCheckAuth, setShouldCheckAuth] = useState(false);

  const checkAuth = async () => {
    try {
      setGoogleAuth(prev => ({ ...prev, loading: true }));
      const authResult = await checkGoogleAuth();
      
      if (authResult.isGoogleAuthed) {
        const email = await fetchGoogleUserData();
        setGoogleAuth({
          authenticated: true,
          email: email || '',
          loading: false
        });
      } else {
        setGoogleAuth({
          authenticated: false,
          email: '',
          loading: false
        });
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setGoogleAuth({
        authenticated: false,
        email: '',
        loading: false
      });
    }
  };

  const handleGoogleSignIn = () => {
    initiateGoogleAuth();
  };

  // Initial check on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Check auth when triggered by login
  useEffect(() => {
    if (shouldCheckAuth) {
      checkAuth();
    }
  }, [shouldCheckAuth]);

  // Show popup 5 seconds after login if not Google-authenticated
  useEffect(() => {
    let timer;
    
    if (shouldCheckAuth && !googleAuth.loading && localStorage.getItem('token')) {
      timer = setTimeout(() => {
        if (!googleAuth.authenticated) {
          setShowPopup(true);
        }
      }, 5000); // 5 seconds after login
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [shouldCheckAuth, googleAuth.authenticated, googleAuth.loading]);

  return (
    <AuthContext.Provider
      value={{
        ...googleAuth,
        handleGoogleSignIn,
        checkAuth,
        showPopup,
        setShowPopup,
        setShouldCheckGoogleAuth: setShouldCheckAuth // Expose the setter
      }}
    >
      {children}
      
      {/* Global Google Sign-In Popup */}
      {showPopup && (
        <div className="google-signin-popup-overlay">
          <div className="google-signin-popup">
            <h3>Google Integration Required</h3>
            <p>
              To access calendar and meeting features, please connect your Google account.
            </p>
            <div className="popup-actions">
            <button 
                className="secondary-btn"
                onClick={() => {
                    setShowPopup(false);
                // Show again after 30 minutes (1800000ms)
                setTimeout(() => setShowPopup(true), 180000); //3 minutes
            }}
            >
                Maybe Later
                </button>
              <button 
                className="primary-btn google-btn"
                onClick={handleGoogleSignIn}
              >
                <FcGoogle /> Connect Google Account
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};