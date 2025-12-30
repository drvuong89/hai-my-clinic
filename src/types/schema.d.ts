export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  dob: string;
  address: string;
  medicalHistory?: string;
  zaloId?: string;
  createdAt: any; // Firestore Timestamp
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorName: string;
  scheduledTime: any;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  type: 'kham_thai' | 'phu_khoa' | 'sieu_am';
  note?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  appointmentId: string;
  visitDate: any;
  vitalSigns: {
    weight?: number;
    bloodPressure?: string;
    fetalHeartRate?: number;
  };
  diagnosis: string;
  prescription: Array<{
    medicineName: string;
    dosages: string;
    quantity: number;
  }>;
  attachments: string[]; // URLs từ Firebase Storage
  doctorNotes?: string;
}
