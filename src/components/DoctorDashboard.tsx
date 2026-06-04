/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from '../translations';
import {
  SafeUser, Patient, Appointment, MedicalRecord, MedicalFile, Prescription,
  WaitingListEntry, AuditLog, ClinicBackup, ClinicSettings
} from '../types';
import {
  Activity, Users, Calendar, ShieldAlert, Folder, FileText, Plus,
  Search, LogOut, Sun, Moon, Database, Upload, Printer, Clock, CheckCircle2,
  AlertCircle, XCircle, Settings, Lock, RefreshCw, FileSpreadsheet, Layers
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DoctorDashboardProps {
  user: SafeUser;
  token: string;
  lang: 'ar' | 'en';
  setLang: (l: 'ar' | 'en') => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  onLogout: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export default function DoctorDashboard({
  user,
  token,
  lang,
  setLang,
  theme,
  setTheme,
  onLogout,
  onShowToast
}: DoctorDashboardProps) {
  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'schedule' | 'security'>('dashboard');

  // Database lists
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<ClinicBackup[]>([]);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);

  // Search & Filtering States
  const [patientSearch, setPatientSearch] = useState('');
  const [patientsFilter, setPatientsFilter] = useState<'all' | 'chronic'>('all');
  const [auditSearch, setAuditSearch] = useState('');

  // Selected Patient for EHR Portfolio View
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<{
    records: MedicalRecord[];
    files: MedicalFile[];
    prescriptions: Prescription[];
  }>({ records: [], files: [], prescriptions: [] });

  // Creation Modals / Form States
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    fullName: '', phone: '', email: '', age: '', gender: 'male' as 'male' | 'female',
    address: '', job: '', socialStatus: 'single' as any,
    chronicDiseases: '', allergies: '', currentMedications: '',
    reasonForVisit: '', additionalNotes: '',
    extraFieldName: '', extraFieldValue: ''
  });

  // Diagnostic Log Form State
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Prescription Builder State
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionMedicines, setPrescriptionMedicines] = useState<{
    name: string; dosage: string; frequency: string; duration: string;
  }[]>([]);
  const [newMedicine, setNewMedicine] = useState({ name: '', dosage: '', frequency: '', duration: '' });
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  // Printable Active Prescription State
  const [printedPrescription, setPrintedPrescription] = useState<Prescription | null>(null);

  // Clinic Calendar Date selector
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    return new Date().toISOString().substring(0, 10);
  });

  // Schedule appointment state in Dr Portal
  const [bookingTime, setBookingTime] = useState('09:30');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingUrgent, setBookingUrgent] = useState(false);

  // App reschedule editor states (Requirement 6)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [newAppDate, setNewAppDate] = useState('');
  const [newAppTime, setNewAppTime] = useState('09:00');

  // Refresh loops
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // API Call Wrap
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

  // Synchronize DB
  useEffect(() => {
    const syncData = async () => {
      // General settings
      const sResp = await fetch('/api/settings');
      if (sResp && sResp.ok) {
        const sData = await sResp.json();
        setSettings(sData);
      }

      // Patients list
      const pResp = await apiFetch('/api/patients');
      if (pResp && pResp.ok) {
        const pList = await pResp.json();
        setPatients(pList);
      }

      // Appointments list
      const aResp = await apiFetch('/api/appointments');
      if (aResp && aResp.ok) {
        const aList = await aResp.json();
        setAppointments(aList);
      }

      // In-consultation Waitlist Lobby
      const qResp = await apiFetch('/api/waiting-list');
      if (qResp && qResp.ok) {
        const qList = await qResp.json();
        setWaitingList(qList);
      }

      if (activeTab === 'security') {
        const auditResp = await apiFetch('/api/audit-logs');
        if (auditResp && auditResp.ok) {
          const logs = await auditResp.json();
          setAuditLogs(logs);
        }

        const backupsResp = await apiFetch('/api/backups');
        if (backupsResp && backupsResp.ok) {
          const bList = await backupsResp.json();
          setBackups(bList);
        }
      }
    };
    syncData();
  }, [activeTab, refreshTrigger]);

  // Load detailed Patient EHR Profile
  const handleOpenPatientEHR = async (patient: Patient) => {
    const resp = await apiFetch(`/api/patients/${patient.id}/full`);
    if (resp && resp.ok) {
      const fullData = await resp.json();
      setSelectedPatient(fullData.patient);
      setSelectedPatientHistory({
        records: fullData.records || [],
        files: fullData.files || [],
        prescriptions: fullData.prescriptions || []
      });
      // Clear forms
      setSymptoms('');
      setDiagnosis('');
      setTreatmentPlan('');
      setClinicalNotes('');
      setPrescriptionMedicines([]);
    } else {
      onShowToast(lang === 'ar' ? 'فشل تحميل الملف الطبي المشفر' : 'Failed to view decrypted clinical file', 'error');
    }
  };

  // Create Patient Form submit
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.fullName || !newPatientForm.phone) {
      onShowToast(t.errorToast, 'error');
      return;
    }

    const payload = {
      fullName: newPatientForm.fullName,
      phone: newPatientForm.phone,
      email: newPatientForm.email,
      age: newPatientForm.age,
      gender: newPatientForm.gender,
      address: newPatientForm.address,
      job: newPatientForm.job,
      socialStatus: newPatientForm.socialStatus,
      chronicDiseases: newPatientForm.chronicDiseases,
      allergies: newPatientForm.allergies,
      currentMedications: newPatientForm.currentMedications,
      reasonForVisit: newPatientForm.reasonForVisit,
      additionalNotes: newPatientForm.additionalNotes,
      extraFields: newPatientForm.extraFieldName
        ? [{ label: newPatientForm.extraFieldName, value: newPatientForm.extraFieldValue }]
        : []
    };

    const resp = await apiFetch('/api/patients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (resp && resp.ok) {
      onShowToast(t.successToast, 'success');
      setShowAddPatientModal(false);
      setNewPatientForm({
        fullName: '', phone: '', email: '', age: '', gender: 'male',
        address: '', job: '', socialStatus: 'single', chronicDiseases: '',
        allergies: '', currentMedications: '', reasonForVisit: '',
        additionalNotes: '', extraFieldName: '', extraFieldValue: ''
      });
      setRefreshTrigger(prev => prev + 1);
    } else {
      onShowToast(t.errorToast, 'error');
    }
  };

  // Submit diagnostic examination logger in patient view
  const handleSaveDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !diagnosis) {
      onShowToast(lang === 'ar' ? 'الرجاء كتابة التشخيص الأساسي' : 'Primary assessment diagnosis required', 'error');
      return;
    }

    const payload = {
      patientId: selectedPatient.id,
      date: new Date().toISOString().substring(0, 10),
      symptoms,
      diagnosis,
      treatmentPlan,
      notes: clinicalNotes
    };

    const resp = await apiFetch('/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (resp && resp.ok) {
      onShowToast(t.successToast, 'success');
      setSymptoms('');
      setDiagnosis('');
      setTreatmentPlan('');
      setClinicalNotes('');
      // Reload EHR clinical history
      handleOpenPatientEHR(selectedPatient);
    }
  };

  // Interactive prescription manager
  const handleAddMedicineLine = () => {
    if (!newMedicine.name) return;
    setPrescriptionMedicines([...prescriptionMedicines, newMedicine]);
    setNewMedicine({ name: '', dosage: '', frequency: '', duration: '' });
  };

  const handleSignPrescription = async () => {
    if (!selectedPatient || prescriptionMedicines.length === 0) {
      onShowToast(lang === 'ar' ? 'الرجاء إضافة دواء واحد على الأقل' : 'Add at least one medicine', 'error');
      return;
    }

    const payload = {
      patientId: selectedPatient.id,
      medicines: prescriptionMedicines,
      notes: prescriptionNotes
    };

    const resp = await apiFetch('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (resp && resp.ok) {
      const savedRes = await resp.json();
      onShowToast(t.successToast, 'success');
      setShowPrescriptionModal(false);
      setPrescriptionMedicines([]);
      setPrescriptionNotes('');
      setPrintedPrescription(savedRes);
      // Reload history
      handleOpenPatientEHR(selectedPatient);
    }
  };

  // Handle clinical Document Base64 upload simulation
  const handleFileDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatient) return;

    const fileSizeStr = Math.round(file.size / 1024) + ' KB';
    const reader = new FileReader();
    reader.onloadend = async () => {
      const fileUrl = reader.result as string;

      const payload = {
        patientId: selectedPatient.id,
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
        onShowToast(lang === 'ar' ? 'تم رفع الملف والتقرير الطبي بنجاح بالملف السري' : 'Document uploaded successfully', 'success');
        handleOpenPatientEHR(selectedPatient);
      }
    };
    reader.readAsDataURL(file);
  };

  // Lobby Queue state interactions (Arrived -> In consultation -> completed)
  const handleQueueAdmit = async (waitListId: string) => {
    const resp = await apiFetch(`/api/waiting-list/${waitListId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'in_consultation' })
    });
    if (resp && resp.ok) {
      onShowToast(lang === 'ar' ? 'تم استدعاء المريض لغرفة الكشف' : 'Attending patient admitted into consulting room', 'success');
      setRefreshTrigger(p => p + 1);
    }
  };

  const handleSendEntryNotification = async (waitListId: string) => {
    const resp = await apiFetch(`/api/waiting-list/${waitListId}/notify-entry`, {
      method: 'POST'
    });
    if (resp && resp.ok) {
      onShowToast(
        lang === 'ar' 
          ? 'تم إرسال إشعار السماح بالدخول للمريض وموظف الاستقبال بنجاح!' 
          : 'Entry authorized notification sent to patient and receptionist!', 
        'success'
      );
      setRefreshTrigger(p => p + 1);
    }
  };

  const handleQueueCheckout = async (waitListId: string) => {
    const resp = await apiFetch(`/api/waiting-list/${waitListId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' })
    });
    if (resp && resp.ok) {
      onShowToast(lang === 'ar' ? 'تم تسجيل خروج ومغادرة المريض بنجاح' : 'Patient successfully discharged', 'success');
      setRefreshTrigger(p => p + 1);
    }
  };

  const handleResetQueue = async () => {
    const resp = await apiFetch('/api/waiting-list', { method: 'DELETE' });
    if (resp && resp.ok) {
      onShowToast(lang === 'ar' ? 'تم تصفية وإعادة تهيئة صالون الانتظار' : 'Queue lobby reset compiled', 'success');
      setRefreshTrigger(p => p + 1);
    }
  };

  // Trigger Local Database Snapshot backup
  const handleTriggerBackup = async () => {
    const resp = await apiFetch('/api/backups/trigger', { method: 'POST' });
    if (resp && resp.ok) {
      onShowToast(lang === 'ar' ? 'تم توليد وتأمين نسخة احتياطية جديدة لقاعدة البيانات' : 'Encrypted system database backup generated successfully', 'success');
      setRefreshTrigger(p => p + 1);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    const resp = await apiFetch('/api/backups/restore', {
      method: 'POST',
      body: JSON.stringify({ backupId })
    });
    if (resp && resp.ok) {
      onShowToast(lang === 'ar' ? 'تم استعادة الحالة الطبية السابقة للنظام وإعادة التشغيل' : 'Clinic database fully restored from snapshot', 'success');
      setRefreshTrigger(p => p + 1);
    }
  };

  // Dr. Portal scheduling
  const handleBookSlotDrPortal = async (patId: string) => {
    if (!bookingReason) {
      onShowToast(lang === 'ar' ? 'الرجاء تحديد سبب الحجز' : 'Please input visit reason', 'error');
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
      onShowToast(lang === 'ar' ? 'تم تأكيد وحجز الموعد بنجاح بالتقويم' : 'Appointment booked successfully', 'success');
      setBookingReason('');
      setRefreshTrigger(p => p + 1);
    } else if (resp && resp.status === 409) {
      const data = await resp.json();
      onShowToast(data.errorAr || data.error, 'error');
    }
  };

  const handleCancelAppointment = async (appId: string) => {
    const resp = await apiFetch(`/api/appointments/${appId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' })
    });
    if (resp && resp.ok) {
      onShowToast(lang === 'ar' ? 'تم إلغاء الموعد المبرمج بنجاح' : 'Appointment has been cancelled', 'success');
      setRefreshTrigger(p => p + 1);
    }
  };

  // Reschedule Appointment (Requirement 6)
  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;

    const resp = await apiFetch(`/api/appointments/${editingAppointment.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        date: newAppDate,
        timeSlot: newAppTime,
        reason: editingAppointment.reason,
        isUrgent: editingAppointment.isUrgent
      })
    });

    if (resp && resp.ok) {
      onShowToast(lang === 'ar' ? 'تمت إعادة جدولة الموعد وتعديله بنجاح' : 'Appointment rescheduled successfully', 'success');
      setEditingAppointment(null);
      setRefreshTrigger(p => p + 1);
    } else {
      onShowToast(lang === 'ar' ? 'عفواً، الخلية الزمنية المطلوبة محجوزة مسبقاً' : 'The selected slot is busy', 'error');
    }
  };

  // Exporters: CSV Patients roster
  const exportPatientsToCSV = () => {
    try {
      if (patients.length === 0) return;
      let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
      csvContent += 'ID,Full Name,Phone,Email,Age,Gender,Address,Chronic Pathology,Allergies,Job\n';

      patients.forEach(p => {
        csvContent += `"${p.id}","${p.fullName}","${p.phone}","${p.email}",${p.age},"${p.gender}","${p.address}","${p.chronicDiseases}","${p.allergies}","${p.job}"\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Patients_Audit_Report_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast(lang === 'ar' ? 'تم تصدير سجل المرضى إلى ملف Excel/CSV بنجاح' : 'Patients export sheet downloaded', 'success');
    } catch {
      onShowToast(t.errorToast, 'error');
    }
  };

  // Diagnostic graphs data builder
  const sampleChartData = [
    { name: isRtl ? 'الأحد' : 'Sun', visits: 12, cases: 3, cancel: 2 },
    { name: isRtl ? 'الإثنين' : 'Mon', visits: 18, cases: 4, cancel: 1 },
    { name: isRtl ? 'الثلاثاء' : 'Tue', visits: 15, cases: 5, cancel: 0 },
    { name: isRtl ? 'الأربعاء' : 'Wed', visits: 24, cases: 8, cancel: 3 },
    { name: isRtl ? 'الخميس' : 'Thu', visits: 31, cases: 9, cancel: 2 },
    { name: isRtl ? 'الجمعة' : 'Fri', visits: 8, cases: 2, cancel: 1 },
    { name: isRtl ? 'السبت' : 'Sat', visits: 14, cases: 4, cancel: 4 }
  ];

  // Filtering patients on screen
  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
                          p.phone.includes(patientSearch) ||
                          p.chronicDiseases.toLowerCase().includes(patientSearch.toLowerCase());
    const matchesFilter = patientsFilter === 'all' || (p.chronicDiseases && p.chronicDiseases !== '' && p.chronicDiseases !== 'لا يوجد' && p.chronicDiseases !== 'none');
    return matchesSearch && matchesFilter;
  });

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter(l => {
    return l.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
           l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
           l.details.toLowerCase().includes(auditSearch.toLowerCase());
  }).slice(0, 50); // limit to last 50 matches

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Clinic System Topbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-600/20">
            H
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight font-sans text-emerald-700 dark:text-emerald-400">
              {settings ? (isRtl ? settings.clinicNameAr : settings.clinicNameEn) : t.appTitle}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <span className="inline-block w-2 bg-emerald-500 rounded-full h-2 animate-ping" />
              <span>{settings ? (isRtl ? settings.specialtyAr : settings.specialtyEn) : t.doctorRole}</span>
              <span className="mx-1">•</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{user.name}</span>
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Real-time Clock */}
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 font-mono">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>2026-06-04 10:27 UTC</span>
          </div>

          {/* Bilingual Shift */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:scale-[1.03] active:scale-95 text-xs font-semibold cursor-pointer"
          >
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          {/* Theme Mode toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-500"
            aria-label="Theme mode"
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5 text-amber-500" />}
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/40 px-3.5 py-1.5 rounded-lg font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-950/50 cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>{t.logout}</span>
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <nav className="lg:col-span-2 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-h-fit">
          <button
            onClick={() => { setActiveTab('dashboard'); setSelectedPatient(null); }}
            className={`flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-lg text-xs md:text-sm font-bold transition w-full whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t.tabDashboard}</span>
          </button>

          <button
            onClick={() => { setActiveTab('patients'); }}
            className={`flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-lg text-xs md:text-sm font-bold transition w-full whitespace-nowrap cursor-pointer ${
              activeTab === 'patients'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t.tabPatients}</span>
          </button>

          <button
            onClick={() => { setActiveTab('schedule'); setSelectedPatient(null); }}
            className={`flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-lg text-xs md:text-sm font-bold transition w-full whitespace-nowrap cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t.tabSchedules}</span>
          </button>

          <button
            onClick={() => { setActiveTab('security'); setSelectedPatient(null); }}
            className={`flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-lg text-xs md:text-sm font-bold transition w-full whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>{t.tabSecurity}</span>
          </button>
        </nav>

        {/* Primary View Workspace */}
        <main className="lg:col-span-10 space-y-6">
          {/* Executive KPI Metrics Row */}
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-2xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t.metricActiveWaitlist}
                </p>
                <p className="text-2xl font-black mt-1 text-slate-800 dark:text-white">
                  {waitingList.filter(q => q.status !== 'completed').length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-2xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t.metricTodayBookings}
                </p>
                <p className="text-2xl font-black mt-1 text-slate-800 dark:text-white">
                  {appointments.filter(a => a.date === new Date().toISOString().substring(0, 10)).length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-2xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t.metricNewCases}
                </p>
                <p className="text-2xl font-black mt-1 text-slate-800 dark:text-white">{patients.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-2xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t.metricCanceledRates}
                </p>
                <p className="text-2xl font-black mt-1 text-slate-800 dark:text-white">
                  {appointments.length > 0
                    ? Math.round((appointments.filter(a => a.status === 'cancelled').length / appointments.length) * 100)
                    : 0}%
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm col-span-2 lg:col-span-1 flex items-center justify-between">
              <div>
                <p className="text-2xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t.metricSecurityShield}
                </p>
                <p className="text-xs font-bold mt-1.5 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animation-pulse" />
                  <span>{t.metricActiveSec}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/20 text-teal-500 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </section>

          {/* TAB 1: DASHBOARD & WORKPLACE LOGISTICS */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* NEXT PATIENT SUMMONS CONTROLLER WIDGET (Requirement 6) */}
              <div className="xl:col-span-12 p-5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-indigo-700 text-white rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 text-right">
                  <div className="flex items-center gap-1.5 text-emerald-200 font-extrabold text-[10px] uppercase tracking-wider bg-white/15 w-fit px-2.5 py-1 rounded">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    <span>{isRtl ? 'نظام استدعاء المريض التالي في الطابور' : 'NEXT PATIENT WAITING OUTSIDE'}</span>
                  </div>
                  {(() => {
                    const nextWaiting = waitingList.find(q => q.status === 'waiting');
                    if (nextWaiting) {
                      return (
                        <h3 className="font-black text-sm md:text-base mt-1">
                          {isRtl ? `المريض القادم: ${nextWaiting.patientName}` : `Next patient: ${nextWaiting.patientName}`} (دور #{nextWaiting.queueNumber})
                        </h3>
                      );
                    }
                    return (
                      <h3 className="font-medium text-xs text-slate-100 italic mt-1">
                        {isRtl ? 'لا يوجد مرضى بانتظار الدخول بنظام الانتظار حالياً' : 'No patients currently waiting in salon'}
                      </h3>
                    );
                  })()}
                </div>

                {(() => {
                  const nextWaiting = waitingList.find(q => q.status === 'waiting');
                  if (nextWaiting) {
                    return (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleSendEntryNotification(nextWaiting.id)}
                          className="py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs md:text-sm rounded-xl shadow transition transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer select-none"
                        >
                          <span>📢</span>
                          <span>{isRtl ? 'إرسال إشعار مريض وموظف الاستقبال للسماح بالدخول' : 'Send Entry Notification to Patient & Receptionist'}</span>
                        </button>
                        <button
                          onClick={() => handleQueueAdmit(nextWaiting.id)}
                          className="py-2.5 px-4 bg-white hover:bg-slate-50 text-[#096649] font-black text-xs md:text-sm rounded-xl shadow transition transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer select-none"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-605" />
                          <span>{isRtl ? 'استدعاء المريض لغرفة الكشف' : 'Admit Patient'}</span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Active waiting queue panel (Left/Right depending on lang) - Realtime Lobby */}
              <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    <h2 className="font-extrabold tracking-tight text-sm md:text-base">{t.lobbyTitle}</h2>
                  </div>
                  <button
                    onClick={handleResetQueue}
                    className="p-1.5 text-2xs font-bold uppercase tracking-wider rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition duration-150 cursor-pointer"
                  >
                    {lang === 'ar' ? 'تصفية الدور' : 'Purge Queue'}
                  </button>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto">
                  {waitingList.filter(q => q.status !== 'completed').length === 0 ? (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <Clock className="w-10 h-10 mx-auto opacity-35 mb-2.5" />
                      <p className="text-xs font-medium leading-relaxed">{t.lobbyNoPatient}</p>
                    </div>
                  ) : (
                    waitingList
                      .filter(q => q.status !== 'completed')
                      .map((q) => {
                        const originalApp = appointments.find(ap => ap.id === q.appointmentId);
                        return (
                          <div
                            key={q.id}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition duration-100 ${
                              q.status === 'in_consultation'
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">
                                  {t.lobbyQueueNo} #{q.queueNumber}
                                </span>
                                {originalApp?.isUrgent && (
                                  <span className="text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded leading-none">
                                    {t.urgencyHigh}
                                  </span>
                                )}
                              </div>
                              <p className="font-extrabold text-xs md:text-sm text-slate-800 dark:text-slate-200">
                                {q.patientName}
                              </p>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <span>{t.lobbyArrived} {new Date(q.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </p>
                            </div>

                            <div className="flex gap-2">
                              {q.status === 'waiting' ? (
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleSendEntryNotification(q.id)}
                                    className="py-1.5 px-2.5 rounded-lg text-xs font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-900 flex items-center gap-1 shadow transition cursor-pointer"
                                    title={isRtl ? 'إرسال إشعار دخول للمريض والاستقبال' : 'Notify Entry'}
                                  >
                                    <span>📢</span>
                                    <span>{isRtl ? 'إشعار الدخول' : 'Notify Entry'}</span>
                                  </button>
                                  <button
                                    onClick={() => handleQueueAdmit(q.id)}
                                    className="py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow transition cursor-pointer"
                                  >
                                    <Activity className="w-3.5 h-3.5" />
                                    <span>{t.btnCallConsult}</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    handleQueueCheckout(q.id);
                                    const p = patients.find(pa => pa.id === q.patientId);
                                    if (p) handleOpenPatientEHR(p);
                                  }}
                                  className="py-1.5 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 shadow transition cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{t.btnCheckout}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Integrated analytics and interactive charts panel */}
              <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h2 className="font-extrabold tracking-tight text-sm md:text-base">{t.clinicReports}</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.repMetricsTrend}</p>
                </div>

                <div className="w-full h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sampleChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                          borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="visits"
                        name={t.chartLabelVisits}
                        stroke="#059669"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorVisits)"
                      />
                      <Area
                        type="monotone"
                        dataKey="cases"
                        name={t.chartLabelPatients}
                        stroke="#4f46e5"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#colorCases)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Patient lookup shortcut */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="font-medium text-slate-500 text-center sm:text-start leading-relaxed">
                    {lang === 'ar'
                      ? 'تم ترحيل وتشفير كافة العمليات المعالجة بالعيادة. بإمكانك استخراج شهادات التدقيق الشاملة وتصدير سجل المرضى.'
                      : 'All diagnostic transactions compiled in memory ledger. Click exporter to backup patient files.'}
                  </span>
                  <button
                    onClick={exportPatientsToCSV}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg shadow whitespace-nowrap cursor-pointer transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تصدير المرضى (Excel/CSV)' : 'Export Master (CSV)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED PATIENT DIRECTORIES */}
          {(activeTab === 'patients' && !selectedPatient) && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="font-extrabold tracking-tight text-sm md:text-base">{t.patientRegistry}</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {lang === 'ar' ? 'البحث التفصيلي عن الملفات الطبية وسجلات التشخيص' : 'Manage master diagnostic logs folder index.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddPatientModal(true)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 px-3 rounded-lg shadow hover:scale-[1.01] cursor-pointer transition whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.addPatientBtn}</span>
                  </button>
                </div>
              </div>

              {/* Patient searches & Filters grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                <div className="relative md:col-span-8">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs md:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder={t.searchPatients}
                  />
                </div>

                <div className="md:col-span-4 flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setPatientsFilter('all')}
                    className={`flex-1 py-2 text-xs font-bold transition ${
                      patientsFilter === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t.filterAll}
                  </button>
                  <button
                    onClick={() => setPatientsFilter('chronic')}
                    className={`flex-1 py-2 text-xs font-bold transition whitespace-nowrap ${
                      patientsFilter === 'chronic'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t.filterChronic}
                  </button>
                </div>
              </div>

              {/* Dynamic Patient listings */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPatients.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-slate-400 dark:text-slate-500">
                    <Users className="w-12 h-12 mx-auto opacity-30 mb-2.5" />
                    <p className="text-sm font-medium">{lang === 'ar' ? 'لا يوجد ملفات مطابقة لشروط البحث' : 'No patients found matching search vectors'}</p>
                  </div>
                ) : (
                  filteredPatients.map((p) => {
                    const nextApp = appointments.find(ap => ap.patientId === p.id && ap.status === 'confirmed');
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleOpenPatientEHR(p)}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:shadow-md cursor-pointer transition flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 line-clamp-1">{p.fullName}</h3>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                              p.gender === 'male' ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-pink-50 text-pink-800 dark:bg-pink-950 dark:text-pink-300'
                            }`}>
                              {p.gender === 'male' ? t.genderMale : t.genderFemale}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px] text-slate-500">
                            <span className="truncate">📞 {p.phone}</span>
                            <span className="truncate">🎂 {p.age} {t.ageYears}</span>
                            <span className="col-span-2 truncate">📍 {p.address || (lang === 'ar' ? 'العنوان غير مسجل' : 'No recorded address')}</span>
                          </div>

                          {p.chronicDiseases && p.chronicDiseases !== '' && p.chronicDiseases !== 'none' && (
                            <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900 text-[10px] sm:text-xs">
                              <span className="font-black text-rose-950 dark:text-rose-100">{isRtl ? 'الأمراض المزمنة: ' : 'Chronic: '}</span>
                              <span className="line-clamp-1">{p.chronicDiseases}</span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400">
                            📁 {lang === 'ar' ? 'مجلد النشاط الكلي متاح' : 'Activity file active'}
                          </span>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline">
                            {lang === 'ar' ? 'عرض السجل الطبي ←' : 'Open EHR File ←'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2 - EHR FULL HISTORIC FILE PORTFOLIO FOR A PATIENT */}
          {(activeTab === 'patients' && selectedPatient) && (
            <div className="space-y-6">
              {/* Patient header back button option */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <span>{lang === 'ar' ? '← العودة لدليل المرضى' : '← Back to patients registry'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPrescriptionModal(true)}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer transition"
                  >
                    {t.issuePrescriptionBtn}
                  </button>
                </div>
              </div>

              {/* Detailed EHR Portfolio layout grids */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Side: demographics details */}
                <div className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-full mx-auto flex items-center justify-center mb-3">
                      <Folder className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="font-extrabold text-base">{selectedPatient.fullName}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1 opacity-75">UID: {selectedPatient.id}</p>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest">{t.patientDetails}</h4>

                    <div className="grid grid-cols-3 gap-y-2 gap-x-1 border-b border-slate-50 dark:border-slate-800 pb-3">
                      <span className="text-slate-400 font-bold">{isRtl ? 'الهاتف' : 'Phone'}</span>
                      <span className="col-span-2 text-end font-semibold">{selectedPatient.phone}</span>

                      <span className="text-slate-400 font-bold">{isRtl ? 'البريد' : 'Email'}</span>
                      <span className="col-span-2 text-end font-semibold text-slate-600 dark:text-slate-300 truncate">{selectedPatient.email || '-'}</span>

                      <span className="text-slate-400 font-bold">{isRtl ? 'العمر' : 'Age'}</span>
                      <span className="col-span-2 text-end font-semibold">{selectedPatient.age} {t.ageYears}</span>

                      <span className="text-slate-400 font-bold">{isRtl ? 'الجنس' : 'Gender'}</span>
                      <span className="col-span-2 text-end font-semibold">{selectedPatient.gender === 'male' ? t.genderMale : t.genderFemale}</span>

                      <span className="text-slate-400 font-bold">{isRtl ? 'العنوان' : 'Address'}</span>
                      <span className="col-span-2 text-end font-semibold line-clamp-1">{selectedPatient.address}</span>

                      <span className="text-slate-400 font-bold">{isRtl ? 'الحالة الاجتماعية' : 'Marital'}</span>
                      <span className="col-span-2 text-end font-semibold uppercase">{selectedPatient.socialStatus}</span>

                      <span className="text-slate-400 font-bold">{isRtl ? 'الوظيفة' : 'Occupation'}</span>
                      <span className="col-span-2 text-end font-semibold">{selectedPatient.job || '-'}</span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-bold text-rose-600 dark:text-rose-400">⚠️ {isRtl ? 'الحساسية والموانع الدوائية' : 'Pharma Allergies'}</p>
                      <p className="p-2.5 rounded bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50 font-medium">
                        {selectedPatient.allergies || (isRtl ? 'لا يوجد نوع مسجل' : 'No pharmaceutical chemical allergies reported')}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-bold text-amber-600 dark:text-amber-400">🩺 {isRtl ? 'الشكوى الطبية الحالية' : 'Chief Active Complaint'}</p>
                      <p className="p-2.5 rounded bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-950 font-medium">
                        {selectedPatient.reasonForVisit || (isRtl ? 'غير محددة الشكوى مسبقاً' : 'No structured complaints specified')}
                      </p>
                    </div>

                    {Array.isArray(selectedPatient.extraFields) && selectedPatient.extraFields.map((f, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 bg-slate-100/50 dark:bg-slate-900 p-2 rounded">
                        <span className="font-extrabold text-slate-500">{f.label}</span>
                        <span className="font-extrabold">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right/Left Side: EHR logs and Interactive diagnostic sheet */}
                <div className="xl:col-span-8 space-y-6">
                  {/* Diagnosis Scribe Form Creator (Attending Doctor only!) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                    <h4 className="font-extrabold tracking-tight border-b border-slate-100 dark:border-slate-800 pb-3 text-sm md:text-base">
                      {t.newDiagnosis}
                    </h4>
                    <form onSubmit={handleSaveDiagnosis} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">{t.symptomsLabel}</label>
                          <textarea
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            rows={2}
                            className="w-full text-xs md:text-sm p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                            placeholder={isRtl ? 'مستويات ضغط الدم، الأعراض الحيوية، دقات القلب المشتكى منها...' : 'Vitals, heart pacing counts, respiratory index, chest compression complains...'}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">{t.diagnosisLabel}</label>
                          <textarea
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            rows={2}
                            className="w-full text-xs md:text-sm p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                            placeholder={isRtl ? 'التشخيص المرضي السريري، فحص شرايين الصدر والقلب...' : 'Atrial fibrillation symptoms, ischemia, high respiratory resistance detected...'}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">{t.treatmentPlanLabel}</label>
                        <textarea
                          value={treatmentPlan}
                          onChange={(e) => setTreatmentPlan(e.target.value)}
                          rows={2}
                          className="w-full text-xs md:text-sm p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                          placeholder={isRtl ? 'الدواء ووصفات المعالجة وتخفيض التوتر العضلي والشرياني...' : 'Pharmaceutical courses, followups scheduling, medical imaging target courses...'}
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="py-2.5 px-5 rounded-lg text-xs md:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:scale-[1.01] active:translate-y-px transition cursor-pointer"
                        >
                          {t.saveDiagnosisBtn}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Historic consultation clinical diaries */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                    <h4 className="font-extrabold tracking-tight pb-3 border-b border-slate-100 dark:border-slate-800 text-sm md:text-base">
                      {t.medicalHistory}
                    </h4>

                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {selectedPatientHistory.records.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                          <FileText className="w-8 h-8 mx-auto opacity-30 mb-2" />
                          <p className="text-xs font-semibold">{isRtl ? 'سجل العيادة السريرية فارغ حالياً' : 'No recorded clinical consultations histories reported yet'}</p>
                        </div>
                      ) : (
                        selectedPatientHistory.records.slice().reverse().map((rec) => (
                          <div key={rec.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between text-xs border-b border-dashed border-slate-200 dark:border-slate-700 pb-1.5">
                              <span className="font-bold text-slate-400">{rec.date}</span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">📄 {isRtl ? 'فحص تشخيصي معتمد' : 'Clinic diagnostic file'}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
                              {rec.symptoms && (
                                <div className="space-y-1">
                                  <p className="font-black text-slate-450 text-[10px] md:text-xs text-rose-600 dark:text-rose-450 uppercase tracking-wider">{t.symptomsLabel}</p>
                                  <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{rec.symptoms}</p>
                                </div>
                              )}
                              <div className="space-y-1">
                                <p className="font-black text-slate-450 text-[10px] md:text-xs text-emerald-600 dark:text-emerald-450 uppercase tracking-wider">{t.diagnosisLabel}</p>
                                <p className="text-slate-800 dark:text-slate-100 font-bold leading-relaxed">{rec.diagnosis}</p>
                              </div>
                            </div>

                            {rec.treatmentPlan && (
                              <div className="text-xs md:text-sm border-t border-slate-100 dark:border-slate-800/80 pt-2 bg-slate-100 dark:bg-slate-950 p-2 rounded">
                                <p className="font-black text-slate-450 text-[10px] md:text-xs text-indigo-600 dark:text-indigo-405 uppercase tracking-wider">{t.treatmentPlanLabel}</p>
                                <p className="text-slate-700 dark:text-slate-200 mt-1 font-semibold leading-relaxed">{rec.treatmentPlan}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Digital Scans / PDF base64 files portfolio folder */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                      <h4 className="font-extrabold tracking-tight text-sm md:text-base">
                        {t.clinicalDocs}
                      </h4>
                      <label className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold shadow cursor-pointer transition">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>{t.uploadClinicalDoc}</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleFileDocUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto">
                      {selectedPatientHistory.files.length === 0 ? (
                        <div className="col-span-full text-center py-10 text-slate-405 dark:text-slate-500">
                          <Folder className="w-8 h-8 mx-auto opacity-30 mb-2" />
                          <p className="text-xs font-semibold">{t.noClinicalDocs}</p>
                        </div>
                      ) : (
                        selectedPatientHistory.files.map((file) => (
                          <div key={file.id} className="p-3 border border-slate-250 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2">
                            <div className="space-y-0.5 truncate max-w-2/3">
                              <p className="font-extrabold text-xs text-slate-700 dark:text-slate-200 truncate">{file.documentName}</p>
                              <p className="text-[10px] text-slate-400 font-mono text-slate-500 uppercase">{file.documentType} • {file.fileSize}</p>
                            </div>
                            <a
                              href={file.fileUrl}
                              download={file.documentName}
                              className="px-3 py-1.5 rounded border border-emerald-300 text-emerald-600 hover:bg-emerald-50 text-[10px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer"
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
            </div>
          )}

          {/* TAB 3: MASTER SCHEDULES & CALENDARS PLANNER */}
          {activeTab === 'schedule' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left Column: agenda grid planner */}
              <div className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold tracking-tight pb-3 border-b border-slate-100 dark:border-slate-800 text-sm md:text-base">
                  {t.calendarPlanner}
                </h3>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.dateLabel}</label>
                    <input
                      type="date"
                      value={selectedCalendarDate}
                      onChange={(e) => {
                        setSelectedCalendarDate(e.target.value);
                      }}
                      className="w-full text-xs md:text-sm p-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono transition"
                    />
                  </div>

                  {/* Add direct appointment inside doctor portal */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5">
                    <p className="font-extrabold text-xs uppercase text-slate-400">{lang === 'ar' ? 'حجز موعد لمريض بالعيادة' : 'Register Instant Booking'}</p>

                    <div className="space-y-1.5 text-xs text-slate-500">
                      <label>{lang === 'ar' ? 'اختر مريضاً من القائمة' : 'Select target patient'}</label>
                      <select
                        id="form_schedule_patient"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-1"
                      >
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.fullName} ({p.phone})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div className="space-y-1.5">
                        <label>{t.timeSlotLabel}</label>
                        <select
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none font-mono"
                        >
                          {settings && settings.bookingTimeSlots.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label>{t.urgencyLabel}</label>
                        <select
                          id="form_schedule_urgent"
                          value={bookingUrgent ? 'true' : 'false'}
                          onChange={(e) => setBookingUrgent(e.target.value === 'true')}
                          className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none"
                        >
                          <option value="false">{t.urgencyNormal}</option>
                          <option value="true">{t.urgencyHigh}</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500">
                      <label>{lang === 'ar' ? 'الشكوى / سبب الزيارة' : 'Consultation Cause'}</label>
                      <input
                        type="text"
                        value={bookingReason}
                        onChange={(e) => setBookingReason(e.target.value)}
                        placeholder="e.g. cardiac review"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-lg focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => {
                        const patEl = document.getElementById('form_schedule_patient') as HTMLSelectElement;
                        if (patEl?.value) {
                          handleBookSlotDrPortal(patEl.value);
                        }
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-lg shadow-md cursor-pointer transition select-none"
                    >
                      {t.btnBookAppointment}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Reservation slots listing table */}
              <div className="xl:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-extrabold tracking-tight text-sm md:text-base">
                    {lang === 'ar' ? `حجوزات يوم: ${selectedCalendarDate}` : `Appointments List for ${selectedCalendarDate}`}
                  </h3>
                  <span className="text-2xs font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded leading-none">
                    📅 {appointments.filter(a => a.date === selectedCalendarDate).length} {lang === 'ar' ? 'حجوزات' : 'bookings'}
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {appointments.filter(a => a.date === selectedCalendarDate).length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                      <Calendar className="w-12 h-12 mx-auto opacity-30 mb-2" />
                      <p className="text-sm font-semibold">{lang === 'ar' ? 'لا يوجد مواعيد مقررة في هذا التاريخ' : 'Zero schedules booked on this target date line'}</p>
                    </div>
                  ) : (
                    appointments
                      .filter(a => a.date === selectedCalendarDate)
                      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                      .map((app) => (
                        <div
                          key={app.id}
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-100 ${
                            app.status === 'cancelled'
                              ? 'bg-slate-50 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850'
                          }`}
                        >
                          <div className="space-y-1 select-none">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono px-2 py-0.5 rounded">
                                ⏰ {app.timeSlot}
                              </span>
                              {app.isUrgent && (
                                <span className="text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded">
                                  {t.urgencyHigh}
                                </span>
                              )}
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border leading-none ${
                                app.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : app.status === 'confirmed'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : app.status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {app.status}
                              </span>
                            </div>
                            <p className="font-extrabold text-xs md:text-sm text-slate-800 dark:text-slate-100">{app.patientName}</p>
                            <p className="text-[11px] text-slate-400">📞 {app.patientPhone} • {app.reason}</p>
                          </div>

                          {app.status !== 'cancelled' && app.status !== 'completed' && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAppointment(app);
                                  setNewAppDate(app.date);
                                  setNewAppTime(app.timeSlot);
                                }}
                                className="py-1 px-2.5 text-[10px] font-extrabold border border-blue-200 text-blue-600 rounded hover:bg-blue-50 transition cursor-pointer select-none"
                              >
                                ✏️ {lang === 'ar' ? 'تعديل الموعد' : 'Edit Slot'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelAppointment(app.id)}
                                className="py-1 px-2.5 text-[10px] font-extrabold border border-rose-200 text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer select-none"
                              >
                                ❌ {lang === 'ar' ? 'إلغاء الموعد' : 'Cancel Slot'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM BACKUPS & CLINIC SECURITY TERMINAL */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Database snapshot manager backups module */}
              <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-extrabold tracking-tight text-sm md:text-base">
                    {t.backupManagerTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {t.backupManagerDesc}
                  </p>
                </div>

                <button
                  onClick={handleTriggerBackup}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg hover:scale-[1.01] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>{t.triggerBackupBtn}</span>
                </button>

                <div className="space-y-3.5 max-h-[350px] overflow-y-auto">
                  {backups.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                      <Database className="w-10 h-10 opacity-30 mx-auto mb-2" />
                      <p className="text-xs font-semibold">{t.noBackups}</p>
                    </div>
                  ) : (
                    backups.map((b) => (
                      <div key={b.backupId} className="p-3.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="font-black text-rose-600 dark:text-rose-400 truncate max-w-2/3">💿 {b.backupId}</span>
                          <span className="text-slate-400">{b.timestamp.substring(11, 19)}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-2 rounded text-[10px] text-slate-400 font-bold">
                          <span>👤 {b.recordsCount.users} Usrs</span>
                          <span>📁 {b.recordsCount.patients} EHRs</span>
                          <span>📅 {b.recordsCount.appointments} Appts</span>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRestoreBackup(b.backupId)}
                            className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-505 rounded border border-indigo-250 hover:bg-indigo-100/50 cursor-pointer select-none transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{t.backupRestoreBtn}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Security audit logs list ledger inspect */}
              <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-extrabold tracking-tight text-sm md:text-base">{t.auditLogsTitle}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.auditLogsDesc}</p>
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder={t.searchLogs}
                  />
                </div>

                {/* Audit table logs grid */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {filteredAuditLogs.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                      <ShieldAlert className="w-8 h-8 opacity-30 mx-auto mb-2" />
                      <p className="text-xs font-semibold">{lang === 'ar' ? 'لا يوجد أحداث مطابقة للبحث حالياً' : 'Zero matching security audits found'}</p>
                    </div>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <div key={log.id} className="p-3 text-[11px] font-medium leading-relaxed rounded-lg border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 grid grid-cols-1 md:grid-cols-4 items-center gap-2">
                        <div className="space-y-0.5 select-none md:col-span-1">
                          <p className="font-mono text-[9px] text-slate-400">{log.timestamp.replace('T', ' ').substring(0, 19)}</p>
                          <p className="font-black text-slate-500">IP: {log.ipAddress}</p>
                        </div>
                        <div className="space-y-0.5 md:col-span-2">
                          <p className="font-extrabold text-slate-800 dark:text-slate-100">
                            {log.actor} <span className="p-0.5 bg-slate-200 dark:bg-slate-850 rounded text-[8px] font-black uppercase text-slate-500">{log.role}</span>
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 font-bold">{log.details}</p>
                        </div>
                        <div className="text-right flex md:flex-col items-center justify-between md:justify-center gap-2 md:col-span-1 border-t md:border-t-0 border-dashed border-slate-200 pt-1 md:pt-0">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-500">
                            {log.action}
                          </span>
                          <span className={`text-[9px] font-black tracking-wider leading-none uppercase ${log.status === 'SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {log.status === 'SUCCESS' ? '● SUCCESS' : '✖ FAILURE'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: PRESET CLINICAL NEW EHR ENROLLMENT */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <button
              onClick={() => setShowAddPatientModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <XCircle className="w-5.5 h-5.5" />
            </button>

            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold tracking-tight text-sm md:text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Folder className="w-5 h-5" />
                <span>{t.formAddPatientTitle}</span>
              </h3>
            </div>

            <form onSubmit={handleAddPatientSubmit} className="space-y-4 max-h-[500px] overflow-y-auto px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formFullName} *</label>
                  <input
                    type="text"
                    required
                    value={newPatientForm.fullName}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, fullName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Ahmad Mansour"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formPhone} *</label>
                  <input
                    type="text"
                    required
                    value={newPatientForm.phone}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
                    placeholder="+966-50..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formAge}</label>
                  <input
                    type="number"
                    value={newPatientForm.age}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, age: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    placeholder="e.g. 42"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">{t.formAddress}</label>
                  <input
                    type="text"
                    value={newPatientForm.address}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, address: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    placeholder="e.g. Riyadh, Olaya district"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="py-2.5 px-4 rounded bg-slate-100 dark:bg-slate-850 hover:bg-slate-200"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition"
                >
                  {t.btnSavePatient}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STRUCTURED DIGITAL PRESCRIPTION DRAFTER */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <button
              onClick={() => setShowPrescriptionModal(false)}
              className="absolute top-4 right-4 text-slate-401 hover:text-slate-600 focus:outline-none"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold tracking-tight text-sm md:text-base text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <FileText className="w-5 h-5" />
                <span>{t.prescriptionTitle}</span>
              </h3>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {/* Medicine adding line */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-semibold text-slate-500">
                <div className="space-y-1">
                  <label>{t.medicineName}</label>
                  <input
                    type="text"
                    value={newMedicine.name}
                    onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                    placeholder="e.g. Concor"
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label>{t.medicineDosage}</label>
                  <input
                    type="text"
                    value={newMedicine.dosage}
                    onChange={(e) => setNewMedicine({ ...newMedicine, dosage: e.target.value })}
                    placeholder="5mg"
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label>{t.medicineFreq}</label>
                  <input
                    type="text"
                    value={newMedicine.frequency}
                    onChange={(e) => setNewMedicine({ ...newMedicine, frequency: e.target.value })}
                    placeholder="QD"
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-between">
                  <label>{t.medicineDuration}</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newMedicine.duration}
                      onChange={(e) => setNewMedicine({ ...newMedicine, duration: e.target.value })}
                      placeholder="30 days"
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded"
                    />
                    <button
                      type="button"
                      onClick={handleAddMedicineLine}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-1 rounded transition select-none cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Added medicine details list */}
              <div className="space-y-2">
                <p className="font-extrabold text-xs uppercase text-slate-400">{lang === 'ar' ? 'العقاقير الصيدلانية المضافة' : 'Prescribed medicines course list'}</p>
                {prescriptionMedicines.length === 0 ? (
                  <p className="text-center py-5 rounded bg-slate-50/50 dark:bg-slate-900/50 text-[11px] text-slate-405 font-medium">{t.noMedicinesAdded}</p>
                ) : (
                  prescriptionMedicines.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-emerald-50/20 dark:bg-emerald-950/10 flex items-center justify-between text-xs font-semibold">
                      <div className="space-y-0.5 max-w-2/3">
                        <p className="font-extrabold text-slate-700 dark:text-slate-100">{m.name} ({m.dosage})</p>
                        <p className="text-[10px] text-slate-400 font-mono text-slate-500 uppercase">{m.frequency} • {m.duration}</p>
                      </div>
                      <button
                        onClick={() => setPrescriptionMedicines(prescriptionMedicines.filter((_, i) => i !== idx))}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition font-black cursor-pointer"
                      >
                        {lang === 'ar' ? 'حذف' : 'Remove'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Remarks logs */}
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-400">{t.physicianNotes}</label>
                <textarea
                  rows={2}
                  value={prescriptionNotes}
                  onChange={(e) => setPrescriptionNotes(e.target.value)}
                  placeholder={isRtl ? 'تحذيرات أو توصيات الصيدلي...' : 'Dispensing warnings, avoid caffeinated juices etc...'}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(false)}
                className="py-2.5 px-4 rounded bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleSignPrescription}
                className="py-2.5 px-5 rounded bg-indigo-600 hover:bg-indigo-505 text-white shadow-md transition cursor-pointer"
              >
                {t.signPrescriptionBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP VIEW 3: PRINTABLE DIGITAL PHARMACY RECEIPT PRESCRIPTION BRAND */}
      {printedPrescription && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border rounded-lg max-w-2xl w-full p-6 space-y-6 shadow-2xl relative text-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
            <button
              onClick={() => setPrintedPrescription(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 font-black cursor-pointer"
            >
              [✖]
            </button>

            {/* Print Letterhead layout */}
            <div className="border-b-4 border-emerald-600 pb-4 text-center space-y-2">
              <h2 className="text-xl font-extrabold tracking-tight text-emerald-800">{isRtl ? 'مستوصف الحكيم التخصصي' : 'Al-Shifa Cardiovascular Center'}</h2>
              <p className="text-xs text-slate-500 font-bold">
                {isRtl ? 'عيادة جراحة وأمراض الأوعية الدموية - د. يوسف حكيم' : 'Cardiovascular Clinic Consultant • Dr. Joseph Hakim'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">2026-06-04 • CLINIC ORDER #{printedPrescription.id}</p>
            </div>

            {/* Case file and patient indices */}
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold p-3 bg-slate-50 border border-dashed rounded text-slate-600">
              <div>
                <p>{isRtl ? 'اسم المريض: ' : 'Patient Index: '} <span className="font-extrabold text-slate-900">{printedPrescription.patientName}</span></p>
                <p>📞 {patients.find(pa => pa.id === printedPrescription.patientId)?.phone || '-'}</p>
              </div>
              <div className="text-right">
                <p>{isRtl ? 'التاريخ الكلي: ' : 'Order Date: '} <span className="font-mono text-slate-900">{printedPrescription.date}</span></p>
                <p>{isRtl ? 'الطبيب الموقع: ' : 'Authorized Doc: '} <span className="font-extrabold text-slate-900">{printedPrescription.doctorName}</span></p>
              </div>
            </div>

            {/* Rx Medicine grid table layout */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-700 tracking-wider">⚡ Prescribed Course (Rx)</h3>
              <table className="w-full text-left text-xs text-slate-705 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-900 font-black">
                    <th className="p-2">{isRtl ? 'اسم الدواء' : 'Medicine'}</th>
                    <th className="p-2">{isRtl ? 'الجرعة' : 'Dosage'}</th>
                    <th className="p-2">{isRtl ? 'التكرار والتعليمات' : 'Dosage Schedule'}</th>
                    <th className="p-2">{isRtl ? 'المدة' : 'Days Supply'}</th>
                  </tr>
                </thead>
                <tbody>
                  {printedPrescription.medicines.map((m, index) => (
                    <tr key={index} className="border-b hover:bg-slate-50">
                      <td className="p-2 font-black text-slate-900">{m.name}</td>
                      <td className="p-2 font-mono text-slate-600">{m.dosage}</td>
                      <td className="p-2 text-slate-800">{m.frequency}</td>
                      <td className="p-2 text-slate-600">{m.duration}</td>
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

            {/* Seal / Sign block */}
            <div className="pt-6 border-t font-semibold flex items-center justify-between text-xs text-slate-500">
              <div>
                <p>HAKIM MEDICAL CLINIC SYSTEM</p>
                <p className="text-[10px] font-mono">Secured Verification hash: sha-256 pbkdf2 verified</p>
              </div>
              <div className="text-right text-center select-none">
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
                <Printer className="w-4 h-4 mr-1" />
                <span>{t.printPrescription}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Medical Rescheduling Overlay (Requirement 6) */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border-t-4 border-emerald-605 text-right space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center border-b pb-3 text-right">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>{isRtl ? 'إعادة جدولة وتعديل الموعد' : 'Reschedule & Modify Appointment'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingAppointment(null)}
                className="text-slate-400 hover:text-slate-650 text-sm font-black select-none"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border rounded-xl leading-normal space-y-1 text-right">
              <p className="text-xs text-slate-600 dark:text-slate-400"><strong>{isRtl ? 'اسم المريض:' : 'Patient Name:'}</strong> {editingAppointment.patientName}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400"><strong>{isRtl ? 'الموعد القديم:' : 'Old Schedule:'}</strong> {editingAppointment.date} في {editingAppointment.timeSlot}</p>
            </div>

            <form onSubmit={handleUpdateAppointment} className="space-y-4">
              <div className="space-y-1 text-right text-xs">
                <label className="font-bold text-slate-450">{isRtl ? 'تحديد التاريخ الجديد' : 'New Appointment Date'}</label>
                <input
                  type="date"
                  required
                  value={newAppDate}
                  onChange={(e) => setNewAppDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border rounded-xl font-mono focus:outline-none text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1 text-right text-xs">
                <label className="font-bold text-slate-450">{isRtl ? 'تحديد الساعة الجديدة' : 'New Time Slot'}</label>
                <select
                  required
                  value={newAppTime}
                  onChange={(e) => setNewAppTime(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                >
                  {settings?.bookingTimeSlots?.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  )) || ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="px-4 py-2 text-xs bg-slate-105 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-650 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
                >
                  {isRtl ? 'حفظ التغييرات الآن' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
