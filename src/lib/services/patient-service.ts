import { db } from "@/lib/firebase";
import { Patient } from "@/types/clinic";
import { collection, addDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore";

const COLLECTION_NAME = "patients";

export const PatientService = {
    // Search patients by Phone or Name
    search: async (searchTerm: string) => {
        if (!searchTerm) return [];

        // Simple search implementation. 
        // For better search, Algolia or specialized index is needed. 
        // Here we try to match phone number or name prefix

        try {
            const patientsRef = collection(db, COLLECTION_NAME);
            // NOTE: Firestore simple query limitations apply.
            // We'll fetch recent or try exact phone match for MVP.

            const q = query(
                patientsRef,
                where("phone", ">=", searchTerm),
                where("phone", "<=", searchTerm + '\uf8ff'),
                limit(5)
            );

            const snapshot = await getDocs(q);
            const results: Patient[] = [];
            snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() } as Patient));

            return results;
        } catch (error) {
            console.error("Error searching patients:", error);
            return [];
        }
    },

    // Create new patient
    create: async (patient: Omit<Patient, "id" | "createdAt">) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...patient,
                createdAt: Date.now()
            });
            return { id: docRef.id, ...patient };
        } catch (error) {
            console.error("Error creating patient:", error);
            throw error;
        }
    },

    // Get recent patients
    getRecent: async () => {
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"), limit(10));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        } catch (error) {
            return [];
        }
    }
};
