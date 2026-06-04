/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  User,
  Patient,
  Appointment,
  MedicalRecord,
  MedicalFile,
  Prescription,
  DoctorSchedule,
  WaitingListEntry,
  Notification,
  AuditLog,
  ClinicSettings,
  ClinicBackup,
  SafeUser
} from './types';

// Paths
const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Memory DB fallback in case FS has errors
interface DbSchema {
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  medicalRecords: MedicalRecord[];
  medicalFiles: MedicalFile[];
  prescriptions: Prescription[];
  doctorSchedules: DoctorSchedule[];
  waitingLists: WaitingListEntry[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  settings: ClinicSettings;
}

// Initial default settings
const defaultSettings: ClinicSettings = {
  id: 'settings_main',
  doctorNameAr: 'د. محمد جودة',
  doctorNameEn: 'Dr. Mohamed Goda',
  specialtyAr: 'مدرس طب وجراحة العيون بجامعة الأزهر واستشاري المياه البيضاء والقرنية والليزك',
  specialtyEn: 'Ophthalmology Lecturer at Al-Azhar University & Cataract/LASIK Consultant',
  clinicNameAr: 'عيادة د. محمد جودة لطب وجراحة العيون والليزك',
  clinicNameEn: 'Dr. Mohamed Goda Ophthalmology & LASIK Clinic',
  bookingTimeSlots: [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ],
  allowOnlineBooking: true,
  googleSheetsEnabled: false,
  googleSheetsUrl: '',
  theme: 'light'
};

// Cryptographic utils
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Input sanitizer to prevent XSS
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return (obj as any[]).map(item => sanitizeObject(item)) as unknown as T;
  }
  const newObj = { ...obj } as any;
  for (const key in newObj) {
    if (typeof newObj[key] === 'string') {
      newObj[key] = sanitizeInput(newObj[key]);
    } else if (typeof newObj[key] === 'object' && newObj[key] !== null) {
      newObj[key] = sanitizeObject(newObj[key]);
    }
  }
  return newObj as T;
}

// Brute Force Guard
interface BruteForceEntry {
  attempts: number;
  lockUntil: number;
}
const bruteForceRegistry: Record<string, BruteForceEntry> = {};

export function checkBruteForce(identifier: string): { allowed: boolean; waitSec: number } {
  const record = bruteForceRegistry[identifier];
  if (!record) return { allowed: true, waitSec: 0 };
  const now = Date.now();
  if (record.attempts >= 5 && record.lockUntil > now) {
    return { allowed: false, waitSec: Math.ceil((record.lockUntil - now) / 1000) };
  }
  // If lock time passed, reset attempts
  if (record.lockUntil <= now && record.attempts >= 5) {
    record.attempts = 0;
  }
  return { allowed: true, waitSec: 0 };
}

export function registerFailedLogin(identifier: string): void {
  const record = bruteForceRegistry[identifier] || { attempts: 0, lockUntil: 0 };
  record.attempts += 1;
  const now = Date.now();
  if (record.attempts >= 5) {
    record.lockUntil = now + 5 * 60 * 1000; // 5 minute lock
  } else {
    record.lockUntil = now + record.attempts * 1000; // increasing backoff
  }
  bruteForceRegistry[identifier] = record;
}

export function registerSuccessfulLogin(identifier: string): void {
  delete bruteForceRegistry[identifier];
}

class DatabaseManager {
  private db: DbSchema = {
    users: [],
    patients: [],
    appointments: [],
    medicalRecords: [],
    medicalFiles: [],
    prescriptions: [],
    doctorSchedules: [],
    waitingLists: [],
    notifications: [],
    auditLogs: [],
    settings: defaultSettings
  };

  constructor() {
    this.ensureDirectories();
    this.loadDatabase();
  }

