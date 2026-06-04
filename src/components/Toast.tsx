/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export default function Toast({ message, type, onClose, lang = 'ar' }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isRtl = lang === 'ar';

  return (
    <div
      style={{ zIndex: 9999 }}
      className={`fixed bottom-6 ${
        isRtl ? 'left-6' : 'right-6'
      } flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 scale-100 ${
        type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
      )}
      <p className="font-sans text-sm font-medium leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-current opacity-70 hover:opacity-100 flex-shrink-0 focus:outline-none"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
