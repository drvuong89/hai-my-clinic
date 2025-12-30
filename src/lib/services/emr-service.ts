import { db } from "@/lib/firebase";
import { MedicalRecord, VisitSession, InvoiceItem } from "@/types/clinic";
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, query, where, getDocs, orderBy } from "firebase/firestore";

const VISIT_COLLECTION = "visits";

export const EmrService = {
    // Start a new visit (Check-in)
    createVisit: async (visitData: Partial<VisitSession>) => {
        try {
            const newVisitRef = doc(collection(db, VISIT_COLLECTION));
            const visit: VisitSession = {
                id: newVisitRef.id,
                patientId: visitData.patientId!,
                doctorName: visitData.doctorName || "",
                checkInTime: Date.now(),
                status: "waiting",
                services: visitData.services || [],
                notes: visitData.notes || "",
                ...visitData
            };

            await setDoc(newVisitRef, visit);
            return visit;
        } catch (error) {
            console.error("Error creating visit: ", error);
            throw error;
        }
    },

    // Get Visit Details
    getVisit: async (visitId: string): Promise<MedicalRecord | null> => {
        const docRef = doc(db, VISIT_COLLECTION, visitId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as MedicalRecord;
        }
        return null;
    },

    // Update Medical Record (Doctor saving data)
    updateRecord: async (visitId: string, data: Partial<MedicalRecord>) => {
        try {
            const docRef = doc(db, VISIT_COLLECTION, visitId);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating EMR: ", error);
            throw error;
        }
    },

    // Finish Visit (Move to Cashier)
    finishVisit: async (visitId: string, services: InvoiceItem[]) => {
        try {
            const docRef = doc(db, VISIT_COLLECTION, visitId);
            await updateDoc(docRef, {
                status: "completed", // Or "billing_pending" depending on workflow
                services: services
            });
        } catch (error) {
            console.error("Error finishing visit: ", error);
            throw error;
        }
    }
};
