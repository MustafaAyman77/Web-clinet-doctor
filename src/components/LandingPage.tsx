/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Stethoscope, ShieldAlert, Award, Clock, FileText, ChevronRight,
  User, Phone, Mail, Sparkles, Heart, HelpCircle, Lock, Users, KeyRound, Globe, Sun, Moon, Languages, Calendar,
  Upload, CheckCircle2, History, Trash2, Printer, Search, RefreshCw, Eye, Menu, X, ArrowDown, Activity, MapPin, Check, Plus
} from 'lucide-react';

interface LandingPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  onGoToLogin: () => void;
  lang: 'ar' | 'en';
  setLang: (l: 'ar' | 'en') => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export default function LandingPage({
  onLoginSuccess,
  onGoToLogin,
  lang,
  setLang,
  theme,
  setTheme,
  onShowToast
}: LandingPageProps) {
  const isRtl = lang === 'ar';

  // Floating hamburger menu open state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Core navigation tab for guest
  const [activeTab, setActiveTab] = useState<'book' | 'track'>('book');

  // Input states for New Booking tab
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [address, setAddress] = useState('');
  const [chronicDiseases, setChronicDiseases] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('10:00');
  const [bookingReason, setBookingReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Follow-up / Re-check specifications (Requirement 7)
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [prevPrescriptionText, setPrevPrescriptionText] = useState('');
  const [prevPrescriptionFile, setPrevPrescriptionFile] = useState<string | null>(null);
  const [prevPrescriptionFileName, setPrevPrescriptionFileName] = useState('');

  // Input states for Track appointment tab
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Fallback state when inquiry finds absolutely nothing (Requirement 3)
  const [searchNoBookingFound, setSearchNoBookingFound] = useState(false);

  // Loaded Patient Portal State
  const [portalPatient, setPortalPatient] = useState<any>(null);
  const [portalAppointments, setPortalAppointments] = useState<any[]>([]);
  const [portalRecords, setPortalRecords] = useState<any[]>([]);
  const [portalPrescriptions, setPortalPrescriptions] = useState<any[]>([]);
  const [portalFiles, setPortalFiles] = useState<any[]>([]);
  const [portalWaitingEntry, setPortalWaitingEntry] = useState<any>(null);
  const [portalWaitMinutes, setPortalWaitMinutes] = useState<number>(0);
  const [isPortalLoaded, setIsPortalLoaded] = useState(false);

  // Active Print/View Prescription details in overlay modal
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);

  // Time slots for booking dropdown (Vibrant selection)
  const timeslots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:05', '17:30'
  ];

  // Auto-refresh queue and estimated wait variables
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPortalLoaded && portalPatient) {
      interval = setInterval(() => {
        refreshPortalDataSilently();
      }, 15000); // refresh every 15 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPortalLoaded, portalPatient]);

  const refreshPortalDataSilently = async () => {
    if (!portalPatient) return;
    try {
      const resp = await fetch('/api/public/track-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: portalPatient.fullName,
          phone: portalPatient.phone
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setPortalPatient(data.patient);
        setPortalAppointments(data.appointments || []);
        setPortalRecords(data.records || []);
        setPortalPrescriptions(data.prescriptions || []);
        setPortalFiles(data.files || []);
        setPortalWaitingEntry(data.currentWaitingEntry || null);
        setPortalWaitMinutes(data.estimatedWaitMinutes || 0);
      }
    } catch {
      // Background silencer
    }
  };

  // Submission of public passwordless booking request with detailed follow-up uploads (Requirement 7)
  const handlePublicBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !phone || !bookingDate || !bookingTime) {
      onShowToast(
        isRtl 
          ? 'الرجاء ملء الحقول المطلوبة: الاسم بالكامل، رقم الهاتف، تاريخ الموعد وساعة الحجز' 
          : 'Please enter required fields: Full Name, Phone, Booking Date, and Time Slot',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare detailed reason, appending old prescription text if it is a follow-up
      let finalReason = bookingReason;
      if (isFollowUp) {
        const followAr = `(إعادة كشف - تفاصيل الروشتة السابقة: ${prevPrescriptionText || 'مرفق صورة بالملف'})`;
        const followEn = `(Follow-up - Prev Prescription details: ${prevPrescriptionText || 'Attached Image in EHR'})`;
        finalReason = isRtl ? `${bookingReason} ${followAr}` : `${bookingReason} ${followEn}`;
      }

      const resp = await fetch('/api/public/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          age,
          gender,
          address,
          chronicDiseases,
          allergies,
          currentMedications,
          date: bookingDate,
          timeSlot: bookingTime,
          reason: finalReason,
          isUrgent
        })
      });

      const data = await resp.json();

      if (!resp.ok) {
        setIsSubmitting(false);
        onShowToast(data.errorAr || data.error || (isRtl ? 'حدث خطأ أثناء الحجز' : 'Error booking appointment'), 'error');
        return;
      }

      // If they uploaded a previous prescription image, attach it immediately and securely to their newly generated profile (Requirement 7)
      if (isFollowUp && prevPrescriptionFile) {
        try {
          await fetch('/api/public/upload-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientId: data.patient.id,
              documentName: isRtl ? `روشتة سابقة مرفقة - ${prevPrescriptionFileName || 'prescription.png'}` : `Prev Prescription - ${prevPrescriptionFileName || 'prescription.png'}`,
              documentType: prevPrescriptionFileName.split('.').pop() || 'png',
              fileUrl: prevPrescriptionFile,
              fileSize: 'M-size Image'
            })
          });
        } catch (uploadErr) {
          console.error("Prescription file upload failed", uploadErr);
        }
      }

      setIsSubmitting(false);
      onShowToast(
        isRtl 
          ? 'تم تسجيل بياناتك وحجز موعدك بنجاح! جاري عرض الحجوزات والوقت المتبقي بدقة...' 
          : 'Medical file & appointment slot booked successfully! loading wait estimate ticks...',
        'success'
      );

      // Clean follow-up states
      setIsFollowUp(false);
      setPrevPrescriptionText('');
      setPrevPrescriptionFile(null);
      setPrevPrescriptionFileName('');

      // Auto load tracking dashboard
      setPortalPatient(data.patient);
      setPortalAppointments([data.appointment]);
      setPortalWaitingEntry(null);
      setPortalWaitMinutes(data.estimatedWaitMinutes);
      setSearchName(fullName);
      setSearchPhone(phone);
      setIsPortalLoaded(true);
      setActiveTab('track');
      
      // Load rest of history silently
      const trackResp = await fetch('/api/public/track-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone })
      });
      if (trackResp.ok) {
        const trackData = await trackResp.json();
        setPortalRecords(trackData.records || []);
        setPortalPrescriptions(trackData.prescriptions || []);
        setPortalFiles(trackData.files || []);
        setPortalWaitingEntry(trackData.currentWaitingEntry || null);
        setPortalWaitMinutes(trackData.estimatedWaitMinutes || 0);
      }

    } catch (err) {
      setIsSubmitting(false);
      onShowToast(isRtl ? 'خطأ في الاتصال بالخادم، يرجى المحاولة مرة أخرى' : 'Server connection error, please try again', 'error');
    }
  };

  // Inquire & track appointments with automated fallback guiding them to new booking with typed credentials (Requirement 3)
  const handleInquireBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchName || !searchPhone) {
      onShowToast(
        isRtl ? 'الرجاء إدخال الاسم ورقم الهاتف للاستعلام' : 'Please input your Full Name and Phone to inquire',
        'error'
      );
      return;
    }

    setIsSearching(true);
    setSearchNoBookingFound(false);
    try {
      const resp = await fetch('/api/public/track-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: searchName,
          phone: searchPhone
        })
      });

      const data = await resp.json();
      setIsSearching(false);

      if (resp.status === 404 || !resp.ok) {
        // Trigger visual workflow redirection when booking is not found (Requirement 3)
        setSearchNoBookingFound(true);
        onShowToast(
          isRtl 
            ? 'لم نجد أي حجز متطابق للبيانات المدخلة، يمكنك إنشاء حجز جديد للتو' 
            : 'No matching reservation found, choose option to register as new booking', 
          'error'
        );
        return;
      }

      onShowToast(
        isRtl ? 'تم العثور على ملفك المريض بنجاح!' : 'Patient file synchronized successfully!',
        'success'
      );

      setPortalPatient(data.patient);
      setPortalAppointments(data.appointments || []);
      setPortalRecords(data.records || []);
      setPortalPrescriptions(data.prescriptions || []);
      setPortalFiles(data.files || []);
      setPortalWaitingEntry(data.currentWaitingEntry || null);
      setPortalWaitMinutes(data.estimatedWaitMinutes || 0);
      setIsPortalLoaded(true);
      setSearchNoBookingFound(false);

    } catch (err) {
      setIsSearching(false);
      onShowToast(isRtl ? 'خطأ اتصال بالعيادة' : 'Error connecting to clinic database', 'error');
    }
  };

  // Convert follow-up previous prescription image upload into Base64 (Requirement 7)
  const handleBookingPrescriptionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrevPrescriptionFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPrevPrescriptionFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Guest upload scans inside portal
  const handlePortalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !portalPatient) return;

    const fileSizeStr = Math.round(file.size / 1024) + ' KB';
    const reader = new FileReader();
    reader.onloadend = async () => {
      const fileUrl = reader.result as string;

      try {
        const resp = await fetch('/api/public/upload-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: portalPatient.id,
            documentName: file.name,
            documentType: file.name.split('.').pop() || 'pdf',
            fileUrl,
            fileSize: fileSizeStr
          })
        });

        if (resp.ok) {
          onShowToast(
            isRtl ? 'تم رفع مستندك الطبي وحفظه بملفك بنجاح' : 'Medical document saved successfully',
            'success'
          );
          refreshPortalDataSilently();
        } else {
          onShowToast(isRtl ? 'فشل رفع المستند' : 'File upload failed', 'error');
        }
      } catch {
        onShowToast(isRtl ? 'خطأ رفع ملفات' : 'Error uploading file', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCancelAppointment = async (appId: string) => {
    if (!portalPatient) return;
    if (!window.confirm(isRtl ? 'هل أنت متأكد من رغبتك في إلغاء هذا الحجز؟' : 'Are you sure you want to cancel this scheduled appointment?')) {
      return;
    }

    try {
      const resp = await fetch('/api/public/cancel-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appId,
          phone: portalPatient.phone
        })
      });

      if (resp.ok) {
        onShowToast(isRtl ? 'تم إلغاء الموعد وتحديث جدول الطبيب بنجاح' : 'Appointment cancelled successfully', 'success');
        refreshPortalDataSilently();
      } else {
        const d = await resp.json();
        onShowToast(d.error || (isRtl ? 'فشل الغاء الموعد' : 'Failure cancelling appointment'), 'error');
      }
    } catch {
      onShowToast(isRtl ? 'خطأ في الاتصال بالعيادة' : 'Error connecting to clinic database', 'error');
    }
  };

  const handleExitPortal = () => {
    setPortalPatient(null);
    setPortalAppointments([]);
    setPortalRecords([]);
    setPortalPrescriptions([]);
    setPortalFiles([]);
    setPortalWaitingEntry(null);
    setPortalWaitMinutes(0);
    setIsPortalLoaded(false);
    setSearchName('');
    setSearchPhone('');
    setSearchNoBookingFound(false);
    onShowToast(isRtl ? 'تم الخروج من ملفك وتأمين معلوماتك السريّة بنجاح' : 'Securely cleared patient folder view', 'success');
  };

  // Helper function to smooth-scroll down to registration workspace (Requirement 2)
  const scrollToBooking = () => {
    const el = document.getElementById('booking-portal-anchor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveTab('book');
    }
  };

  // Automatically trigger redirection to new booking with fields prefilled (Requirement 3)
  const triggerRedirectionToNewBooking = () => {
    setFullName(searchName);
    setPhone(searchPhone);
    setActiveTab('book');
    setSearchNoBookingFound(false);
    onShowToast(
      isRtl ? 'جاري توجيهك لنموذج الحجز وتعبئة بيانات الاسم ورقم الهاتف تلقائياً...' : 'Directing to enrollment form and prefilling demographics...',
      'success'
    );
    setTimeout(() => {
      const el = document.getElementById('fullNameInput');
      if (el) el.focus();
    }, 450);
  };

  return (
    <div
      className="min-h-screen bg-[#f3f9f3] dark:bg-[#071320] text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans pb-16"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* 1. Medzoon Premium Header Bar (Top Navbar Matching Image Aesthetic) */}
      <div className="bg-gradient-to-r from-[#0a2540] to-[#12395c] text-white py-3.5 px-6 border-b border-blue-900/40 text-xs shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 font-sans tracking-wide">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="font-extrabold text-[#9cd6ff]">{isRtl ? 'بوابة الرعاية الفورية الحية لدور الانتظار والتشخيص' : 'LIVE APPOINTMENTS & QUEUE TICKETING'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 justify-center">
            <div className="flex items-center gap-2 text-slate-300 hover:text-white transition">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold font-mono text-[13px]">{isRtl ? 'الهاتف: 1500-546-7789+' : 'PHONE NUMBER: +1500-546-7789'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 hover:text-white transition">
              <Mail className="w-4 h-4 text-teal-400" />
              <span className="font-semibold font-mono text-[12px]">xyz@example.com</span>
            </div>
            
            {/* Direct Scroll to Booking button (Requirement 2) */}
            <button
              onClick={scrollToBooking}
              className="px-4.5 py-1.5 bg-[#4483e4] hover:bg-[#3273d4] text-white font-extrabold rounded-lg text-xs tracking-wide transition shadow-lg shadow-blue-500/20 uppercase"
            >
              {isRtl ? 'حجز تذكرة كشف فوري' : 'Book An Appointment'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sub Navbar Banner featuring navigation menus, options, and Hamburger button (Requirement 4) */}
      <nav className="sticky top-0 z-45 bg-[#1a3a5a]/95 dark:bg-slate-900/95 backdrop-blur-md text-white border-b border-blue-900/40 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Medzoon Logo styling */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white font-black text-xl tracking-tighter">
              M
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight flex items-center gap-1.5 font-sans">
                <span>{isRtl ? 'ميدزون' : 'Medzoon'}</span>
                <span className="text-xs bg-emerald-500 text-[#0a2540] py-0.5 px-2 rounded-full font-black font-mono">24/7</span>
              </h2>
              <p className="text-[10px] text-blue-200 uppercase tracking-widest font-mono font-bold">
                {isRtl ? 'أقسام الطوارئ الكارديولوجية المتقدمة' : 'CARDIOLOGY & ADVANCED DIAGNOSTICS'}
              </p>
            </div>
          </div>

          {/* Sub navbar option list matching image list precisely */}
          <div className="hidden lg:flex items-center gap-7 text-[#cadeee] text-xs font-black uppercase tracking-wider">
            <a href="#hero-banner-anchor" className="hover:text-white transition duration-150 border-b-2 border-transparent hover:border-[#4483e4] pb-1 cursor-pointer">{isRtl ? 'الرئيسية' : 'Home'}</a>
            <a href="#about-clinic-anchor" className="hover:text-white transition duration-150 border-b-2 border-transparent hover:border-[#4483e4] pb-1 cursor-pointer">{isRtl ? 'عن العيادة' : 'About Us'}</a>
            <a href="#solutions-anchor" className="hover:text-white transition duration-150 border-b-2 border-transparent hover:border-[#4483e4] pb-1 cursor-pointer">{isRtl ? 'الأقسام والخدمات' : 'Departments'}</a>
            <span onClick={scrollToBooking} className="hover:text-white transition duration-150 border-b-2 border-transparent hover:border-[#4483e4] pb-1 cursor-pointer">{isRtl ? 'نماذج الحجز الفوري' : 'Booking Center'}</span>
            <a href="#opening-anchor" className="hover:text-white transition duration-150 border-b-2 border-transparent hover:border-[#4483e4] pb-1 cursor-pointer">{isRtl ? 'مواعيد العمل' : 'Working Hours'}</a>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selection */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/50 hover:bg-slate-800/40 border border-blue-900/40 text-xs font-bold transition cursor-pointer"
            >
              <Languages className="w-4 h-4 text-sky-400" />
              <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* Dark/Light mode toggle */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-1.5 rounded-lg bg-blue-950/50 hover:bg-slate-800/40 border border-blue-900/40 transition cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-indigo-300" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Hamburger Button (Three lines) on top corner (Requirement 4) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-lg text-white hover:scale-105 active:scale-95 transition shadow-md shadow-blue-500/20 cursor-pointer"
              aria-label="Staff Menu"
            >
              {isMenuOpen ? <X className="w-5 h-5 text-amber-300" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hamburger Dropdown / Modal Overlay (Requirement 4) */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute left-0 right-0 z-40 bg-[#0d2238] border-b-2 border-blue-500 p-6 shadow-2xl text-white"
          >
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center gap-5">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] bg-sky-950 text-sky-300 font-extrabold font-mono border border-sky-850">STAFF LOGIN SUITE</span>
                <h3 className="text-base font-black text-white">{isRtl ? 'تسجيل دخول منسوبي عيادة ميدزون الطبية' : 'Identify & Log into Clinic Staff Workspace'}</h3>
                <p className="text-xs text-slate-400">{isRtl ? 'الرجاء اختيار بوابتك للمتابعة إلى ملفات المرضى' : 'Select your clinical role credentials pathway'}</p>
              </div>

              {/* Two buttons showing Dr. and Staff registration / login portals (Requirement 4) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onGoToLogin();
                  }}
                  className="p-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-3 transition shadow-lg cursor-pointer transform hover:-translate-y-0.5"
                >
                  <Users className="w-5 h-5" />
                  <div>
                    <h4 className="text-right font-black">{isRtl ? 'بوابة الموظف والاستقبال' : 'Receptionist Portal'}</h4>
                    <p className="text-[10px] text-slate-100 font-normal">{isRtl ? 'إدارة المواعيد المفتوحة والحجوزات ومكتب الوصول' : 'Lobby line checks & schedulers'}</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onGoToLogin();
                  }}
                  className="p-4 bg-gradient-to-r from-[#4483e4] to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-3 transition shadow-lg cursor-pointer transform hover:-translate-y-0.5"
                >
                  <Stethoscope className="w-5 h-5" />
                  <div>
                    <h4 className="text-right font-black">{isRtl ? 'بوابة الطبيب والاستشاري' : 'Doctor Portal Workspace'}</h4>
                    <p className="text-[10px] text-blue-100 font-normal">{isRtl ? 'استدعاء المريض، تدوين التشخيص وسجلات الرموز' : 'EHR diagnostics & Rx'}</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer mt-2"
              >
                ✕ {isRtl ? 'إغلاق القائمة' : 'Close Menu'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Immersive Blue Hero Showcase Banner (Designed exactly like the image) */}
      <section id="hero-banner-anchor" className="relative bg-gradient-to-b from-[#113251] to-[#1c5384] text-white py-16 md:py-24 px-6 overflow-hidden">
        {/* Background ambient pulse circle decorations to simulate premium visual interface */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/5 right-5 w-80 h-80 bg-emerald-500/5 rounded-full blur-2xl" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-right" dir={isRtl ? 'rtl' : 'ltr'}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black text-sky-200 bg-blue-950/60 border border-blue-800/55 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isRtl ? 'صحة، عناية وأمومة فائقة على مدار الساعة - Medzoon' : 'HEALTH & MEDICAL SYSTEM SERVICES'}</span>
            </span>
            
            {/* Visual alignment precisely matching the photo "Best Caring, Better Doctors" */}
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight uppercase font-sans">
              {isRtl ? (
                <>
                  أفضل رعاية صحية،<br />
                  <span className="text-[#5ca1ff]">أفضل أطباء كشوفات</span>
                </>
              ) : (
                <>
                  Best Caring,<br />
                  <span className="text-[#5ca1ff]">Better Doctors</span>
                </>
              )}
            </h1>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
              {isRtl
                ? 'مستشفى ميدزون التخصصي للقلب والباطنية يقدم أحدث طرق العلاج والتشخيص الرقمي المتكامل للملفات المرضية بدون كلمات مرور والتعرف اللحظي بمكالمة الاسم ورقم الهاتف ومتابعة وقت الانتظار دقيقة بدقيقة.'
                : 'Medzoon clinical division delivers exceptional outcomes of patient services with certified medical records and actual lobby estimation intervals. Experience the medicine with passwordless authentication.'}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {/* Button with scroll down interaction (Requirement 2) */}
              <button
                onClick={scrollToBooking}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 hover:shadow-xl hover:scale-102 text-white font-extrabold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>{isRtl ? 'حجز موعد مريض جديد' : 'New Appointment Book'}</span>
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </button>

              <a
                href="tel:4356709000"
                className="px-6 py-4 bg-slate-900/60 hover:bg-slate-900 border border-blue-900 text-white font-extrabold text-sm rounded-xl transition flex items-center gap-2.5"
              >
                <Phone className="w-4 h-4 text-[#5ca1ff]" />
                <span>+1(435)-670-9000</span>
              </a>
            </div>
          </div>

          {/* Doctor Portrait illustration box as represented in the image */}
          <div className="lg:col-span-5 flex justify-center scale-102 relative">
            <div className="w-72 h-72 md:w-80 md:h-80 rounded-full border-4 border-dashed border-sky-450 border-sky-400 absolute animate-spin" style={{ animationDuration: '40s' }} />
            
            <div className="relative w-64 h-64 md:w-72 md:h-72 bg-gradient-to-tr from-[#12304d] to-sky-850 rounded-full shadow-2xl overflow-hidden flex items-center justify-center border-4 border-[#5ca1ff]/40">
              <Stethoscope className="w-28 h-28 text-sky-400 animate-pulse duration-1000" />
              <div className="absolute inset-x-0 bottom-4 text-center bg-slate-950/80 mx-4 p-2.5 rounded-xl border border-blue-900">
                <p className="text-[11px] font-black">{isRtl ? 'البروفيسور استشاري أمراض القلب يوسف حكيم' : 'Prof. Joseph Hakim'}</p>
                <p className="text-[9px] text-[#5ca1ff]">{isRtl ? 'زمالة الكارديولوجي الأوروبية ESC' : 'European Cardiology Fellowship'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Elegant Overlapping Metric/Feature Banners sit below Hero Section (Matching Image Layout) */}
      <div className="max-w-7xl mx-auto px-6 -mt-10 md:-mt-12 relative z-25 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl hover:-translate-y-1 transition duration-200">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm md:text-base uppercase tracking-wider">{isRtl ? 'طوارئ واستدعاء طبي على مدار الساعة' : '24*7 Emergency Services'}</h3>
              <p className="text-[10px] text-blue-200">{isRtl ? 'خدمة إسعاف وتأمين دخول مباشر' : 'Immediate admission dispatch'}</p>
            </div>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed font-semibold">
            {isRtl ? 'قسم الطوارئ بمستشفى ميدزون مجهز بالكامل للرعاية المركزة وأزمات الشرايين تحت إشراف طاقمنا المتخصص لإنقاذ حالات الأزمات القلبية.' : 'High-fidelity cardiology response system with dedicated clinicians ready round-the-clock.'}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#173a5a] to-[#25527a] text-white shadow-xl hover:-translate-y-1 transition duration-200 border border-blue-900/30">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="p-3 bg-white/10 rounded-xl">
              <Users className="w-6 h-6 text-[#5ca1ff]" />
            </div>
            <div>
              <h3 className="font-black text-sm md:text-base uppercase tracking-wider">{isRtl ? 'استشاريون معتمدون دولياً' : 'Skilled Medical Professionals'}</h3>
              <p className="text-[10px] text-blue-200">{isRtl ? 'نخبة من الحاصلين على الزمالات الدولية' : 'Fellowship certified healthcare expert'}</p>
            </div>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed font-semibold">
            {isRtl ? 'يمتاز مستشارونا بالتحديث السنوي المعتمد للخبرة ولديهم سنوات طوال في المعاينة بمناظير الشرايين التاجية وعمليات القسطرة.' : 'Get the treatment path prescribed and tracked electronically under the counsel of prominent fellows.'}
          </p>
        </div>
      </div>

      {/* 5. "Extra Ordinary Health Solutions" department section (Matching Image Layout) */}
      <section id="solutions-anchor" className="max-w-7xl mx-auto px-6 mt-20 space-y-10">
        <div className="text-center space-y-2">
          <span className="text-[#4483e4] font-black uppercase text-xs tracking-widest">{isRtl ? 'الأقسام الطبية بالعيادة' : 'Our Department'}</span>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-blue-200 tracking-tight leading-none uppercase">
            {isRtl ? 'حلول صحية استثنائية وعيادات متكاملة' : 'Extra Ordinary Health Solutions'}
          </h2>
          <div className="w-20 h-1 bg-[#4483e4] mx-auto rounded-full mt-3" />
        </div>

        {/* Clinical solutions cards list (Four horizontal blocks exactly like the image) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Orthopedic Care Sector */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition duration-200 flex flex-col justify-between h-64 text-right">
            <div>
              <span className="text-[#4483e4] text-xs font-black font-mono block mb-1">01</span>
              <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase mb-2">{isRtl ? 'جراحة وتقويم العظام والعمود الفقري' : 'Orthopedic Care Sector'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                {isRtl ? 'علاج وتأهيل آلام الركبة والعمود الفقري والمفاصل والتشخيص بأحدث أجهزة التصوير الحركي للمفاصل.' : 'Advanced musculoskeletal treatments and cartilage reconstructions under fellows.'}
              </p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] text-blue-500 font-extrabold uppercase">{isRtl ? 'قراءة المزيد' : 'Learn More'}</span>
              <div className="p-2 bg-blue-50 dark:bg-slate-850 rounded-lg text-[#4483e4]">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 2: Dentistry Department */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition duration-200 flex flex-col justify-between h-64 text-right">
            <div>
              <span className="text-[#4483e4] text-xs font-black font-mono block mb-1">02</span>
              <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase mb-2">{isRtl ? 'طب وجراحة الفم والأسنان' : 'Dentistry Department'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                {isRtl ? 'زراعة وتقويم الأسنان بأحدث التقنيات الرقمية وتصميم الابتسامات الإستشارية بطرق آمنة لا ألم فيها.' : 'Cosmetic smile designs and tooth implantations with zero-pain anesthesia methods.'}
              </p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] text-blue-500 font-extrabold uppercase">{isRtl ? 'قراءة المزيد' : 'Learn More'}</span>
              <div className="p-2 bg-blue-50 dark:bg-slate-850 rounded-lg text-[#4483e4]">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 3: Neurology Department */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition duration-200 flex flex-col justify-between h-64 text-right">
            <div>
              <span className="text-[#4483e4] text-xs font-black font-mono block mb-1">03</span>
              <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase mb-2">{isRtl ? 'أمراض وجراحة المخ والأعصاب' : 'Neurology Department'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                {isRtl ? 'معالجة آلام الصداع النصفي المزمن والصرع وأمراض ضمور الأعصاب الطرفية بإشراف علمي متميز.' : 'Peripheral neuropathy therapies and cranial diagnostics using advanced EEG technology.'}
              </p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] text-blue-500 font-extrabold uppercase">{isRtl ? 'قراءة المزيد' : 'Learn More'}</span>
              <div className="p-2 bg-blue-50 dark:bg-slate-850 rounded-lg text-[#4483e4]">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 4: Cardiology Sector */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-1 transition duration-200 flex flex-col justify-between h-64 text-right">
            <div>
              <span className="text-[#4483e4] text-xs font-black font-mono block mb-1">04</span>
              <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase mb-2">{isRtl ? 'طب وجراحة القلب والشرايين' : 'Cardinology Sector'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                {isRtl ? 'عيادة متخصصة لمتابعة وقاية شرايين القلب وعمل تخطيط القلب المجهود وتصوير الإيكو الملوّن ثلاثي الأبعاد.' : 'Echocardiograms, stress test evaluations, and custom heart valve diagnostics.'}
              </p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] text-blue-500 font-extrabold uppercase">{isRtl ? 'قراءة المزيد' : 'Learn More'}</span>
              <div className="p-2 bg-blue-50 dark:bg-slate-850 rounded-lg text-[#4483e4]">
                <Heart className="w-5 h-5 text-rose-500" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 6. Professional Clinic Sectors & Working Hours (Opening Hours panel from the image) */}
      <section id="opening-anchor" className="max-w-7xl mx-auto px-6 mt-16 text-right">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-[#4483e4]" />
              <span>{isRtl ? 'مستعدون لتقديم كشوفات تشخيصية مميزة' : 'We Are Best Professional In Medical Sectors'}</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              {isRtl ? 'تعتبر عيادة ميدزون الرائدة للرعاية الاستشارية بالمملكة العربية السعودية لأننا نوائم التشخيص المنهجي السليم مع سرعة دور الكشف الفوري وتوفير سبل الدقة الكاملة بملف المريض اللحظي.' : 'With highly sophisticated lab equipment and direct consultation networks, Hakim digital portal ensures the patient achieves optimal diagnostic counseling safely.'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-3 bg-blue-50/50 dark:bg-slate-950/30 rounded-xl border text-center">
                <h4 className="text-lg font-black text-blue-600 dark:text-blue-400">99%</h4>
                <p className="text-[9px] text-[#4483e4] tracking-wider uppercase">{isRtl ? 'نسبة الشفاء ونجاح العلاجات' : 'Success index'}</p>
              </div>
              <div className="p-3 bg-blue-50/50 dark:bg-slate-950/30 rounded-xl border text-center">
                <h4 className="text-lg font-black text-blue-600 dark:text-blue-400">20+</h4>
                <p className="text-[9px] text-[#4483e4] tracking-wider uppercase">{isRtl ? 'سنة من الممارسة الطبية' : 'Clincial years'}</p>
              </div>
              <div className="p-3 bg-blue-50/50 dark:bg-slate-950/30 rounded-xl border text-center">
                <h4 className="text-lg font-black text-blue-600 dark:text-blue-400">10k+</h4>
                <p className="text-[9px] text-[#4483e4] tracking-wider uppercase">{isRtl ? 'مريض مسجل مشفر' : 'Patient logs'}</p>
              </div>
              <div className="p-3 bg-blue-50/50 dark:bg-slate-950/30 rounded-xl border text-center">
                <h4 className="text-lg font-black text-blue-600 dark:text-blue-400">0%</h4>
                <p className="text-[9px] text-[#4483e4] tracking-wider uppercase">{isRtl ? 'أخطاء بمطابقة كلمات المرور' : 'Error index'}</p>
              </div>
            </div>
          </div>

          {/* Opening Hours widgets represented in the blue bento box */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-lg space-y-4">
            <span className="text-[10px] bg-slate-950/40 text-sky-200 py-1 px-3 rounded font-bold uppercase block w-max">{isRtl ? 'جدول العيادات الأسبوعي' : 'OPENING HOURS'}</span>
            <div className="divide-y divide-white/20 text-xs">
              <div className="py-2.5 flex justify-between">
                <span>{isRtl ? 'الإثنين - الخميس' : 'Mon - Thu'}</span>
                <span className="font-bold">8:00 AM - 10:00 PM</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span>{isRtl ? 'الجمعة' : 'Friday'}</span>
                <span className="font-bold">8:00 AM - 6:00 PM</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span>{isRtl ? 'السبت - الأحد' : 'Sat - Sun'}</span>
                <span className="font-bold">10:00 AM - 8:00 PM</span>
              </div>
            </div>
            <div className="pt-2 text-center bg-white/10 p-2.5 rounded-lg border border-white/20">
              <p className="text-[10px] font-black">{isRtl ? 'الإستشارات مستمرة وطوارئ القلب ٢٤ ساعة' : 'Cardic emergency open 24*7 emergency care'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Anchor point for automatic smooth-scrolling from hero (Requirement 2) */}
      <div id="booking-portal-anchor" className="scroll-mt-24" />

      {/* 7. Bottom Section: Self-Booking & Inquiry workspace */}
      <main className="max-w-4xl mx-auto px-6 mt-16">
        <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/10 rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
          
          {/* If Patient Portal is query loaded */}
          {isPortalLoaded && portalPatient ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">
                      {isRtl ? 'بوابة المريض المفتوحة' : 'OPEN SECURE GUEST PORTAL'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {isRtl ? `أهلاً بك، المريض: ${portalPatient.fullName}` : `Welcome, Patient: ${portalPatient.fullName}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isRtl ? `رقم هاتف الملف المعتمد: ${portalPatient.phone}` : `Authorized phone: ${portalPatient.phone}`}
                  </p>
                </div>
                
                <button
                  onClick={handleExitPortal}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 rounded-xl transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'الخروج وتأمين الملف' : 'Lock & Clear Screen'}</span>
                </button>
              </div>

              {/* Waiting Room Live Ticker with Estimation Minutes */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/60 shadow-inner space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>{isRtl ? 'حالة الحجز ووقت الانتظار الفعلي' : 'Lobby Wait-Time & Position'}</span>
                  </span>
                  
                  <button
                    onClick={() => {
                      onShowToast(isRtl ? 'جاري تحديث البيانات وحساب وقت المعاينة المتبقي...' : 'Refreshing queue state...', 'success');
                      refreshPortalDataSilently();
                    }}
                    className="p-1 px-2.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 hover:bg-slate-50 text-[10px] text-blue-600 font-bold flex items-center gap-1 transition"
                  >
                    <RefreshCw className="w-3" />
                    <span>{isRtl ? 'تحديث تلقائي' : 'Refresh'}</span>
                  </button>
                </div>

                {portalWaitingEntry ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-5 text-center p-3 rounded-xl bg-white/80 dark:bg-slate-950/80 border border-teal-100 dark:border-teal-900">
                      <p className="text-2xs text-slate-400 uppercase tracking-widest font-bold">
                        {isRtl ? 'رقم حجز اليوم بالعيادة' : 'LOBBY SLOT'}
                      </p>
                      <h3 className="text-3xl font-black text-[#4483e4] dark:text-blue-400 mt-1">
                        #{portalWaitingEntry.queueNumber}
                      </h3>
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 mt-2">
                        {portalWaitingEntry.status === 'in_consultation' 
                          ? (isRtl ? 'جاري الفحص الآن' : 'IN CLINIC INSPECTION') 
                          : (isRtl ? 'منتظر في الاستراحة' : 'WAITING IN LOBBY')}
                      </span>
                    </div>

                    <div className="md:col-span-7 space-y-2 text-right">
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        {isRtl 
                          ? 'لقد سجل منسق الاستقبال حالة وصولك وحضورك بالعيادة. حالة دور الانتظار لدخولك المعاينة:' 
                          : 'Your ticket is actively queued in today\'s lobby. Based on active clinical examinations:'}
                      </p>
                      
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg text-blue-600 font-extrabold text-sm font-mono animate-bounce">
                          {portalWaitMinutes}
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-xs text-slate-850 dark:text-slate-200">
                            {isRtl ? 'الوقت المقدر لدخولك المعاينة' : 'Estimated Remaining Wait'}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                            {portalWaitMinutes === 0
                              ? (isRtl ? 'دورك الآن! تفضل بالدخول لعيادة الطبيب مروان مروة.' : 'Your turn is starting now! Go inside.')
                              : (isRtl ? `حوالي ${portalWaitMinutes} دقيقة متبقية وفقاً لتقدم الدور الحالي.` : `approx. ${portalWaitMinutes} mins remaining to inspection.`)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : portalAppointments.some(a => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.date) >= new Date(new Date().setHours(0,0,0,0))) ? (
                  (() => {
                    const upcomingApp = portalAppointments.find(a => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.date) >= new Date(new Date().setHours(0,0,0,0)));
                    return (
                      <div className="space-y-3 text-right">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>
                            {isRtl 
                              ? `لديك موعد قادم بتاريخ ${upcomingApp.date} في تمام الساعة ${upcomingApp.timeSlot}` 
                              : `Upcoming Reservation on ${upcomingApp.date} at ${upcomingApp.timeSlot}`}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-1">
                          <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/60 rounded-xl">
                            <h4 className="font-extrabold text-2xs text-slate-400 uppercase tracking-wider">
                              {isRtl ? 'رقم دورك المقدر باليوم' : 'SCHEDULED QUEUE POSITION'}
                            </h4>
                            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                              #{upcomingApp.queueNumber || '1'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                              {isRtl 
                                ? 'سيتم تفعيل دور الطابور لك فور تسجيل موظف الاستقبال وصولك بالعيادة.' 
                                : 'Assigned queue order. This is active once receptionist checks you in.'}
                            </p>
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/60 rounded-xl">
                            <h4 className="font-extrabold text-2xs text-slate-400 uppercase tracking-wider">
                              {isRtl ? 'التوقيت المفضل المبرمج لعلاجك' : 'CHOSEN BOOKING SLOT'}
                            </h4>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                              {upcomingApp.timeSlot}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                              {isRtl 
                                ? 'يرجى تقديم هويتك واسمك الطقسي لموظف التنسيق عند الوصول.'
                                : 'Please hand in your registration name at arrival desk.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-xs text-rose-500 font-bold">
                      {isRtl ? 'لا يوجد لك أي مواعيد نشطة مفعلة اليوم عيادة ميدزون.' : 'No active appointments recorded today.'}
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('book');
                        setFullName(portalPatient.fullName);
                        setPhone(portalPatient.phone);
                        setIsPortalLoaded(false);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'حجز موعد جديد الآن' : 'Schedule a New Appointment Now'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Patient records portfolio data */}
              <div className="space-y-5 text-right">
                
                {/* Clinical Consultations Logs */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isRtl ? 'سجل المعاينات والتشخيصات السابقة' : 'Consultation Visits History'}</span>
                  </h3>

                  {portalRecords.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      {isRtl ? 'لم يتم توثيق أي سجل كشف من الطبيب حتى الآن.' : 'No clinical records chartered yet.'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {portalRecords.map((r) => (
                        <div key={r.id} className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                            <span>{isRtl ? `تاريخ الزيارة: ${r.date}` : `Date: ${r.date}`}</span>
                            <span className="font-bold text-indigo-500">#{r.id}</span>
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-500">{isRtl ? 'الأعراض المبدئية' : 'Symptoms'}</p>
                            <p className="text-xs text-slate-700 dark:text-slate-350 mt-0.5">{r.symptoms}</p>
                          </div>
                          <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400">{isRtl ? 'التشخيص الطبي العيادي' : 'Diagnosis'}</p>
                              <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{r.diagnosis}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400">{isRtl ? 'البروتوكول والخطة العلاجية' : 'Instructions'}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{r.treatmentPlan}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Digital Prescriptions */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isRtl ? 'الروشتات والوصفات الطبية الإلكترونية' : 'Digital Prescriptions (Rx Slot)'}</span>
                  </h3>

                  {portalPrescriptions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      {isRtl ? 'لا يوجد أي روشتة طبية صادرة وموقعة إلكترونياً.' : 'No clinical prescriptions saved.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {portalPrescriptions.map((pr) => (
                        <div key={pr.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl flex justify-between items-center">
                          <div>
                            <p className="text-xs font-extrabold text-slate-800 dark:text-white">
                              {isRtl ? 'روشتة الكترونية رقم' : 'Rx ID'}
                            </p>
                            <span className="font-mono text-[10px] text-slate-400">{pr.date} • {pr.id}</span>
                          </div>
                          <button
                            onClick={() => setSelectedPrescription(pr)}
                            className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:scale-105 transition text-blue-600 text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>{isRtl ? 'الروشتة' : 'View'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Laboratory Scans Portfolio */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <Upload className="w-3.5 h-3.5 text-blue-500" />
                    <span>{isRtl ? 'الأشعة، تقارير المعامل والمرفقات المعتمدة بالملف' : 'EHR Document & Laboratory Reports'}</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {portalFiles.map((f) => (
                      <div key={f.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 rounded-xl flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{f.documentName}</p>
                          <span className="text-[9px] text-slate-400 uppercase">{f.documentType} • {f.fileSize}</span>
                        </div>
                        <a
                          href={f.fileUrl}
                          download={f.documentName}
                          className="px-2 py-0.5 bg-white dark:bg-slate-900 border text-[10px] font-bold text-blue-600 rounded"
                        >
                          {isRtl ? 'تحميل' : 'Download'}
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* Portal image scan drag input */}
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center bg-slate-55/30 bg-slate-50 dark:bg-slate-950/20">
                    <label className="cursor-pointer block space-y-1">
                      <Upload className="w-5 h-5 mx-auto text-blue-500 transition duration-150" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {isRtl ? 'اضغط لرفع أشعة أو تحليل طبي جديد لحفطه بالملف بسلام' : 'Upload lab scan or radiology PDF/Image'}
                      </p>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handlePortalFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Scheduled Bookings History */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isRtl ? 'الحجوزات النشطة وتذاكر الكشوفات' : 'My Dynamic Booking History'}</span>
                  </h3>

                  <div className="space-y-2">
                    {portalAppointments.map((app) => (
                      <div key={app.id} className="p-3 bg-white dark:bg-slate-950 border rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-black">{isRtl ? `تاريخ الموعد: ${app.date}` : `Date: ${app.date}`}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {isRtl ? `توقيت المعاينة: ${app.timeSlot}` : `Time Slot: ${app.timeSlot}`} • {isRtl ? `رقم الدور باليوم: #${app.queueNumber}` : `Daily number: #${app.queueNumber}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            app.status === 'pending'
                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : app.status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-300 animate-pulse'
                              : app.status === 'completed'
                              ? 'bg-slate-100 text-slate-450 text-slate-500 border-slate-300'
                              : 'bg-rose-100 text-rose-700 border-rose-300'
                          }`}>
                            {app.status === 'pending' && (isRtl ? 'انتظار التأكيد' : 'PENDING')}
                            {app.status === 'confirmed' && (isRtl ? 'تم التأكيد والحضور' : 'CONFIRMED')}
                            {app.status === 'completed' && (isRtl ? 'مكتمل ومعاين' : 'COMPLETED')}
                            {app.status === 'cancelled' && (isRtl ? 'ملغي' : 'CANCELLED')}
                          </span>

                          {(app.status === 'pending' || app.status === 'confirmed') && (
                            <button
                              onClick={() => handleCancelAppointment(app.id)}
                              className="px-2 py-1 text-[10px] bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{isRtl ? 'إلغاء الموعد' : 'Cancel'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Tab Selector for Guest (Enrollment Form vs Inquiry Portal Options) */
            <div className="space-y-6">
              <div className="flex border-b border-slate-100 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('book');
                    setSearchNoBookingFound(false);
                  }}
                  className={`flex-1 py-3 text-center text-xs font-black rounded-lg transition-all duration-200 select-none cursor-pointer flex justify-center items-center gap-2 ${
                    activeTab === 'book'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-black border border-slate-200/30'
                      : 'text-slate-450 hover:text-slate-650 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>{isRtl ? 'حجز موعد مريض جديد' : 'New Appointment Book'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('track');
                    setSearchNoBookingFound(false);
                  }}
                  className={`flex-1 py-3 text-center text-xs font-black rounded-lg transition-all duration-200 select-none cursor-pointer flex justify-center items-center gap-2 ${
                    activeTab === 'track'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-black border border-slate-200/30'
                      : 'text-slate-450 hover:text-slate-650 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>{isRtl ? 'الاستعلام وتتبع طابور الموعد' : 'Track Booking & Wait Time'}</span>
                </button>
              </div>

              {activeTab === 'book' ? (
                /* Patient Intake self-registration form (Requirement 2) */
                <form onSubmit={handlePublicBooking} className="space-y-5 text-right">
                  <div className="text-center pb-2">
                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md uppercase tracking-wider font-mono">
                      {isRtl ? 'حجز موعد فوري بالعيادة' : 'APPOINTMENT REGISTRATION'}
                    </span>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">
                      {isRtl ? 'تسجيل البيانات الطبية للحجز التلقائي دور الحكيم' : 'Register Demographics & Lock Active Appointment Hour'}
                    </h3>
                  </div>

                  {/* Profile demographics fields (Requirement 2) */}
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-450 text-slate-400 block pb-2 border-b">
                      <User className="w-4.5 h-4.5 text-blue-500" />
                      <span>{isRtl ? 'الخطوة 1: البيانات الديموغرافية والاتصال' : '1. Demographic details'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-505 text-slate-500 block">
                          {isRtl ? 'الاسم بالكامل للمريض' : 'Patient Full Name'} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="fullNameInput"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={isRtl ? 'أدخل الاسم الثلاثي' : 'e.g. Samir Al-Mansour'}
                          className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-505 text-slate-500 block">
                          {isRtl ? 'رقم الهاتف الجوال (إشعارات واستعلام)' : 'Direct Phone Number'} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +966-501-123-456"
                          className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-505 text-slate-500 block">
                          {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@email.com"
                          className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none transition font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-extrabold text-slate-505 text-slate-505 text-slate-550 dark:text-slate-405 text-slate-500 block">
                            {isRtl ? 'العمر' : 'Age'}
                          </label>
                          <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="42"
                            className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-extrabold text-slate-505 text-slate-500 block">
                            {isRtl ? 'الجنس' : 'Gender'}
                          </label>
                          <select
                            value={gender}
                            onChange={(e: any) => setGender(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                          >
                            <option value="male">{isRtl ? 'ذكر' : 'Male'}</option>
                            <option value="female">{isRtl ? 'أنثى' : 'Female'}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-505 text-slate-500 block">
                        {isRtl ? 'العنوان الوطني أو السكني بالكامل' : 'National Address'}
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={isRtl ? 'المدينة، الحي تفصيلاً' : 'Riyadh, Saudi Arabia'}
                        className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Pathological chronic diseases entries (Requirement 2) */}
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 block pb-2 border-b">
                      <Heart className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
                      <span>{isRtl ? 'الخطوة 2: الأمراض المزمنة والأدوية المستعملة' : '2. Chronic Diseases & Medications'}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-500 block">
                          {isRtl ? 'الأمراض المزمنة الحالية للمريض' : 'Chronic Diseases'}
                        </label>
                        <input
                          type="text"
                          value={chronicDiseases}
                          onChange={(e) => setChronicDiseases(e.target.value)}
                          placeholder={isRtl ? 'مثال: ضغط، سكري، كوليسترول...' : 'Hypertension, Diabetes etc'}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-500 block">
                          {isRtl ? 'حساسية تجاه عقاقير معينة' : 'Drug Allergies'}
                        </label>
                        <input
                          type="text"
                          value={allergies}
                          onChange={(e) => setAllergies(e.target.value)}
                          placeholder={isRtl ? 'مثال: البنسلين، أسبيرين...' : 'Allergies details'}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-500 block">
                          {isRtl ? 'الأدوية التي يتناولها بصفة منتظمة' : 'Current active medications'}
                        </label>
                        <input
                          type="text"
                          value={currentMedications}
                          onChange={(e) => setCurrentMedications(e.target.value)}
                          placeholder={isRtl ? 'مثال: كونكور، أسبرين أطفال...' : 'Taking daily medicines'}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Requirement 7: Re-check / Follow-up upload & details feature */}
                  <div className="p-5 rounded-2xl bg-sky-50/50 dark:bg-blue-950/20 border-2 border-sky-200/50 dark:border-blue-900/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4.5 h-4.5 text-blue-500" />
                        <div>
                          <h4 className="text-xs font-black text-blue-800 dark:text-blue-300">{isRtl ? 'هل هذا الموعد لإعادة الكشف؟' : 'Is this a Follow-Up Consultation?'}</h4>
                          <p className="text-[10px] text-slate-550 text-slate-500">{isRtl ? 'تفعيل مزايا رفع تفاصيل وصور الوشتات القديمة بملفك الطبي' : 'Enable prior prescription image upload and transcription tools'}</p>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setIsFollowUp(!isFollowUp)}
                        className={`px-4 py-1.5 rounded-lg text-2xs font-extrabold uppercase transition border ${
                          isFollowUp 
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm' 
                            : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        {isFollowUp ? (isRtl ? 'نعم - إعادة كشف' : 'YES, FOLLOW-UP') : (isRtl ? 'كلا، كشف جديد' : 'NO, FIRST INTAKE')}
                      </button>
                    </div>

                    <AnimatePresence>
                      {isFollowUp && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-4.5 pt-4 border-t border-sky-200/45 dark:border-blue-900/40 overflow-hidden text-right"
                        >
                          {/* Manual Prescription Details transcription text box */}
                          <div className="space-y-1">
                            <label className="text-xs font-extrabold text-blue-800 dark:text-blue-300 block">
                              {isRtl ? 'تفاصيل الروشتة السابقة (الأدوية الموصوفة والتعليمات)' : 'Transcribe Previous Prescription Details'}
                            </label>
                            <textarea
                              value={prevPrescriptionText}
                              onChange={(e) => setPrevPrescriptionText(e.target.value)}
                              placeholder={isRtl ? 'مثال: بندول ٥٠٠ ملغ حبة كل ٨ ساعات، شراب كحة ملعقة بعد الغداء...' : 'Panadol 500mg, Cough syrup 1 Spoon daily etc.'}
                              rows={2.5}
                              className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          {/* Image uploader wrapper for previous prescription photography */}
                          <div className="space-y-1">
                            <label className="text-xs font-extrabold text-blue-800 dark:text-blue-300 block">
                              {isRtl ? 'رفع صورة الروشتة السابقة المعتمدة للعيادة' : 'Upload Previous Prescription Photograph / Medical Attachment'}
                            </label>
                            <div className="p-4 border-2 border-dashed border-sky-305 border-sky-300/60 dark:border-blue-800/60 rounded-xl text-center bg-white dark:bg-slate-900">
                              <label className="cursor-pointer block space-y-1.5">
                                <Upload className="w-7 h-7 mx-auto text-blue-500 animate-bounce" />
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {isRtl ? 'اضغط هنا لرفع صورة الروشتة الحرة من هاتفك أو كاميرتك' : 'Select prescription image file'}
                                </p>
                                <p className="text-[10px] text-slate-400">supports: JPG, PNG, WEBP, PDF up to 4MB</p>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={handleBookingPrescriptionUpload}
                                  className="hidden"
                                />
                              </label>
                              
                              {prevPrescriptionFileName && (
                                <div className="mt-3.5 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-lg text-emerald-600 font-extrabold text-2xs flex items-center justify-center gap-1">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span>{isRtl ? 'تم تحميل الروشتة بنجاح:' : 'Loaded: '} {prevPrescriptionFileName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Section 3: Time Slot choose calendar dates */}
                  <div className="space-y-4 p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-150 border-emerald-200/50 dark:border-emerald-900/40">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#1a5f4c] dark:text-emerald-400 block pb-2 border-b">
                      <Calendar className="w-4.5 h-4.5 text-emerald-500" />
                      <span>{isRtl ? 'الخطوة 3: تاريخ الموعد وساعة الكشف المتوفرة' : '3. Choose Appointment Date & Vacant Slot'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 text-right">
                        <label className="text-xs font-extrabold text-slate-505 text-slate-500 block">
                          {isRtl ? 'تحديد تاريخ الزيارة الكشفية' : 'Appointment date'} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                        />
                      </div>

                      <div className="space-y-1 text-right">
                        <label className="text-xs font-extrabold text-slate-505 text-slate-500 block">
                          {isRtl ? 'الساعة المناسبة للمعاينة' : 'Time hour'} <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                        >
                          {timeslots.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-xs font-extrabold text-slate-500 block">
                        {isRtl ? 'سبب الزيارة للعيادة (الشكوى بكلماتك)' : 'Reason for Visit / Complaint'}
                      </label>
                      <textarea
                        value={bookingReason}
                        onChange={(e) => setBookingReason(e.target.value)}
                        placeholder={isRtl ? 'مثال: متابعة روتينية، ألم في القفص الصدري، إعادة كشف علاج الضغط...' : 'General checkup...'}
                        rows={2}
                        className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none transition"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-right">
                      <input
                        type="checkbox"
                        id="urgentBooking"
                        checked={isUrgent}
                        onChange={(e) => setIsUrgent(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4.5 h-4.5"
                      />
                      <label htmlFor="urgentBooking" className="text-2xs font-bold text-rose-500 cursor-pointer user-select-none">
                        {isRtl ? 'الحالة طارئة ومستعجلة للغاية (أعاني من أزمة صدرية حادة أو ألم طارئ بالقلب)' : 'Mark as Urgent: Prioritize queue position due to chest pain'}
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl text-white font-extrabold rounded-xl transition duration-150 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider text-sm cursor-pointer shadow-lg shadow-blue-500/10"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>{isRtl ? 'حفظ البيانات وتأكيد قيد الحجز الآن' : 'Save Demographic details & Lock My Turn'}</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Inquiry Track Appointment & waiting queue estimation duration */
                <form onSubmit={handleInquireBooking} className="space-y-5 text-right">
                  <div className="text-center pb-2">
                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md uppercase tracking-wider font-mono">
                      {isRtl ? 'الاستعلام الفوري وطابور المريض' : 'LIVE LOBBY DECODING'}
                    </span>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">
                      {isRtl ? 'تتبع دورك والوصفات الطبية كتابةً بدون كلمة مرور' : 'Check estimated wait cycles and reprint secure Rx'}
                    </h3>
                  </div>

                  {/* Redirection banner when booking doesn't exist (Requirement 3) */}
                  {searchNoBookingFound && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-200 text-right space-y-4 shadow-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-rose-800 dark:text-rose-400">
                            {isRtl ? 'لم نعثر على أي حجز مسجل مسبقاً!' : 'No Active Appointment Found!'}
                          </h4>
                          <p className="text-xs text-rose-600 mt-1 leading-relaxed">
                            {isRtl 
                              ? `عذراً، لم نتمكن من تحديد أي حجز بالاسم [${searchName}] والهاتف [${searchPhone}]. هل تود أن نوجهك فوراً لحجز موعد جديد وبدء تسجيل الكشف؟`
                              : `We could not find any clinical ledger matches for ${searchName}. Would you like to use these typed details to begin a new booking schedule?`}
                          </p>
                        </div>
                      </div>

                      {/* Giant redirection call-out button (Requirement 3) */}
                      <button
                        type="button"
                        onClick={triggerRedirectionToNewBooking}
                        className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer cursor-pointers"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        <span>{isRtl ? 'نعم، قم بتوجيهي لإنشاء حجز جديد وتلقين بياناتي' : 'Yes, direct me to new booking registration'}</span>
                      </button>
                    </motion.div>
                  )}

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#091523]/40 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-505 text-slate-550 dark:text-slate-400 text-slate-500 block">
                        {isRtl ? 'الاسم بالكامل للمريض المسجل لدور الحجز' : 'Registered Patient Full Name'}
                      </label>
                      <div className="relative">
                        <User className="w-4 h-3.5 absolute top-3.5 left-3 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={searchName}
                          onChange={(e) => setSearchName(e.target.value)}
                          placeholder={isRtl ? 'مثال: سامي أحمد الرويلي' : 'e.g. Ahmad Mansour'}
                          className={`w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition ${isRtl ? 'pr-3 pl-10' : 'pl-10 pr-3'}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-505 text-slate-550 dark:text-slate-400 text-slate-500 block">
                        {isRtl ? 'رقم الهاتف الجوال المرتبط بملف الحجز' : 'Approved Mobile Phone'}
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-3.5 absolute top-3.5 left-3 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={searchPhone}
                          onChange={(e) => setSearchPhone(e.target.value)}
                          placeholder="e.g. +966-501-234-567"
                          className={`w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition font-mono ${isRtl ? 'pr-3 pl-10' : 'pl-10 pr-3'}`}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl text-white font-extrabold rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-blue-500/15"
                  >
                    {isSearching ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>{isRtl ? 'بحث واستخلاص دور الانتظار وحقيبتي الطبية' : 'Inquire & Track Live Queue Wait Time'}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Structured digital prescription printable card viewer (Modal Dialog) */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white text-slate-950 p-6 md:p-8 rounded-2xl shadow-2xl border-4 border-slate-100 dark:border-slate-300 font-sans text-right" dir="rtl">
            <button
              onClick={() => setSelectedPrescription(null)}
              className="absolute top-4 left-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-black text-sm select-none transition cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b-4 border-emerald-600 pb-4 text-center space-y-1">
              <h2 className="text-xl font-extrabold text-emerald-700 tracking-tight flex items-center justify-center gap-2">
                <Stethoscope className="w-6 h-6 text-emerald-600" />
                <span>عيادة د. يوسف حكيم الاستشارية لأمراض القلب والباطنية</span>
              </h2>
              <p className="text-xs text-slate-500">منظومة الرعاية والتشخيص الرقمي المتكاملة • هاتف: 011-4029281 • الرياض، المملكة العربية السعودية</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs bg-slate-50 px-3 rounded-xl border border-slate-200 mt-4 leading-relaxed">
              <div className="space-y-1">
                <p><strong>اسم المريض:</strong> {portalPatient?.fullName || selectedPrescription.patientName}</p>
                <p><strong>رقم المريض:</strong> {selectedPrescription.patientId}</p>
                <p><strong>العمر:</strong> {portalPatient?.age || 'غير محدد'} سنة</p>
              </div>
              <div className="space-y-1 sm:text-left">
                <p><strong>رقم الروشتة:</strong> <span className="font-mono font-bold text-indigo-600">#{selectedPrescription.id}</span></p>
                <p><strong>التاريخ المعتمد:</strong> {selectedPrescription.date}</p>
                <p><strong>الطبيب المعاين:</strong> {selectedPrescription.doctorName || 'د. يوسف حكيم'}</p>
              </div>
            </div>

            <div className="text-2xl font-black text-emerald-600 mt-6 font-serif">Rₓ</div>

            <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-right leading-relaxed">
                <thead className="bg-slate-100 text-slate-700 font-extrabold">
                  <tr>
                    <th className="p-2.5">{isRtl ? 'اسم المستحضر الصيدلاني (الجنريك)' : 'Medicine Name'}</th>
                    <th className="p-2.5">{isRtl ? 'الجرعة المقررة' : 'Dosage'}</th>
                    <th className="p-2.5">{isRtl ? 'التكرار والتعليمات' : 'Frequency'}</th>
                    <th className="p-2.5">{isRtl ? 'فترة الاستخدام' : 'Days course'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedPrescription.medicines?.map((med: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-900">{med.name}</td>
                      <td className="p-2.5 font-mono">{med.dosage}</td>
                      <td className="p-2.5 text-slate-700">{med.frequency}</td>
                      <td className="p-2.5 font-bold text-emerald-600">{med.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedPrescription.notes && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-slate-700 text-xs leading-relaxed">
                <strong>ملاحظات صيدلانية إضافية من العيادة:</strong>
                <p className="mt-1">{selectedPrescription.notes}</p>
              </div>
            )}

            <div className="mt-8 flex justify-between items-end border-t border-slate-200 pt-6">
              <div className="space-y-0.5 text-2xs text-slate-400 font-mono">
                <p>HAKIM DIGITAL CLINIC RX RECORD SYSTEM</p>
                <p>تم استخراج وتوقيع هذه الوصفة رقمياً ومشاركتها مع الصيدليات المتعاونة</p>
              </div>

              <div className="text-center border-2 border-emerald-600/50 p-2 px-4 rounded-xl rotate-[-2deg] bg-emerald-50/30">
                <p className="text-[10px] text-emerald-700 font-black tracking-widest uppercase">APPROVED DR. J. HAKIM</p>
                <p className="text-[9px] text-emerald-500 font-mono mt-0.5 font-bold">ESC European Fellow</p>
                <div className="w-16 h-0.5 bg-emerald-500 mx-auto mt-1" />
                <p className="text-[8px] text-slate-400 mt-0.5">توقيع معتمد آلياً</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-150 pt-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isRtl ? 'طـباعة الروشتة الحالية' : 'Print Recipe'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPrescription(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {isRtl ? 'إغلاق المعاينة' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trust Accreditations Footer Section */}
      <footer className="mt-16 text-center max-w-4xl mx-auto px-6 text-xs text-slate-450 text-slate-500 dark:text-slate-400 font-mono space-y-1.5 border-t border-slate-200/50 dark:border-slate-800/60 pt-6">
        <p>© 2026 MEDZOON HOSPITALS & SECURE CLINICS. ALL RIGHTS RESERVED.</p>
        <p>{isRtl ? 'نظام مشفر بالكامل ومتوافق مع أعلى مستويات الأمان والسرية الطبية. رعاية استشارية متميزة بقيادة د. يوسف حكيم.' : 'End-to-end encrypted clinical database system designed for secure consultation logs.'}</p>
        <div className="flex justify-center gap-4 text-[10px] text-blue-500 font-bold uppercase pt-1">
          <span>{isRtl ? 'السرية الطبية ومكافحة التزييف' : 'Medical Integrity Shield'}</span>
          <span>•</span>
          <span>{isRtl ? 'إشعار فوري واتساب و SMS' : 'SMS & Whatapp Notifications Dispatched'}</span>
        </div>
      </footer>
    </div>
  );
}
