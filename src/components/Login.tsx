/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TRANSLATIONS } from '../translations';
import { Lock, User, ShieldAlert, KeyRound, Globe, Sun, Moon, Languages } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
  lang: 'ar' | 'en';
  setLang: (l: 'ar' | 'en') => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export default function Login({
  onLoginSuccess,
  lang,
  setLang,
  theme,
  setTheme,
  onShowToast
}: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAUserId, setTwoFAUserId] = useState('');
  const [twoFACorrectSecret, setTwoFACorrectSecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [showStaffPresets, setShowStaffPresets] = useState(false);

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      onShowToast(lang === 'ar' ? 'الرجاء إدخال اسم المستخدم وكلمة المرور' : 'Please input username and password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await resp.json();
      setIsLoading(false);

      if (!resp.ok) {
        onShowToast(data.error || t.errorToast, 'error');
        return;
      }

      if (data.requires2FA) {
        setRequires2FA(true);
        setTwoFAUserId(data.userId);
        setTwoFACorrectSecret(data.twoFASecret);
        onShowToast(
          lang === 'ar'
            ? 'المصادقة الثنائية مطلوبة للحساب الآمن'
            : 'Two-Factor verification required for this secure terminal',
          'success'
        );
      } else {
        onLoginSuccess(data.token, data.user);
        onShowToast(t.successToast, 'success');
      }
    } catch (err) {
      setIsLoading(false);
      onShowToast(t.errorToast, 'error');
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFACode) {
      onShowToast(lang === 'ar' ? 'الرجاء إدخال رمز التحقق' : 'Please enter code', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: twoFAUserId, code: twoFACode })
      });

      const data = await resp.json();
      setIsLoading(false);

      if (!resp.ok) {
        onShowToast(data.error || t.errorToast, 'error');
        return;
      }

      onLoginSuccess(data.token, data.user);
      onShowToast(t.successToast, 'success');
    } catch (err) {
      setIsLoading(false);
      onShowToast(t.errorToast, 'error');
    }
  };

  const triggerFillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setRequires2FA(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center px-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Floating Controls */}
      <div className="absolute top-4 right-4 left-4 flex justify-between items-center z-50">
        <div className="flex gap-2">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 transition active:scale-95 text-xs font-semibold cursor-pointer"
          >
            <Languages className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>
        </div>
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 transition active:scale-95"
          aria-label={t.themeLight}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
        </button>
      </div>

      <div className="w-full max-w-lg mt-8 mb-4 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-2 scale-100 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-600/20 text-white font-bold text-xl">
            H
          </div>
          <span className="text-xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-sans">
            HAKIM CLINIC
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-8 font-mono">
          SECURE CLINICAL SUITE v4.2.0
        </p>

        {/* Auth form Card */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-2xl p-6 md:p-8 transition-all duration-300">
          {!requires2FA ? (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="text-center">
                <h1 className="text-xl font-extrabold tracking-tight md:text-2xl font-sans">
                  {t.loginHeader}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {t.loginSubtitle}
                </p>
              </div>

              {/* Username Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {t.usernameLabel}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-600">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    placeholder="doctor / receptionist"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {t.passwordLabel}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-600">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Security Banner */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900 text-xs">
                <ShieldAlert className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="leading-relaxed">
                  {lang === 'ar'
                    ? 'يتم تشفير ونقل البيانات عبر قنوات مأمنة بالكامل باستخدام خوارزميات PBKDF2 لحماية السجلات الطبية.'
                    : 'Confidential patient records transmission is backed by PBKDF2 cryptographic storage protocols.'}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 hover:scale-[1.01] active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" />
                    <span>{t.loginButton}</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* 2FA Form Container */
            <form onSubmit={handleVerify2FA} className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <ShieldAlert className="w-6 h-6 animate-bounce" />
                </div>
                <h1 className="text-xl font-extrabold md:text-2xl font-sans">
                  {t.twoFAHeader}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {t.twoFASubtitle}
                </p>
              </div>

              {/* 2FA Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {t.verificationCode}
                </label>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center py-4 text-2xl font-bold tracking-widest bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition font-mono"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              {/* Help Message */}
              <div className="text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                {t.twoFADemoTip}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRequires2FA(false)}
                  className="w-1/3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold transition cursor-pointer"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.01] active:translate-y-px text-sm font-semibold shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{t.verifyButton}</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Preset accounts selector - Crucial Developer Experience enhancement */}
        <div className="w-full mt-6 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-center space-y-4">
          <p className="font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">
            {t.demologsTitle}
          </p>

          <div className="flex flex-col gap-3">
            {/* Patient notice - Directing to direct tracking portal as login is disabled */}
            <div className="flex justify-center p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg max-w-sm w-full mx-auto">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400 block">
                  ⚠️ {lang === 'ar' ? 'تم إلغاء نظام الحسابات وكلمات المرور للمرضى' : 'Patient Credentials Dispensed'}
                </span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  {lang === 'ar' 
                    ? 'لم يعد المرضى بحاجة لكلمة مرور للدخول. يرجى التوجه للصفحة الرئيسية واستعراض حقيبتك وحساب زمن انتظارك بالاسم والهاتف مباشرة.' 
                    : 'Abolished password friction! Go to the Home Screen to book or track your live wait duration using Name and Phone.'}
                </p>
              </div>
            </div>

            {/* Secure staff toggle section */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              {!showStaffPresets ? (
                <button
                  type="button"
                  onClick={() => setShowStaffPresets(true)}
                  className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-emerald-600 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg transition inline-flex items-center gap-1"
                >
                  <span>🔒</span>
                  <span>
                    {lang === 'ar' 
                      ? 'إظهار خيارات دخول الإدارة والأطباء (بيانات مخفية)' 
                      : 'Reveal Staff & Doctor Entry Options (Usernames Masked)'}
                  </span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-end pr-1">
                    <button
                      type="button"
                      onClick={() => setShowStaffPresets(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                    >
                      {lang === 'ar' ? 'إخفاء الحسابات' : 'Hide Accounts'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => triggerFillCredentials('doctor', 'doctor123')}
                      className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-center select-none cursor-pointer transition flex flex-col items-center gap-1"
                    >
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                        {lang === 'ar' ? 'الطبيب الرئيسي (محمي)' : 'Master Doctor (Protected Account)'}
                      </span>
                      <span className="font-mono text-[10px] opacity-75 text-rose-500 font-bold">
                        {lang === 'ar' ? 'اسم المستخدم: [مخفي للأمن] / كلمة مرور: [مخفية]' : 'Username: d****r / Password: •••••'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerFillCredentials('receptionist', 'receptionist123')}
                      className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-center select-none cursor-pointer transition flex flex-col items-center gap-1"
                    >
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 text-xs">
                        {lang === 'ar' ? 'موظف الاستقبال (محمي)' : 'Receptionist (Protected Account)'}
                      </span>
                      <span className="font-mono text-[10px] opacity-75 text-rose-500 font-bold">
                        {lang === 'ar' ? 'اسم المستخدم: [مخفي للأمن] / كلمة مرور: [مخفية]' : 'Username: r**********t / Password: •••••'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
