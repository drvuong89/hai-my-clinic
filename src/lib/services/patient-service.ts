import { db } from "@/lib/firebase";
import { Patient } from "@/types/clinic";
import { collection, addDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore";

const COLLECTION_NAME = "patients";

import { normalizeString } from "@/lib/utils";

// ... existing imports

export const PatientService = {
    // Search patients by Phone or Name
    search: async (searchTerm: string) => {
        if (!searchTerm) return [];

        try {
            const patientsRef = collection(db, COLLECTION_NAME);
            const normalizedTerm = normalizeString(searchTerm);

            // Strategy:
            // 1. Try finding by Phone (exact or prefix)
            // 2. Try finding by searchName (normalized name)

            const promises = [];

            // Query 1: Phone
            const qPhone = query(
                patientsRef,
                where("phone", ">=", searchTerm),
                where("phone", "<=", searchTerm + '\uf8ff'),
                limit(5)
            );
            promises.push(getDocs(qPhone));

            // Query 2: Name (searchName)
            if (normalizedTerm) {
                const qName = query(
                    patientsRef,
                    where("searchName", ">=", normalizedTerm),
                    where("searchName", "<=", normalizedTerm + '\uf8ff'),
                    limit(5)
                );
                promises.push(getDocs(qName));
            }

            const snapshots = await Promise.all(promises);
            const r: Map<string, Patient> = new Map();

            snapshots.forEach(snap => {
                snap.forEach(doc => {
                    r.set(doc.id, { id: doc.id, ...doc.data() } as Patient);
                });
            });

            return Array.from(r.values());
        } catch (error) {
            console.error("Error searching patients:", error);
            return [];
        }
    },

    // Create new patient
    create: async (patient: Omit<Patient, "id" | "createdAt">) => {
        try {
            const normalized = normalizeString(patient.fullName);
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...patient,
                searchName: normalized,
                createdAt: Date.now()
            });
            return { id: docRef.id, ...patient, searchName: normalized };
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
