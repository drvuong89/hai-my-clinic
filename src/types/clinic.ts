export type Gender = "male" | "female" | "other";

export interface Patient {
    id: string;
    fullName: string;
    phone: string;
    dateOfBirth?: string; // ISO 8601 YYYY-MM-DD
    gender: Gender;
    email?: string; // New email field
    address?: string;
    medicalHistory?: string;
    createdAt?: number; // Timestamp
}

export type ServiceType = "consultation" | "procedure" | "lab" | "pharmacy" | "package";

export interface ServiceItem {
    id: string;
    name: string;
    type: ServiceType;
    price: number;
    unit: string;
    isActive: boolean;
}

// --- NEW PHARMACY TYPES ---

export interface Medicine {
    id: string;
    name: string;
    sku: string;
    unit: string;
    usage?: string; // Default usage instructions
    category?: string; // e.g., "Antibiotic", "Vitamin"
    minStockLevel?: number; // Alert threshold
    isActive: boolean;
    description?: string;
    manufacturer?: string;
}

export interface InventoryBatch {
    id: string;
    medicineId: string;
    batchNumber: string;
    expiryDate: string; // ISO Date YYYY-MM-DD
    importDate: string;
    costPrice: number; // Giá vốn nhập vào
    originalQuantity: number; // Số lượng nhập ban đầu
    currentQuantity: number; // Số lượng hiện tại
    supplier?: string;
}

export interface PrescriptionOrder {
    id: string;
    createdAt: number;
    patientId?: string; // Optional (can be walk-in)
    patientName: string;
    items: {
        medicineId: string;
        batchId: string; // Deducted from specific batch
        quantity: number;
        price: number; // Sale price at time of sale
        subtotal: number;
    }[];
    totalAmount: number;
    status: 'completed' | 'cancelled';
    createdBy: string;
}

export type UserRole = 'admin' | 'doctor' | 'pharmacist' | 'receptionist';

export interface AppUser {
    id: string;
    username: string; // Tên đăng nhập
    password?: string; // Chỉ dùng khi tạo/update (hash ở backend nếu có, ở đây demo firebase store text hoặc auth link)
    displayName: string;
    role: UserRole;
    email?: string;
    phone?: string;
    isActive: boolean;
    createdAt?: number;
}

export type InvoiceStatus = "draft" | "pending" | "paid" | "cancelled";

export interface InvoiceItem {
    serviceId: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
}

export interface VisitSession {
    id: string;
    patientId: string;
    patientName?: string;
    patientPhone?: string;
    dateOfBirth?: string;
    doctorName?: string;
    checkInTime: number;
    status: "waiting" | "in_progress" | "completed" | "cancelled";
    services: InvoiceItem[];
    notes?: string;
}

// --- EMR TYPES ---

export interface VitalSigns {
    weight?: number; // kg
    height?: number; // cm
    bmi?: number;
    systolic?: number; // mmHg
    diastolic?: number; // mmHg
    pulse?: number; // bpm
    temperature?: number; // C
}

export interface ObstetricHistory {
    para: {
        term: number;
        preterm: number;
        abort: number;
        living: number;
    };
    lastMenstrualPeriod?: string; // LMP
    estimatedDueDate?: string; // EDC/EDD
    gestationalAge?: string; // Weeks + Days
    badHistory?: string;

    // History - Menstruation
    menstruation?: {
        cycleLength?: number; // Chu ky (ngay)
        duration?: number; // So ngay co kinh
        isRegular?: boolean; // Deu/Khong deu
        dysmenorrhea?: string; // Dau bung kinh
        notes?: string;
    };
}

export interface ClinicalExamination {
    general?: string; // Toan than
    thyroid?: string; // Tuyen giap
    breast?: string; // Tuyen vu

    // Gynecology Specific
    vulva?: string; // Am ho
    vagina?: string; // Am dao
    cervix?: string; // Co tu cung
    uterus?: string; // Tu cung
    adnexa?: string; // Phan phu
}

export interface UltrasoundData {
    fetalHeartRate?: number; // bpm
    bpd?: number; // Biparietal Diameter
    fl?: number; // Femur Length
    ac?: number; // Abdominal Circumference
    hc?: number; // Head Circumference
    efw?: number; // Estimated Fetal Weight
    amnioticFluid?: string;
    placenta?: string;
    presentation?: string; // Ngoi thai
    notes?: string;
    images?: string[]; // URLs
}

export interface PrescriptionItem extends ServiceItem {
    quantity: number;
    usage: string; // "Sáng 1, Chiều 1, sau ăn"
    morning?: number;
    noon?: number;
    afternoon?: number;
    evening?: number;
}

export interface MedicalRecord extends VisitSession {
    vitals?: VitalSigns;
    obstetric?: ObstetricHistory;
    clinicalExamination?: ClinicalExamination;
    ultrasound?: UltrasoundData;
    diagnosis?: string;
    prescription?: PrescriptionItem[];
    doctorAdvice?: string;
    nextAppointmentDate?: string;
}
