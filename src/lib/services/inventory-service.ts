import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ServiceItem } from "@/types/clinic";

const COLLECTION_NAME = "services";

export const InventoryService = {
    // Get all medicines (type = 'pharmacy')
    getMedicines: async (): Promise<ServiceItem[]> => {
        const q = query(collection(db, COLLECTION_NAME), where("type", "==", "pharmacy"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceItem));
    },

    // Add new medicine
    addMedicine: async (data: Omit<ServiceItem, "id">) => {
        // Ensure type is pharmacy
        const docRef = await addDoc(collection(db, COLLECTION_NAME), { ...data, type: "pharmacy", isActive: true });
        return docRef.id;
    },

    // Update medicine (stock, price, etc.)
    updateMedicine: async (id: string, data: Partial<ServiceItem>) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, data);
    },

    // Delete (Soft delete prefered usually, but hard delete for now)
    deleteMedicine: async (id: string) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    }
};
