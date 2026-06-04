/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from '../translations';
import { SafeUser, Patient, Appointment, WaitingListEntry } from '../types';
import {
  Activity, Users, Calendar, ShieldAlert, Folder, Plus,
  Search, LogOut, Clock, Sun, Moon, CheckCircle2, RefreshCw
} from 'lucide-react';

interface ReceptionistDashboardProps {
  user: SafeUser;
  token: string;
  lang: 'ar' | 'en';
  setLang: (l: 'ar' | 'en') => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  onLogout: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ReceptionistDashboard({
  user,
  token,
  lang,
  setLang,
  theme,
  setTheme,
  onLogout,
  onShowToast
}: ReceptionistDashboardProps) {
  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Search/Filter Patients and Bookings
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    return new Date().toISOString().substring(0, 10);
  });

  // Booking fields
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingUrgent, setBookingUrgent] = useState(false);

  // Patient Enrollment form
  const [enrollForm, setEnrollForm] = useState({
    fullName: '', phone: '', email: '', age: '', gender: 'male' as 'male' | 'female',
    address: '', job: '', socialStatus: 'single' as any,
    chronicDiseases: '', allergies: '', currentMedications: '',
    reasonForVisit: '', additionalNotes: ''
  });

  // Secure api fetch wrapper
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
    const syncData = async () => {
      const pResp = await apiFetch('/api/patients');
      if (pResp && pResp.ok) setPatients(await pResp.json());

      const aResp = await apiFetch('/api/appointments');
      if (aResp && aResp.ok) setAppointments(await aResp.json());

      const qResp = await apiFetch('/api/waiting-list');
      if (qResp && qResp.ok) setWaitingList(await qResp.json());
    };
    syncData();
  }, [refreshTrigger]);

  // Handle Enrollment
  const handleEnrollPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.fullName || !enrollForm.phone || !enrollForm.reasonForVisit) {
      onShowToast(lang === 'ar' ? 'الرجاء تعبئة الاسم والهاتف وسبب الزيارة' : 'Required fields missing', 'error');
      return;
    }

    const resp = await apiFetch('/api/patients', {
      method: 'POST',
      body: JSON.stringify(enrollForm)
    });

    if (resp && resp.ok) {
      onShowToast(lang === 'ar' ? 'تم تسجيل وتأمين الملف الطبي وإصدار هوية المريض بنجاح' : 'Patient file saved successfully', 'success');
      setEnrollForm({
        fullName: '', phone: '', email: '', age: '', gender: 'male',
        address: '', job: '', socialStatus: 'single', chronicDiseases: '',
        allergies: '', currentMedications: '', reasonForVisit: '', additionalNotes: ''
      });
      setRefreshTrigger(p => p + 1);
    } else {
      onShowToast(t.errorToast, 'error');
    }
  };

  // Check-In Booked Patient into Live Waiting Queue List
  const handleCheckin = async (appointmentId: string) => {
    const resp = await apiFetch('/api/waiting-list', {
      method: 'POST',
      body: JSON.stringify({ appointmentId })
    });
    if (resp && resp.ok) {
      onShowToast(t.checkedInSuccess, 'success');
      setRefreshTrigger(p => p + 1);
    } else if (resp && resp.status === 409) {
      onShowToast(lang === 'ar' ? 'المريض مسجل بالفعل في صالون الانتظار' : 'Patient is already inside waiting room', 'error');
    }
  };

  // Book Appointment
  const handleReceptionistBook = async (patId: string) => {
    if (!bookingReason) {
      onShowToast(lang === 'ar' ? 'الرجاء إدخال سبب الزيارة' : 'Reason for consultation is required', 'error');
      return;
    }

    const resp = await apiFetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: patId,
        date: selectedCalendarDate,
        timeSlot: bookingTime,
        reason: bookingReason,
        isUrgent: bookingUrgent
      })
    });

    if (resp && resp.ok) {
      onShowToast(t.successToast, 'success');
      setBookingReason('');
      setRefreshTrigger(p => p + 1);
    } else if (resp && resp.status === 409) {
      const d = await resp.json();
      onShowToast(d.errorAr || d.error, 'error');
    }
  };

  // Filter lists
  const filteredPatients = patients.filter(p => {
    return p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
           p.phone.includes(patientSearch);
  });

  const dailyBookings = appointments.filter(a => a.date === selectedCalendarDate);

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Lobby Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            R
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-blue-700 dark:text-blue-400">
              {t.receptionDesk}
            </h1>
            <p className="text-xs text-slate-500">
              {t.receptionistRole} • <span className="font-extrabold text-blue-600 dark:text-blue-400">{user.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 font-mono">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>2026-06-04 10:27 UTC</span>
          </div>

          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-lg bg-slate-150 dark:bg-slate-800 border text-xs font-bold cursor-pointer hover:scale-105 transition"
          >
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>

          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-lg bg-slate-150 dark:bg-slate-800 text-slate-500 hover:text-blue-500"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-955/20 text-rose-600 border border-rose-200 px-3.5 py-1.5 rounded-lg font-bold text-xs hover:bg-rose-100 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logout}</span>
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left column: Enrollment form & booking slots builder */}
        <div className="xl:col-span-8 space-y-6">
          {/* Patient Register Workspace form (13 specifications fields collected!) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-extrabold text-sm md:text-base text-blue-700 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-3">
              ➕ {t.formAddPatientTitle}
            </h2>

            <form onSubmit={handleEnrollPatient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-sm">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formFullName} *</label>
                  <input
                    type="text"
                    required
                    value={enrollForm.fullName}
                    onChange={(e) => setEnrollForm({ ...enrollForm, fullName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Ahmad Ali Mansour"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formPhone} *</label>
                  <input
                    type="text"
                    required
                    value={enrollForm.phone}
                    onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    placeholder="+966-50..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formEmail}</label>
                  <input
                    type="email"
                    value={enrollForm.email}
                    onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none font-mono"
                    placeholder="name@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs md:text-sm">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formAge}</label>
                  <input
                    type="number"
                    value={enrollForm.age}
                    onChange={(e) => setEnrollForm({ ...enrollForm, age: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    placeholder="42"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formGender}</label>
                  <select
                    value={enrollForm.gender}
                    onChange={(e: any) => setEnrollForm({ ...enrollForm, gender: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <option value="male">{t.genderMale}</option>
                    <option value="female">{t.genderFemale}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formSocialStatus}</label>
                  <select
                    value={enrollForm.socialStatus}
                    onChange={(e: any) => setEnrollForm({ ...enrollForm, socialStatus: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formJob}</label>
                  <input
                    type="text"
                    value={enrollForm.job}
                    onChange={(e) => setEnrollForm({ ...enrollForm, job: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    placeholder="e.g. Teacher"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs md:text-sm">
                <label className="font-bold text-slate-400">{t.formAddress}</label>
                <input
                  type="text"
                  value={enrollForm.address}
                  onChange={(e) => setEnrollForm({ ...enrollForm, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  placeholder="Street and District Location details..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-sm">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formChronic}</label>
                  <input
                    type="text"
                    value={enrollForm.chronicDiseases}
                    onChange={(e) => setEnrollForm({ ...enrollForm, chronicDiseases: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    placeholder="None / Asthmatic etc"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formAllergies}</label>
                  <input
                    type="text"
                    value={enrollForm.allergies}
                    onChange={(e) => setEnrollForm({ ...enrollForm, allergies: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    placeholder="Allergies details"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formMedications}</label>
                  <input
                    type="text"
                    value={enrollForm.currentMedications}
                    onChange={(e) => setEnrollForm({ ...enrollForm, currentMedications: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    placeholder="Taking regular daily medications"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs md:text-sm">
                <label className="font-bold text-slate-400">{t.formReason} *</label>
                <input
                  type="text"
                  required
                  value={enrollForm.reasonForVisit}
                  onChange={(e) => setEnrollForm({ ...enrollForm, reasonForVisit: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  placeholder="Primary visit complaint..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs md:text-sm shadow-md transition cursor-pointer select-none"
                >
                  {t.btnSavePatient}
                </button>
              </div>
            </form>
          </div>

          {/* Schedulings & Slot locks */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-extrabold text-sm md:text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-1.5">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span>{t.receptionDashboard}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-450">{t.dateLabel}</label>
                <input
                  type="date"
                  value={selectedCalendarDate}
                  onChange={(e) => setSelectedCalendarDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded font-mono focus:outline-none"
                />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border space-y-3">
                <p className="font-extrabold text-xs text-slate-400 block uppercase">{lang === 'ar' ? 'حجز تذكرة كشف جديدة مبرمجة' : 'Add Clinic Booking'}</p>

                <div className="space-y-1.5 text-xs text-slate-500">
                  <label>{lang === 'ar' ? 'اختر مريضاً' : 'Select patient'}</label>
                  <select
                    id="recep_booking_patient"
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded"
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.fullName} ({p.phone})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div className="space-y-1">
                    <label>{t.timeSlotLabel}</label>
                    <select
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded font-mono"
                    >
                      {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label>{t.urgencyLabel}</label>
                    <select
                      value={bookingUrgent ? 'true' : 'false'}
                      onChange={(e) => setBookingUrgent(e.target.value === 'true')}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded"
                    >
                      <option value="false">{t.urgencyNormal}</option>
                      <option value="true">{t.urgencyHigh}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <label>{lang === 'ar' ? 'الشكوى والعَرَض' : 'Booking Complaint'}</label>
                  <input
                    type="text"
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    placeholder="Regular follow up"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const sel = document.getElementById('recep_booking_patient') as HTMLSelectElement;
                    if (sel?.value) handleReceptionistBook(sel.value);
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm rounded shadow transition"
                >
                  {t.btnBookAppointment}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: check-in waiting list lobby queue */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm md:text-base border-b border-slate-100 dark:border-slate-800 pb-3">
              🎯 {t.checkinLobbyTitle}
            </h3>

            {/* Quick search to find patient */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-lg text-xs"
                placeholder={t.searchByIdentifier}
              />
            </div>

            {/* Booked list of selected date line */}
            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {dailyBookings.length === 0 ? (
                <p className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs font-semibold">{lang === 'ar' ? 'لا يوجد حجوزات مجدولة ليومنا هذا' : 'No programmed reservations found'}</p>
              ) : (
                dailyBookings.map((app) => {
                  const alreadyCheckedIn = waitingList.find(q => q.appointmentId === app.id);
                  return (
                    <div key={app.id} className="p-3 bg-slate-50 dark:bg-slate-950 border rounded-xl flex items-center justify-between gap-2 text-xs">
                      <div className="space-y-1 max-w-2/3">
                        <p className="font-extrabold text-slate-700 dark:text-slate-200 line-clamp-1">{app.patientName}</p>
                        <p className="text-[10px] text-slate-400 font-mono text-slate-500">{app.timeSlot} • {app.patientPhone}</p>
                      </div>

                      {alreadyCheckedIn ? (
                        <span className="px-2 py-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 rounded">
                          {lang === 'ar' ? 'قيد الانتظار' : 'Checked In'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCheckin(app.id)}
                          className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow transition cursor-pointer select-none"
                        >
                          {lang === 'ar' ? 'وصول المريض' : 'Check-In'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
