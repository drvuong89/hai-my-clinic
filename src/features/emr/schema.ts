import { z } from "zod";

export const medicalRecordSchema = z.object({
    patientId: z.string().min(1, "Vui lòng chọn bệnh nhân"),
    vitalSigns: z.object({
        weight: z.string().optional(), // Using string for input, parse later
        bloodPressure: z.string().optional(),
        fetalHeartRate: z.string().optional(),
    }),
    clinicalDiagnosis: z.string().min(1, "Vui lòng nhập chẩn đoán lâm sàng"),
    doctorNotes: z.string().optional(),
    visitDate: z.date(),
});

export type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>;