  private ensureDirectories() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to create database directories:', err);
    }
  }

  private loadDatabase() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        this.db = JSON.parse(fileContent);
        console.log('Database loaded successfully from file.');
      } else {
        this.seedDatabase();
        this.saveDatabase();
        console.log('Database seeded and created.');
      }
    } catch (err) {
      console.error('Error reloading database. Instantiating in-memory fallback.', err);
      this.seedDatabase();
    }
  }

  public saveDatabase() {
    try {
      this.ensureDirectories();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }

  private seedDatabase() {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const salt3 = generateSalt();
    const salt4 = generateSalt();

    // Seeding default users
    const seededUsers: User[] = [
      {
        id: 'u_doctor',
        username: 'doctor',
        passwordHash: hashPassword('doctor123', salt1),
        salt: salt1,
        role: 'doctor',
        name: 'Dr. Mohamed Goda',
        phone: '+20-101-234-5678',
        email: 'mohamed.goda@eyeclinic.com',
        is2FAEnabled: true,
        twoFASecret: 'HAKIMSECRET7799KEY',
        createdAt: '2026-06-01T08:00:00Z'
      },
      {
        id: 'u_recep',
        username: 'receptionist',
        passwordHash: hashPassword('receptionist123', salt2),
        salt: salt2,
        role: 'receptionist',
        name: 'Amina Al-Ahmed',
        phone: '+966-505-998-877',
        email: 'amina@hakimclinic.com',
        is2FAEnabled: false,
        twoFASecret: 'RECEPSECRET8844KEY',
        createdAt: '2026-06-01T08:30:00Z'
      },
      {
        id: 'u_patient_ahmad',
        username: 'patient',
        passwordHash: hashPassword('patient123', salt3),
        salt: salt3,
        role: 'patient',
        name: 'أحمد منصور',
        phone: '+966-509-001-002',
        email: 'ahmad.mansour@gmail.com',
        is2FAEnabled: false,
        twoFASecret: '',
        createdAt: '2026-06-02T10:00:00Z'
      },
      {
        id: 'u_patient_sara',
        username: 'patient2',
        passwordHash: hashPassword('patient123', salt4),
        salt: salt4,
        role: 'patient',
        name: 'سارة سميث',
        phone: '+966-503-441-229',
        email: 'sara.smith@hotmail.com',
        is2FAEnabled: false,
        twoFASecret: '',
        createdAt: '2026-06-02T11:00:00Z'
      }
    ];

    const seededPatients: Patient[] = [
      {
        id: 'p_ahmad',
        userId: 'u_patient_ahmad',
        fullName: 'أحمد بن علي منصور',
        phone: '+966-509-001-002',
        email: 'ahmad.mansour@gmail.com',
        age: 42,
        gender: 'male',
        address: 'الرياض، حي الياسمين، شارع العليا',
        job: 'مهندس اتصالات',
        socialStatus: 'married',
        chronicDiseases: 'ارتفاع ضغط الدم (Hypertension)',
        allergies: 'البنسلين (Penicillin)',
        currentMedications: 'أملوديبين 5 ملغ (Amlodipine 5mg) حبة يومياً',
        reasonForVisit: 'مراجعة دورية لضغط الدم وحجم الصدر وتغيير الجرعة',
        additionalNotes: 'يرجى مراجعة نتائج تحليل الدم الربع سنوي الذي تم رفعه بالملفات',
        extraFields: [
          { label: 'المدخن', value: 'نعم (Smoke 10/day)' },
          { label: 'فصيلة الدم', value: 'O+' }
        ],
        createdAt: '2026-06-02T10:15:00Z'
      },
      {
        id: 'p_sara',
        userId: 'u_patient_sara',
        fullName: 'سارة جون سميث',
        phone: '+966-503-441-229',
        email: 'sara.smith@hotmail.com',
        age: 29,
        gender: 'female',
        address: 'جدة، حي الروضة',
        job: 'معلمة لغة إنجليزية',
        socialStatus: 'single',
        chronicDiseases: 'الربو الشعبي الخفيف (Asthma)',
        allergies: 'لا يوجد نوع محدد حالياً',
        currentMedications: 'بخاخ عند اللزوم (Symbicort)',
        reasonForVisit: 'ضيق تنفس مستمر مع زيادة نشاط الغبار بالجو',
        additionalNotes: 'سرعة دقات القلب تزيد مع استخدام البخاخ تكراراً',
        extraFields: [
          { label: 'فصيلة الدم', value: 'A-' }
        ],
        createdAt: '2026-06-02T11:15:00Z'
      }
    ];

    const seededAppointments: Appointment[] = [
      {
        id: 'app_1',
        patientId: 'p_ahmad',
        patientName: 'أحمد بن علي منصور',
        patientPhone: '+966-509-001-002',
        date: '2026-06-04',
        timeSlot: '09:30',
        status: 'confirmed',
        reason: 'فحص دوري وضغط الدم',
        isUrgent: true,
        queueNumber: 1,
        createdAt: '2026-06-02T12:00:00Z'
      },
      {
        id: 'app_2',
        patientId: 'p_sara',
        patientName: 'سارة جون سميث',
        patientPhone: '+966-503-441-229',
        date: '2026-06-04',
        timeSlot: '11:00',
        status: 'pending',
        reason: 'ضيق تنفس ومراجعة بخاخ الصدر',
        isUrgent: false,
        queueNumber: 2,
        createdAt: '2026-06-03T14:20:00Z'
      }
    ];

    const seededRecords: MedicalRecord[] = [
      {
        id: 'mr_1',
        patientId: 'p_ahmad',
        doctorId: 'u_doctor',
        date: '2026-05-15',
        symptoms: 'تسارع غير منتظم في نبضات القلب عند المجهود، قياس الضغط بالمنزل بلغ 145/95',
        diagnosis: 'ارتفاع ضغط الدم من الدرجة الأولى صادر عن التوتر العضلي والشرياني المعتدل',
        treatmentPlan: 'زيادة جرعة أملوديبين لـ 10ملغ أو الإبقاء وطلب تخطيط قلب Ecg',
        notes: 'حالة الصدر مستقرة، يوصى بالتقليل من الأغذية المالحة وممارسة تمرين المشي المعتدل',
        createdAt: '2026-05-15T10:00:00Z'
      }
    ];

    const seededPrescriptions: Prescription[] = [
      {
        id: 'pr_1',
        patientId: 'p_ahmad',
        patientName: 'أحمد بن علي منصور',
        doctorName: 'Dr. Mohamed Goda',
        date: '2026-05-15',
        medicines: [
          { name: 'قطرة عيون مرطبة (Systane Ultra)', dosage: 'قطرة واحدة', frequency: '4 مرات يومياً بفارق 4 ساعات', duration: '15 يوماً' },
          { name: 'قطرة عيون لضغط العين (Xalatan)', dosage: 'قطرة واحدة', frequency: 'مرة واحدة قبل النوم مباشرة', duration: '30 يوماً' }
        ],
        notes: 'الرجاء الالتزام بوضع قطرات العين بانتظام بالتبادل وتجنب لمس أو فرك العين باليدين مطلقاً والمتابعة بعد أسبوعين.',
        createdAt: '2026-05-15T10:15:00Z'
      }
    ];

    const seededFiles: MedicalFile[] = [
      {
        id: 'file_1',
        patientId: 'p_ahmad',
        documentName: 'تحليل الدم الربع سنوي - CBC & Lipid.pdf',
        documentType: 'pdf',
        fileUrl: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
        fileSize: '342 KB',
        uploadedAt: '2026-06-03T18:00:00Z'
      }
    ];

    const seededAuditLogs: AuditLog[] = [
      {
        id: 'lg_1',
        timestamp: '2026-06-04T08:00:00Z',
        actor: 'system',
        role: 'system',
        action: 'DB_INITIALIZATION',
        status: 'SUCCESS',
        details: 'تم تهيئة النظام الأمني للعيادة الطبية بنجاح وتوليد المكونات الاحتياطية وتأمين كلمات المرور.',
        ipAddress: '127.0.0.1'
      },
      {
        id: 'lg_2',
        timestamp: '2026-06-04T08:05:00Z',
        actor: 'doctor',
        role: 'doctor',
        action: 'LOGIN',
        status: 'SUCCESS',
        details: 'تم تسجيل دخول الطبيب بنجاح وتجاوز المصادقة 2FA بنجاح.',
        ipAddress: '192.168.1.10'
      }
    ];

    const seededSchedules: DoctorSchedule[] = [
      {
        id: 'sch_1',
        date: '2026-06-04',
        durationMinutes: 30,
        maxAppointments: 10,
        startTime: '09:00',
        endTime: '17:00'
      }
    ];

    const seededWaitings: WaitingListEntry[] = [
      {
        id: 'wt_1',
        appointmentId: 'app_1',
        patientId: 'p_ahmad',
        patientName: 'أحمد بن علي منصور',
        queueNumber: 1,
        status: 'waiting',
        arrivedAt: '2026-06-04T09:15:00Z'
      }
    ];

    const seededNotifications: Notification[] = [
      {
        id: 'nt_1',
        userId: 'u_patient_ahmad',
        titleAr: 'تذكير بموعد الفحص القادم',
        titleEn: 'Appointment Reminder',
        messageAr: 'مرحباً أحمد، نود تذكيرك بالموعد المؤكد اليوم في تمام الـ 09:30 صباحاً.',
        messageEn: 'Hello Ahmad, your booking is confirmed for today at 09:30 AM.',
        isRead: false,
        createdAt: '2026-06-04T06:00:00Z'
      }
    ];

    this.db = {
      users: seededUsers,
      patients: seededPatients,
      appointments: seededAppointments,
      medicalRecords: seededRecords,
      medicalFiles: seededFiles,
      prescriptions: seededPrescriptions,
      doctorSchedules: seededSchedules,
      waitingLists: seededWaitings,
      notifications: seededNotifications,
      auditLogs: seededAuditLogs,
      settings: defaultSettings
    };
  }

  // --- QUERY APIS ---
  public getUsers(): User[] { return this.db.users; }
  public getPatients(): Patient[] { return this.db.patients; }
  public getAppointments(): Appointment[] { return this.db.appointments; }
  public getMedicalRecords(): MedicalRecord[] { return this.db.medicalRecords; }
  public getMedicalFiles(): MedicalFile[] { return this.db.medicalFiles; }
  public getPrescriptions(): Prescription[] { return this.db.prescriptions; }
  public getSchedules(): DoctorSchedule[] { return this.db.doctorSchedules; }
  public getWaitingList(): WaitingListEntry[] { return this.db.waitingLists; }
  public getNotifications(): Notification[] { return this.db.notifications; }
  public getAuditLogs(): AuditLog[] { return this.db.auditLogs; }
  public getSettings(): ClinicSettings { return this.db.settings; }

  // --- MUTATORS (All sanitize entries internally) ---

  public addUser(user: User): User {
    const cleanUser = sanitizeObject(user);
    this.db.users.push(cleanUser);
    this.saveDatabase();
    return cleanUser;
  }

  public addPatient(patient: Patient): Patient {
    const cleanPatient = sanitizeObject(patient);
    this.db.patients.push(cleanPatient);
    this.saveDatabase();
    return cleanPatient;
  }

  public updatePatient(id: string, updated: Partial<Patient>): Patient | null {
    const index = this.db.patients.findIndex(p => p.id === id);
    if (index === -1) return null;
    const cleanUpdate = sanitizeObject(updated);
    this.db.patients[index] = { ...this.db.patients[index], ...cleanUpdate };
    this.saveDatabase();
    return this.db.patients[index];
  }

  public addAppointment(appointment: Appointment): Appointment {
    const cleanApp = sanitizeObject(appointment);
    this.db.appointments.push(cleanApp);
    this.saveDatabase();
    return cleanApp;
  }

  public updateAppointment(id: string, updated: Partial<Appointment>): Appointment | null {
    const index = this.db.appointments.findIndex(app => app.id === id);
    if (index === -1) return null;
    const cleanUpdate = sanitizeObject(updated);
    this.db.appointments[index] = { ...this.db.appointments[index], ...cleanUpdate };
    this.saveDatabase();
    return this.db.appointments[index];
  }

  public addMedicalRecord(record: MedicalRecord): MedicalRecord {
    const cleanRecord = sanitizeObject(record);
    this.db.medicalRecords.push(cleanRecord);
    this.saveDatabase();
    return cleanRecord;
  }

  public addMedicalFile(file: MedicalFile): MedicalFile {
    const cleanFile = sanitizeObject(file);
    this.db.medicalFiles.push(cleanFile);
    this.saveDatabase();
    return cleanFile;
  }

  public addPrescription(prescription: Prescription): Prescription {
    const cleanPres = sanitizeObject(prescription);
    this.db.prescriptions.push(cleanPres);
    this.saveDatabase();
    return cleanPres;
  }

  public addSchedule(sch: DoctorSchedule): DoctorSchedule {
    const cleanSch = sanitizeObject(sch);
    this.db.doctorSchedules.push(cleanSch);
    this.saveDatabase();
    return cleanSch;
  }

  public addWaitingListEntry(entry: WaitingListEntry): WaitingListEntry {
    const cleanEntry = sanitizeObject(entry);
    this.db.waitingLists.push(cleanEntry);
    this.saveDatabase();
    return cleanEntry;
  }

  public updateWaitingListStatus(id: string, status: 'waiting' | 'in_consultation' | 'completed', durationSec?: number): WaitingListEntry | null {
    const index = this.db.waitingLists.findIndex(w => w.id === id);
    if (index === -1) return null;
    this.db.waitingLists[index].status = status;
    if (durationSec !== undefined) {
      this.db.waitingLists[index].durationSec = durationSec;
    }
    this.saveDatabase();
    return this.db.waitingLists[index];
  }

  public clearWaitingList(): void {
    this.db.waitingLists = [];
    this.saveDatabase();
  }

  public addNotification(notif: Notification): Notification {
    const cleanNotif = sanitizeObject(notif);
    this.db.notifications.push(cleanNotif);
    this.saveDatabase();
    return cleanNotif;
  }

  public markNotificationsAsRead(userId: string): void {
    this.db.notifications.forEach(n => {
      if (n.userId === userId) n.isRead = true;
    });
    this.saveDatabase();
  }

  public addAuditLog(log: Omit<AuditLog, 'id'>): AuditLog {
    const id = 'lg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const completeLog: AuditLog = { id, ...log };
    // Maintain maximum 2000 logs to preserve storage speed
    if (this.db.auditLogs.length > 2000) {
      this.db.auditLogs.shift();
    }
    this.db.auditLogs.push(completeLog);
    this.saveDatabase();
    return completeLog;
  }

  public updateSettings(settings: ClinicSettings): ClinicSettings {
    const cleanSettings = sanitizeObject(settings);
    this.db.settings = cleanSettings;
    this.saveDatabase();
    return cleanSettings;
  }

  public updateUserProfile(userId: string, update: Partial<User>): User | null {
    const index = this.db.users.findIndex(u => u.id === userId);
    if (index === -1) return null;
    const cleanUpdate = sanitizeObject(update);
    // Keep internal secrets
    delete (cleanUpdate as any).passwordHash;
    delete (cleanUpdate as any).salt;
    this.db.users[index] = { ...this.db.users[index], ...cleanUpdate };
    this.saveDatabase();
    return this.db.users[index];
  }

  // --- BACKUP & RESTORE MODULE ---
  public getBackupsList(): ClinicBackup[] {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) return [];
      const files = fs.readdirSync(BACKUPS_DIR);
      const backups: ClinicBackup[] = [];

      for (const file of files) {
        if (file.startsWith('backup_') && file.endsWith('.json')) {
          const filePath = path.join(BACKUPS_DIR, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const data: DbSchema = JSON.parse(content);
          backups.push({
            backupId: file,
            timestamp: file.replace('backup_', '').replace('.json', '').replace(/_/g, ':'),
            description: `Manual or Automatic System Snapshot (${file.substring(7, 26)})`,
            recordsCount: {
              users: data.users ? data.users.length : 0,
              patients: data.patients ? data.patients.length : 0,
              appointments: data.appointments ? data.appointments.length : 0,
              medicalRecords: data.medicalRecords ? data.medicalRecords.length : 0,
              prescriptions: data.prescriptions ? data.prescriptions.length : 0,
              auditLogs: data.auditLogs ? data.auditLogs.length : 0,
            }
          });
        }
      }
      return backups.sort((a, b) => b.backupId.localeCompare(a.backupId));
    } catch (e) {
      console.error('Failed reading backups list:', e);
      return [];
    }
  }

  public triggerBackup(): ClinicBackup | null {
    try {
      this.ensureDirectories();
      const dateStr = new Date().toISOString().replace(/:/g, '-');
      const filename = `backup_${dateStr}.json`;
      const filePath = path.join(BACKUPS_DIR, filename);

      fs.writeFileSync(filePath, JSON.stringify(this.db, null, 2), 'utf8');

      return {
        backupId: filename,
        timestamp: new Date().toISOString(),
        description: 'Auto-triggered clinic data backuppoint generated successfully',
        recordsCount: {
          users: this.db.users.length,
          patients: this.db.patients.length,
          appointments: this.db.appointments.length,
          medicalRecords: this.db.medicalRecords.length,
          prescriptions: this.db.prescriptions.length,
          auditLogs: this.db.auditLogs.length,
        }
      };
    } catch (err) {
      console.error('Trigger backup failed:', err);
      return null;
    }
  }

  public restoreBackup(backupId: string): boolean {
    try {
      const filePath = path.join(BACKUPS_DIR, backupId);
      if (!fs.existsSync(filePath)) {
        return false;
      }
      // Read & replace
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data: DbSchema = JSON.parse(fileContent);

      // Simple validation of schema
      if (!data.users || !data.patients || !data.settings) {
        throw new Error('Invalid database backup structure');
      }

      this.db = data;
      this.saveDatabase();
      return true;
    } catch (e) {
      console.error('Restore backup failed:', e);
      return false;
    }
  }
}

export const dbService = new DatabaseManager();
