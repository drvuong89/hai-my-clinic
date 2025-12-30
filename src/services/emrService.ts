import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { MedicalRecordFormValues, medicalRecordSchema } from "@/features/emr/schema";

const COLLECTION_NAME = "medical_records";

export const emrService = {
    // Save new medical record
    async saveRecord(data: MedicalRecordFormValues) {
        try {
            // Validate data before saving (double check)
            const validatedData = medicalRecordSchema.parse(data);

            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...validatedData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            console.log("Document written with ID: ", docRef.id);
            return docRef.id;
        } catch (e) {
            console.error("Error adding document: ", e);
            throw e;
        }
    },

    // Get records for a specific patient
    async getRecordsByPatient(patientId: string) {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("patientId", "==", patientId)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};
