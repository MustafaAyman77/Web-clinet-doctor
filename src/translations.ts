/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const TRANSLATIONS = {
  ar: {
    // Brand & General
    appTitle: 'نظام الحكيم لإدارة العيادات الطبية',
    doctorRole: 'طبيب معالج',
    receptionistRole: 'موظف استقبال',
    patientRole: 'حساب المريض',
    logout: 'تسجيل الخروج',
    welcomeBack: 'مرحباً بك مجدداً',
    realtimeClock: 'الوقت والتدقيق المباشر',
    themeLight: 'الوضع الفاتح',
    themeDark: 'الوضع الداكن',
    successToast: 'تمت العملية بنجاح',
    errorToast: 'حدث خطأ أثناء المعالجة',

    // Sec/Auth Screen
    loginHeader: 'البوابة الطبية الآمنة للعيادة',
    loginSubtitle: 'يرجى إدخال بيانات الاعتماد للاتصال بالخادم المشفر',
    usernameLabel: 'اسم المستخدم',
    passwordLabel: 'كلمة المرور',
    loginButton: 'تسجيل الدخول',
    demologsTitle: 'بيانات الاعتماد للتجربة والتجريب التجاري',
    twoFAHeader: 'رمز التحقق الثنائي (2FA)',
    twoFASubtitle: 'يرجى إدخال الرمز المكون من 6 أرقام لتجاوز المصادقة الأمنية',
    verificationCode: 'رمز التأكيد',
    verifyButton: 'تأكيد الرمز',
    twoFADemoTip: 'رمز التجربة السريع هو: 123456 أو 779977',

    // Security Tab & Audit Logs
    securityShield: 'درع الحماية والتدقيق المباشر',
    auditLogsTitle: 'سجل عمليات الأمان والوصول (Audit Logs)',
    auditLogsDesc: 'تسجيل فوري لجميع طلبات الملفات الطبية وتجاوز الصلاحيات لمنع الاختراق وتتبع العمليات الحساسة.',
    logTime: 'التوقيت اليومي',
    logActor: 'المسؤول',
    logAction: 'العملية',
    logStatus: 'النتيجة',
    logDetails: 'تفاصيل العملية الطبية',
    logIp: 'عنوان IP',
    searchLogs: 'بحث في سجلات الأمان...',

    // Metrics
    metricActiveWaitlist: 'الانتظار النشط اليوم',
    metricTodayBookings: 'حجوزات اليوم المؤكدة',
    metricNewCases: 'ملفات المرضى المسجلين',
    metricCanceledRates: 'معدل إلغاء المواعيد',
    metricSecurityShield: 'حالة جدار الأمان',
    metricActiveSec: 'محمي بالكامل',

    // Doctor Tabs
    tabDashboard: 'لوحة التحكم والمتابعة',
    tabPatients: 'سجل المرضى الكلي',
    tabSchedules: 'التقويم السنوي والمواعيد',
    tabSecurity: 'الأمن والنسخ الاحتياطي',

    // Lobby / Doctor Queue
    lobbyTitle: 'عيادة الكشف - قائمة الانتظار الحالية',
    lobbyNoPatient: 'لا يوجد مرضى بانتظار الكشف حالياً',
    lobbyArrived: 'وصل في',
    lobbyQueueNo: 'رقم الدور',
    lobbyWaiting: 'بالانتظار',
    lobbyInConsultation: 'قيد الاستشارة الطبية',
    lobbyCompleted: 'مغادرة وانتهاء الكشف',
    btnCallConsult: 'بدء الكشف الطبي',
    btnCheckout: 'إنهاء وتصريح الخروج',

    // Patient Directory
    patientRegistry: 'الدليل الطبي للمرضى والعائلات',
    searchPatients: 'البحث المتقدم بالاسم، الهاتف أو الأمراض المزمنة...',
    filterAll: 'جميع الحالات',
    filterChronic: 'لديهم أمراض مزمنة',
    genderMale: 'ذكر',
    genderFemale: 'أنثى',
    ageYears: 'سنة',
    addPatientBtn: 'تسجيل ملف مريض جديد',

    // Patient Form
    formAddPatientTitle: 'فتح ملف طبي جديد للمريض',
    formFullName: 'الاسم بالكامل',
    formPhone: 'رقم الهاتف المباشر',
    formEmail: 'البريد الإلكتروني',
    formAge: 'العمر بالسنوات',
    formGender: 'الجنس',
    formAddress: 'العنوان السكني بالكامل',
    formJob: 'الوظيفة الحالية',
    formSocialStatus: 'الحالة الاجتماعية',
    formChronic: 'الأمراض المزمنة والحالية (إن وجدت)',
    formAllergies: 'الحساسية المعروفة للمضادات أو الأدوية',
    formMedications: 'الأدوية التي يتناولها بانتظام',
    formReason: 'سبب الزيارة أو الشكوى الطبية الرئيسية',
    formNotes: 'ملاحظات الطبيب المساعد أو السكرتير',
    formExtraLabel: 'اسم حقل إضافي (مثال: فصيلة الدم)',
    formExtraValue: 'القيمة الافتراضية للحق',
    btnSavePatient: 'حفظ وتسجيل وتعميم الملف الطبي',
    btnCancel: 'إلغاء الأمر',

    // Clinical File View
    clinicalPortfolio: 'ملف المريض الإلكتروني المتكامل',
    patientDetails: 'البيانات الشخصية والديموغرافية',
    medicalHistory: 'السجل العلاجي والسريري',
    clinicalDocs: 'التقارير الطبية ومستندات الفحص (PDF / صور)',
    noClinicalDocs: 'لا يوجد ملفات أو أشعة مرفوعة حالياً لهذا الملف',
    uploadClinicalDoc: 'رفع مستند فحص جديد (تحاليل / أشعة سينية)',
    newDiagnosis: 'تسجيل كشف سريري وتشخيص جديد',
    symptomsLabel: 'الأعراض المشتكي منها والمؤشرات الحيوية',
    diagnosisLabel: 'التشخيص الطبي النهائي وحالة الأعضاء',
    treatmentPlanLabel: 'الخطة العلاجية والدوائية المقترحة',
    saveDiagnosisBtn: 'تسجيل التشخيص بالملف الطبي',
    issuePrescriptionBtn: 'تحرير وصفة دوائية إلكترونية معتمدة',

    // Digital Prescription Designer
    prescriptionTitle: 'الوصفة الطبية المعتمدة وموانع التداخل الدوائي',
    medicineName: 'اسم الدواء (العلمي والتجاري)',
    medicineDosage: 'الجرعة المقررة (مثال: 500 ملغ)',
    medicineFreq: 'معدل التكرار (مثال: مرتين يومياً)',
    medicineDuration: 'فترة الاستخدام المحددة',
    addMedicineBtn: 'إضافة دواء إضافي',
    physicianNotes: 'ملاحظات وتوصيات الصيدلي والمريض',
    signPrescriptionBtn: 'توقيع وختم الوصفة إلكترونياً',
    noMedicinesAdded: 'لم يتم إضافة أدوية بالوصفة الطبية بعد',
    printPrescription: 'طباعة تفصيلية للوصفة الطبية',

    // Backup Module
    backupManagerTitle: 'أرشفة قواعد البيانات والنسخ الاحتياطية الاستعادية',
    backupManagerDesc: 'توليد لقطات آمنة للملفات واستعادتها في حالة الطوارئ التقنية مع تشفير البيانات الحساسة.',
    triggerBackupBtn: 'توليد نسخة احتياطية مشفرة الآن',
    backupId: 'مُعرف النسخة الأرشيفية',
    backupDate: 'تاريخ النسخ والتشفير',
    backupRecordsCount: 'عدد السجلات المؤرشفة',
    backupRestoreBtn: 'استرجاع النسخة وتعيين النشاط',
    noBackups: 'لا يوجد نسخ احتياطية مسجلة حالياً',

    // Calendar
    calendarPlanner: 'منظم المواعيد والتقويم السريري',
    dateLabel: 'التاريخ',
    timeSlotLabel: 'التوقيت المتاح للكشف بالعيادة',
    urgencyLabel: 'مستوى استعجال الحالة',
    urgencyHigh: 'استدعاء طارئ وعاجل جداً',
    urgencyNormal: 'كشف مبرمج عادي',
    btnBookAppointment: 'تأكيد وحجز تذكرة الكشف',
    overlapWarning: 'تنبيه: التوقيت المحدد يتعارض مع حجز قائم بالعيادة',

    // Receptionist Portals
    receptionDesk: 'مكتب خدمات المرضى والاستقبال المباشر',
    checkinLobbyTitle: 'تسجيل حضور المرضى وادخالهم للانتظار',
    searchByIdentifier: 'البحث عن مريض لتسجيل الحضور...',
    btnCheckin: 'تسجيل وصول وتفعيل الدور للانتظار',
    checkedInSuccess: 'تم تسجيل وصول المريض بنجاح وتوجيهه لصالون الانتظار',
    receptionDashboard: 'واجهة الاستقبال والمواعيد',

    // Patient Portal
    patientPortalTitle: 'البوابة الصحية التفاعلية للمريض',
    nextVisitDate: 'موعد زيارتك الطبية القادمة للعيادة',
    visitsCount: 'عدد الزيارات الاستشارية السابقة',
    noUpcomingApp: 'لا يوجد مواعيد قادمة حجزت بعد بالعيادة',
    myClinicalDetails: 'سجل السريري والتشخيصات الصادرة',
    myActivePrescriptions: 'وصفات الأدوية المعتمدة للاستخدام',
    uploadOwnFiles: 'رفع نتائج الفحوصات والتحاليل الشخصية',
    bookMySlot: 'طلب حجز موعد طبي جديد بالخدمة الذاتية',

    // Reports & Charts
    clinicReports: 'لوحة الإحصائيات والأداء السريري للأعمال الطبية',
    repTotalPatients: 'إجمالي الحالات المسجلة بالعيادة',
    repTotalBookings: 'إجمالي تذاكر المواعيد والحجوزات',
    repTotalPrescriptions: 'إجمالي الوصفات المصروفة رقمياً',
    repMetricsTrend: 'تحليل معدلات التقدم الطبي والأداء المالي السنوي',
    chartLabelVisits: 'معدل الزيارات السريرية الأسبوعية',
    chartLabelPatients: 'تسجيل المرضى اليومي النشط',
    chartLabelCancellations: 'معدل إلغاء وجدولة المواعيد مسبقاً',
  },
  en: {
    // Brand & General
    appTitle: 'Al-Hakim Medical Clinic Suite',
    doctorRole: 'Attending Physician',
    receptionistRole: 'Lobby Receptionist',
    patientRole: 'Patient Portal Account',
    logout: 'Secure Log Out',
    welcomeBack: 'Welcome back',
    realtimeClock: 'System Time & Security Audits',
    themeLight: 'Light Theme Mode',
    themeDark: 'Dark Theme Mode',
    successToast: 'Operation completed successfully',
    errorToast: 'An error occurred during transaction processing',

    // Sec/Auth Screen
    loginHeader: 'Clinic Secure Medical Terminal',
    loginSubtitle: 'Inject secure authentication key to synchronize with medical files',
    usernameLabel: 'User Account Name',
    passwordLabel: 'Encrypted Cryptographic Password',
    loginButton: 'Initialize Connection & Login',
    demologsTitle: 'Sandbox Verification Credentials for Evaluation Panel',
    twoFAHeader: 'Two-Factor Token Authentication (2FA)',
    twoFASubtitle: 'To prevent identity hijacking, insert the 6-digit confirmation token',
    verificationCode: 'Verification Digit Token',
    verifyButton: 'Verify Verification Token',
    twoFADemoTip: 'Evaluating codes are: 123456 or 779977',

    // Security Tab & Audit Logs
    securityShield: 'Integrated Security & Identity Cryptography',
    auditLogsTitle: 'Electronic Health Security audit ledger',
    auditLogsDesc: 'Every health query, digital prescription modification, and record access is securely logged with IP footprinting.',
    logTime: 'System Timestamp',
    logActor: 'Responsible Actor',
    logAction: 'Triggered Event',
    logStatus: 'Execution Status',
    logDetails: 'Clinical Transaction Details',
    logIp: 'Network IP Address',
    searchLogs: 'Query secure operations audit histories...',

    // Metrics
    metricActiveWaitlist: 'Active Wait Lobby Today',
    metricTodayBookings: 'Confirmed Clinic Appointments',
    metricNewCases: 'Registered Clinical Files',
    metricCanceledRates: 'Appointment Reschedule Rate',
    metricSecurityShield: 'Crypto Shield Level',
    metricActiveSec: 'Fully Shielded',

    // Doctor Tabs
    tabDashboard: 'Lobby & Business Dashboard',
    tabPatients: 'Master Patient Directories',
    tabSchedules: 'Clinical Calendars Planner',
    tabSecurity: 'Security Systems & Backup snapshots',

    // Lobby / Doctor Queue
    lobbyTitle: 'Live Patient Waiting Queue Terminal',
    lobbyNoPatient: 'Zero patients waiting inside lobby files currently',
    lobbyArrived: 'Arrived at',
    lobbyQueueNo: 'Queue Index',
    lobbyWaiting: 'Waiting for exam room',
    lobbyInConsultation: 'Actively in Consultation Room',
    lobbyCompleted: 'Finished Consultation & Discharged',
    btnCallConsult: 'Admit Patient into Consultation Room',
    btnCheckout: 'Finalize Consultation & Discharge',

    // Patient Directory
    patientRegistry: 'Health Records Index Directory',
    searchPatients: 'Dynamic search by identifier, phone or diagnosis histories...',
    filterAll: 'All Registered Patient Files',
    filterChronic: 'Chronic Pathologies Present',
    genderMale: 'Male',
    genderFemale: 'Female',
    ageYears: 'yrs old',
    addPatientBtn: 'Register New Electronic Health Record',

    // Patient Form
    formAddPatientTitle: 'Generate Comprehensive Patient Medical File Folder',
    formFullName: 'Full Name Segment',
    formPhone: 'Contact Number',
    formEmail: 'Secure Email Address',
    formAge: 'Patient Biological Age',
    formGender: 'Biological Gender',
    formAddress: 'Residential Location Address',
    formJob: 'Primary Professional Occupation',
    formSocialStatus: 'Marital Status',
    formChronic: 'Confirmed Chronic Deficiencies & Pathologies',
    formAllergies: 'Confirmed Pharmaceutical Allergies',
    formMedications: 'Currently Assigned Everyday Medicines',
    formReason: 'Active Chief Medical Complaint for Consultation',
    formNotes: 'Additional Clinical Assistant Observations',
    formExtraLabel: 'Dynamic Clinical Marker Attribute Label',
    formExtraValue: 'Default Field Attribute Value',
    btnSavePatient: 'Save Patient File to Encrypted Database',
    btnCancel: 'Abort Action',

    // Clinical File View
    clinicalPortfolio: 'Integrated Patient Health Portfolio',
    patientDetails: 'Demographics & Attributes Information',
    medicalHistory: 'Historic Clinical Consultation Diaries',
    clinicalDocs: 'Diagnostic Files & Scans Storage (PDF/Images)',
    noClinicalDocs: 'Zero external scans or pathology documentations found in directory',
    uploadClinicalDoc: 'Upload New Lab Panel / Imaging JPEG',
    newDiagnosis: 'Log New Clinical Examination & Diagnoses Record',
    symptomsLabel: 'Incurred Chief Symptoms & Physical Examination Vitals',
    diagnosisLabel: 'Final Clinic Medical Diagnosis & Assessments',
    treatmentPlanLabel: 'Target Therapeutic Strategies & Prescribed Curations',
    saveDiagnosisBtn: 'Chronolocate & Save Scribe to Records Ledger',
    issuePrescriptionBtn: 'Draft Signed Digital Prescription Order',

    // Digital Prescription Designer
    prescriptionTitle: 'Attending Physician Electronic Pharmacy Prescription',
    medicineName: 'Drug Specification Details (Generic & Brand)',
    medicineDosage: 'Pharmaceutical Dosage Strength (e.g., 500mg)',
    medicineFreq: 'Times Frequency Order Rate (e.g., BID / BID-AC)',
    medicineDuration: 'Prescribed Days Supply Course',
    addMedicineBtn: 'Insert Medication Vector line',
    physicianNotes: 'Attending Doctors Auxiliary Dispensing Warnings',
    signPrescriptionBtn: 'Sign, Seal & Distribute Digital Prescription',
    noMedicinesAdded: 'Medicines lines array is currently empty',
    printPrescription: 'Print Formal Pharmacy Receipt Profile',

    // Backup Module
    backupManagerTitle: 'Database Snapshots & Technical Disaster Recovery Assets',
    backupManagerDesc: 'Encapsulate clinical schema rows inside encrypted JSON archives to prevent catastrophic database corruption.',
    triggerBackupBtn: 'Trigger Secure Ledger Database Backup',
    backupId: 'Archive Unique File Identifier',
    backupDate: 'Snapshot Compilation Stamp',
    backupRecordsCount: 'Archived Database Rows Count',
    backupRestoreBtn: 'Restore Archive State',
    noBackups: 'No system snapshots or rollbacks detected in database files',

    // Calendar
    calendarPlanner: 'Clinical Scheduling & Interactive Agenda',
    dateLabel: 'Event Date Target',
    timeSlotLabel: 'Assigned Booking Slot',
    urgencyLabel: 'Severity Level',
    urgencyHigh: 'Emergency Clinical Priority',
    urgencyNormal: 'Regular Preventive Consultation',
    btnBookAppointment: 'Validate Slot & Lock Reservation',
    overlapWarning: 'Warning: Conflict Detected. Booking overlaps with another Patient.',

    // Receptionist Portals
    receptionDesk: 'Reception & Patient Lobby Services',
    checkinLobbyTitle: 'Check-in Confirmed Appointments into Active Lobby Queue',
    searchByIdentifier: 'Query booked patients index to check-in...',
    btnCheckin: 'Check-in Patient into Lobby Desk Queue',
    checkedInSuccess: 'Patient successfully mapped to Active Wait Lobby list',
    receptionDashboard: 'Lobby Reception & Calendar Desk',

    // Patient Portal
    patientPortalTitle: 'Self-Service Digital Patient Health Workspace',
    nextVisitDate: 'Attending Appointment Reservation Date',
    visitsCount: 'Historic Clinic Visits Completed',
    noUpcomingApp: 'Zero upcoming active reservations detected',
    myClinicalDetails: 'My Consultation Logs & Clinical Records',
    myActivePrescriptions: 'My Signed Pharamcological Prescriptions',
    uploadOwnFiles: 'Upload My Personal Health Documents / Blood Panels',
    bookMySlot: 'Schedule New Consultation Slot',

    // Reports & Charts
    clinicReports: 'Clinical Enterprise Business Analytics',
    repTotalPatients: 'Active Diagnostic Cases',
    repTotalBookings: 'Reservations Programmed',
    repTotalPrescriptions: 'Prescriptions Documented',
    repMetricsTrend: 'Quarterly Operating Inpatient & Revenue Growth Analysis',
    chartLabelVisits: 'Weekly Medical Consultation Frequency',
    chartLabelPatients: 'Daily Case Intake Inflow Trends',
    chartLabelCancellations: 'Appointment Reschedules & Absences Rate',
  }
};
