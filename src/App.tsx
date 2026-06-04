/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import DoctorDashboard from './components/DoctorDashboard';
import ReceptionistDashboard from './components/ReceptionistDashboard';
import PatientDashboard from './components/PatientDashboard';
import Toast from './components/Toast';
import { SafeUser } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auth screen selector ('landing' or 'login')
  const [currentAuthScreen, setCurrentAuthScreen] = useState<'landing' | 'login'>('landing');

  // Layout states
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as any) || 'light';
  });

  // Global floating alerts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Synchronize layout orientations & theme classes on mount and updates
  useEffect(() => {
    // Language orientation
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  useEffect(() => {
    // Theme alignment
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Synchronize active session on reload
  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const resp = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (resp.ok) {
          const profile: SafeUser = await resp.json();
          setUser(profile);
        } else {
          // Token expired or invalid
          sessionStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Session matching error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    verifySession();
  }, [token]);

  const handleLoginSuccess = (newToken: string, authenticatedUser: SafeUser) => {
    sessionStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCurrentAuthScreen('landing');
    showToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح وتأمين قنوات الاتصال' : 'Logged out and connection secured', 'success');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 text-slate-500 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-extrabold tracking-widest animate-pulse font-mono uppercase text-emerald-600">
            HAKIM SECURE SYSTEM LOADING...
          </p>
        </div>
      </div>
    );
  }

  // Router View dispatcher
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
         {!user || !token ? (
          currentAuthScreen === 'landing' ? (
            <LandingPage
              onLoginSuccess={handleLoginSuccess}
              onGoToLogin={() => setCurrentAuthScreen('login')}
              lang={lang}
              setLang={setLang}
              theme={theme}
              setTheme={setTheme}
              onShowToast={showToast}
            />
          ) : (
            <div className="relative">
              {/* Floating Back to Home button */}
              <div className="absolute top-4 left-4 z-50">
                <button
                  type="button"
                  onClick={() => setCurrentAuthScreen('landing')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 transition text-xs font-semibold cursor-pointer"
                >
                  <span className="text-emerald-600 font-bold">←</span>
                  <span>{lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
                </button>
              </div>
              <Login
                onLoginSuccess={handleLoginSuccess}
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                onShowToast={showToast}
              />
            </div>
          )
        ) : (
          <>
            {user.role === 'doctor' && (
              <DoctorDashboard
                user={user}
                token={token}
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                onLogout={handleLogout}
                onShowToast={showToast}
              />
            )}

            {user.role === 'receptionist' && (
              <ReceptionistDashboard
                user={user}
                token={token}
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                onLogout={handleLogout}
                onShowToast={showToast}
              />
            )}

            {user.role === 'patient' && (
              <PatientDashboard
                user={user}
                token={token}
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                onLogout={handleLogout}
                onShowToast={showToast}
              />
            )}
          </>
        )}

        {/* Global Floating alerts popup */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
}
