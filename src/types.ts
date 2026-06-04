/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'doctor' | 'receptionist' | 'patient';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  is2FAEnabled: boolean;
  twoFASecret: string;
  twoFAVerifiedAt?: string;
  createdAt: string;
  lastActive?: string;
}

export type SafeUser = Omit<User, 'passwordHash' | 'salt' | 'twoFASecret'>;

export interface Patient {
  id: string;
  userId: string; // Foregin Key to User
  fullName: string;
  phone: string;
  email: string;
  age: number;
  gender: 'male' | 'female';
  address: string;
  job: string;
  socialStatus: 'single' | 'married' | 'divorced' | 'widowed';
  chronicDiseases: string;
  allergies: string;
  currentMedications: string;
  reasonForVisit: string;
  additionalNotes: string;
  extraFields: { label: string; value: string }[];
  createdAt: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'noshow';

export interface Appointment {
  id: string;
  patientId: string; // FK to Patient
  patientName: string; // Denormalized for quick query
  patientPhone: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:MM
  status: AppointmentStatus;
  reason: string;
  isUrgent: boolean;
  queueNumber?: number;
  createdAt: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string; // FK to Patient
  doctorId: string; // FK to User (Doctor)
  date: string; // YYYY-MM-DD
  symptoms: string;
  diagnosis: string;
  treatmentPlan: string;
  notes: string;
  createdAt: string;
}

export interface MedicalFile {
  id: string;
  patientId: string; // FK to Patient
  documentName: string;
  documentType: string; // pdf, jpg, png, etc.
  fileUrl: string; // Base64 stored content in this self-contained secure simulation, or simple URLs
  fileSize: string;
  uploadedAt: string;
}

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  id: string;
  medicalRecordId?: string; // FK to MedicalRecord (optional link)
  patientId: string; // FK to Patient
  patientName: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  medicines: PrescriptionMedicine[];
  notes: string;
  createdAt: string;
}

export interface DoctorSchedule {
  id: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number; // e.g. 20
  maxAppointments: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export interface WaitingListEntry {
  id: string;
  appointmentId: string; // FK to Appointment
  patientId: string; // FK to Patient
  patientName: string;
  queueNumber: number;
  status: 'waiting' | 'in_consultation' | 'completed';
  arrivedAt: string; // YYYY-MM-DDTHH:MM:SSZ
  durationSec?: number;
}

export interface Notification {
  id: string;
  userId: string; // FK to User
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string; // Username / system
  role: string; // doctor / receptionist / patient / guest
  action: string; // e.g., 'LOGIN', 'CREATE_APPOINTMENT', 'VIEW_RECORD'
  status: 'SUCCESS' | 'FAILURE';
  details: string;
  ipAddress: string;
}

export interface ClinicSettings {
  id: string;
  doctorNameAr: string;
  doctorNameEn: string;
  specialtyAr: string;
  specialtyEn: string;
  clinicNameAr: string;
  clinicNameEn: string;
  bookingTimeSlots: string[]; // ['09:00', '09:30', ...]
  allowOnlineBooking: boolean;
  googleSheetsEnabled: boolean;
  googleSheetsUrl?: string;
  theme: 'light' | 'dark';
}

export interface ClinicBackup {
  backupId: string;
  timestamp: string;
  description: string;
  recordsCount: {
    users: number;
    patients: number;
    appointments: number;
    medicalRecords: number;
    prescriptions: number;
    auditLogs: number;
  };
}
