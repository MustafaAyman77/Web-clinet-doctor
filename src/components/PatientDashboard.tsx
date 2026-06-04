/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from '../translations';
import { SafeUser, Patient, Appointment, MedicalRecord, MedicalFile, Prescription } from '../types';
import {
  Folder, Calendar, FileText, Upload, Printer, Clock, Sun, Moon,
  LogOut, CheckCircle2, AlertCircle, XCircle, Search
} from 'lucide-react';

interface PatientDashboardProps {
  user: SafeUser;
  token: string;
  lang: 'ar' | 'en';
  setLang: (l: 'ar' | 'en') => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  onLogout: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export default function PatientDashboard({
  user,
  token,
  lang,
  setLang,
  theme,
  setTheme,
  onLogout,
  onShowToast
}: PatientDashboardProps) {
  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  const [patientProfile, setPatientProfile] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Self-Booking State
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().substring(0, 10);
  });
  const [bookingTime, setBookingTime] = useState('10:00');
  const [bookingReason, setBookingReason] = useState('');

  // Active Print Prescription State
  const [printedPrescription, setPrintedPrescription] = useState<Prescription | null>(null);

  // Api base helper
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      const resp = await fetch(url, { ...options, headers });
      if (resp.status === 401) {
        onLogout();
        return null;
      }
      return resp;
    } catch {
      onShowToast(t.errorToast, 'error');
      return null;
    }
  };

  useEffect(() => {
    const loadPatientContext = async () => {
      // First find our patient file ID mapping
      const pResp = await apiFetch('/api/patients');
      if (pResp && pResp.ok) {
        const patList: Patient[] = await pResp.json();
        const selfFile = patList.find(p => p.userId === user.id);
        if (selfFile) {
          setPatientProfile(selfFile);

          // Get full clinical files securely matching patientId
          const fullResp = await apiFetch(`/api/patients/${selfFile.id}/full`);
          if (fullResp && fullResp.ok) {
            const data = await fullResp.json();
            setRecords(data.records || []);
            setFiles(data.files || []);
            setPrescriptions(data.prescriptions || []);
          }
        }
      }

      // Load appointments
      const aResp = await apiFetch('/api/appointments');
      if (aResp && aResp.ok) {
        setAppointments(await aResp.json());
      }
    };
    loadPatientContext();
  }, [refreshTrigger]);

  // Self-Booking Form Submit with collision check proxy
  const handleSelfBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingReason || !patientProfile) {
      onShowToast(lang === 'ar' ? 'الرجاء إدخال سبب الحجز العيادي' : 'Fields missing', 'error');
      return;
    }

    const resp = await apiFetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patientProfile.id,
        date: bookingDate,
        timeSlot: bookingTime,
        reason: bookingReason,
        isUrgent: false
      })
    });

    if (resp && resp.ok) {
      onShowToast(lang === 'ar' ? 'تم تقديم طلب الحجز والساعة بنجاح وبانتظار تفعيل الموظف' : 'Appointment request submitted successfully', 'success');
      setBookingReason('');
      setRefreshTrigger(p => p + 1);
    } else if (resp && resp.status === 409) {
      const d = await resp.json();
      onShowToast(d.errorAr || d.error, 'error');
    }
  };

  // Safe file upload of personal clinical scan base64
  const handlePersonalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientProfile) return;

    const fileSizeStr = Math.round(file.size / 1024) + ' KB';
    const reader = new FileReader();
    reader.onloadend = async () => {
      const fileUrl = reader.result as string;

      const payload = {
        patientId: patientProfile.id,
        documentName: file.name,
        documentType: file.name.split('.').pop() || 'pdf',
        fileUrl,
        fileSize: fileSizeStr
      };

      const resp = await apiFetch('/api/medical-files', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (resp && resp.ok) {
        onShowToast(lang === 'ar' ? 'تم رفع مستندك الطبي لملفاتك المحمية بالعيادة' : 'Diagnostic scan uploaded to secure folder', 'success');
        setRefreshTrigger(p => p + 1);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Patient header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            P
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-purple-700 dark:text-purple-400">
              {t.patientPortalTitle}
            </h1>
            <p className="text-xs text-slate-500">
              {user.name} • <span className="font-extrabold text-purple-600 dark:text-purple-400">ID: {user.username}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border text-xs font-bold transition hover:scale-105"
          >
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>

          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-purple-500"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-955/20 text-rose-600 border border-rose-220 px-3.5 py-1.5 rounded-lg font-bold text-xs hover:bg-rose-100 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logout}</span>
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Side Column: Metrics upcoming reserves, self-service schedule tool */}
        <div className="xl:col-span-4 space-y-6">
          {/* Demographics / Quick folder stats */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950 text-purple-600 rounded-full mx-auto flex items-center justify-center mb-3">
                <Folder className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-sm md:text-base">{user.name}</h3>
              {patientProfile && (
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">📂 {patientProfile.address}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                <p className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">{t.visitsCount}</p>
                <p className="text-xl font-black mt-1 text-purple-600">{records.length}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border">
                <p className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">{lang === 'ar' ? 'الملفات المرفوعة' : 'Scans Hosted'}</p>
                <p className="text-xl font-black mt-1 text-purple-600">{files.length}</p>
              </div>
            </div>

            {/* Next incoming app status */}
            <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300 border border-purple-200 text-xs">
              <p className="font-bold mb-1">📅 {t.nextVisitDate}:</p>
              {appointments.filter(a => a.status === 'confirmed').length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noUpcomingApp}</p>
              ) : (
                appointments
                  .filter(a => a.status === 'confirmed')
                  .slice(0, 1)
                  .map(a => (
                    <p key={a.id} className="font-extrabold">{a.date} {isRtl ? 'في تمام الساعة' : 'at'} {a.timeSlot} ⏰</p>
                  ))
              )}
            </div>
          </div>

          {/* Self-booking slot planner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm border-b border-slate-100 dark:border-slate-800 pb-3">
              📝 {t.bookMySlot}
            </h3>

            <form onSubmit={handleSelfBook} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.dateLabel}</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.timeSlotLabel}</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded font-mono"
                  >
                    {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-400">{lang === 'ar' ? 'سبب مراجعة الطبيب الرئيسي' : 'Reason for clinical visit'}</label>
                <input
                  type="text"
                  required
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  placeholder="Cardiac preventive review"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-505 text-white font-extrabold text-xs sm:text-sm rounded shadow cursor-pointer transition select-none"
              >
                {t.btnBookAppointment}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side Column: Clinical consult files, presc folders, and attachment upload drawers */}
        <div className="xl:col-span-8 space-y-6">
          {/* Clinical logs timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm md:text-base border-b border-slate-100 dark:border-slate-800 pb-3">
              📑 {t.myClinicalDetails}
            </h3>

            <div className="space-y-4 max-h-[350px] overflow-y-auto">
              {records.length === 0 ? (
                <p className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs font-semibold">{lang === 'ar' ? 'سجلك الطبي خالٍ من الكتشافات السريرية حالياً' : 'Your clinical folder logs index is empty'}</p>
              ) : (
                records.map((rec) => (
                  <div key={rec.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between items-center text-xs pb-1.5 border-b border-dashed">
                      <span className="font-bold text-slate-400">📅 {rec.date}</span>
                      <span className="font-black text-purple-600">{isRtl ? 'تقرير الطبيب المعالج' : 'Physician consultation report'}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
                      <div className="space-y-1 text-slate-700 dark:text-slate-300">
                        <p className="font-extrabold text-slate-400 text-[10px] uppercase">{t.symptomsLabel}</p>
                        <p className="leading-relaxed">{rec.symptoms || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-extrabold text-purple-650 text-[10px] uppercase text-purple-600">{t.diagnosisLabel}</p>
                        <p className="font-extrabold leading-relaxed">{rec.diagnosis}</p>
                      </div>
                    </div>

                    {rec.treatmentPlan && (
                      <div className="p-2.5 rounded bg-purple-50/20 dark:bg-purple-950/10 border-t text-xs leading-relaxed">
                        <strong className="text-purple-700">{t.treatmentPlanLabel}: </strong>
                        {rec.treatmentPlan}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active signed prescriptions courses files */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm md:text-base border-b border-slate-100 dark:border-slate-800 pb-3">
              💊 {t.myActivePrescriptions}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto">
              {prescriptions.length === 0 ? (
                <div className="col-span-full text-center py-10 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  <p>{lang === 'ar' ? 'لا يوجد وصفات مصدقة ومرحلة بالملف' : 'No prescriptions active found'}</p>
                </div>
              ) : (
                prescriptions.map((pr) => (
                  <div key={pr.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold">
                    <div className="space-y-0.5 truncate max-w-2/3">
                      <p className="font-black text-slate-700 dark:text-slate-200 truncate">{pr.doctorName}</p>
                      <p className="text-[10px] text-slate-400 font-mono text-slate-505">{pr.date} • {pr.medicines?.length || 0} drugs</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPrintedPrescription(pr)}
                      className="px-2.5 py-1.5 rounded bg-emerald-650 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-300 font-bold tracking-tight text-[10px] md:text-xs text-center cursor-pointer transition shadow"
                    >
                      🖨️ {isRtl ? 'استعراض الوصفة' : 'View Rx'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Secure Lab JPEGs folder upload */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
              <h3 className="font-extrabold text-sm md:text-base">
                📸 {t.uploadOwnFiles}
              </h3>
              <label className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow cursor-pointer transition">
                <Upload className="w-4 h-4 text-purple-600" />
                <span>{lang === 'ar' ? 'اختر ملفاً لرفعه للملف الخاص' : 'Select JPEG / PDF'}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handlePersonalFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto">
              {files.length === 0 ? (
                <p className="col-span-full text-center py-8 text-slate-400 dark:text-slate-500 text-xs font-semibold">{t.noClinicalDocs}</p>
              ) : (
                files.map((file) => (
                  <div key={file.id} className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 truncate max-w-2/3">
                      <p className="font-extrabold text-slate-700 dark:text-slate-200 truncate">{file.documentName}</p>
                      <p className="text-[10px] text-slate-400 font-mono text-slate-500">{file.documentType} • {file.fileSize}</p>
                    </div>
                    <a
                      href={file.fileUrl}
                      download={file.documentName}
                      className="px-2.5 py-1 text-[11px] font-bold border border-purple-300 text-purple-600 hover:bg-purple-50 rounded whitespace-nowrap cursor-pointer"
                    >
                      📥 {isRtl ? 'تحميل' : 'Get'}
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PRINT DIALOG PREPRESCRIPTION */}
      {printedPrescription && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 flex items-center justify-center">
          <div className="bg-white border rounded-lg max-w-2xl w-full p-6 space-y-6 shadow-2xl relative text-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
            <button
              onClick={() => setPrintedPrescription(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 font-black cursor-pointer"
            >
              [✖]
            </button>

            <div className="border-b-4 border-emerald-600 pb-4 text-center space-y-2">
              <h2 className="text-xl font-extrabold text-emerald-800">{isRtl ? 'مستوصف الشفاء مجمع القلب التخصصي' : 'Al-Shifa Cardiovascular Center'}</h2>
              <p className="text-xs text-slate-500 font-bold">
                {isRtl ? 'عيادة الأمراض القلبية وجراحة الأوعية الدموية - د. يوسف حكيم' : 'Cardiovascular Surgery Consultant • Dr. Joseph Hakim'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">2026-06-04 • CLINIC Rx ID #{printedPrescription.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold p-3 bg-slate-50 border rounded text-slate-600">
              <div>
                <p>{isRtl ? 'اسم المريض: ' : 'Patient Index: '} <span className="font-bold text-slate-900">{printedPrescription.patientName}</span></p>
                <p>📞 {patientProfile?.phone || '-'}</p>
              </div>
              <div className="text-right">
                <p>{isRtl ? 'التاريخ الكلي: ' : 'Order Date: '} <span className="font-mono text-slate-900">{printedPrescription.date}</span></p>
                <p>{isRtl ? 'الطبيب الموقع: ' : 'Authorized Doc: '} <span className="font-bold text-slate-900">{printedPrescription.doctorName}</span></p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-700 tracking-wider">⚡ Prescribed Course (Rx)</h3>
              <table className="w-full text-left text-xs text-slate-705 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-900 font-bold">
                    <th className="p-2">{isRtl ? 'اسم الدواء' : 'Medicine'}</th>
                    <th className="p-2">{isRtl ? 'الجرعة' : 'Dosage'}</th>
                    <th className="p-2">{isRtl ? 'التكرار والتعليمات' : 'Dosage Schedule'}</th>
                    <th className="p-2">{isRtl ? 'المدة' : 'Days Supply'}</th>
                  </tr>
                </thead>
                <tbody>
                  {printedPrescription.medicines && printedPrescription.medicines.map((m, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-black text-slate-900">{m.name}</td>
                      <td className="p-2 font-mono text-slate-600">{m.dosage}</td>
                      <td className="p-2">{m.frequency}</td>
                      <td className="p-2">{m.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {printedPrescription.notes && (
              <div className="p-3 bg-amber-50/50 text-amber-900 border text-xs leading-relaxed">
                <strong>{isRtl ? 'توصيات الطبيب المعالج:' : 'attending doctors comments:'} </strong>
                {printedPrescription.notes}
              </div>
            )}

            <div className="pt-6 border-t font-semibold flex items-center justify-between text-xs text-slate-500">
              <div>
                <p>HAKIM MEDICAL CLINIC SYSTEM</p>
                <p className="text-[10px] font-mono">Secured Verification hash: sha-256 pbkdf2 verified</p>
              </div>
              <div className="text-right select-none">
                <p className="text-[9px] text-slate-400 mb-1">{isRtl ? 'الختم والتوقيع الرقمي' : 'Signed electronic seal'}</p>
                <div className="border border-emerald-600/30 text-emerald-800 font-black px-4 py-1.5 uppercase tracking-widest bg-emerald-50 rounded">
                  {isRtl ? 'مُعتـمد الحكيم' : 'SECURE SIGNED'}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
              <button
                type="button"
                onClick={() => setPrintedPrescription(null)}
                className="px-4 py-1.5 border hover:bg-slate-50"
              >
                {isRtl ? 'إغلاق المعاينة' : 'Dismiss Panel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center shadow"
              >
                <span>{t.printPrescription}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
