import { db } from "@/lib/firebase";
import { ServiceItem } from "@/types/clinic";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, orderBy, onSnapshot } from "firebase/firestore";

const COLLECTION_NAME = "services";

export const ServiceCatalogService = {
    // Add a new service
    add: async (service: Omit<ServiceItem, "id">) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), service);
            return { id: docRef.id, ...service };
        } catch (error) {
            console.error("Error adding service: ", error);
            throw error;
        }
    },

    // Get all services (Real-time listener recommended for UI, but here is fetch once)
    getAll: async () => {
        const q = query(collection(db, COLLECTION_NAME), orderBy("name"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ServiceItem[];
    },

    // Update a service
    update: async (id: string, updates: Partial<ServiceItem>) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, updates);
        } catch (error) {
            console.error("Error updating service: ", error);
            throw error;
        }
    },

    // Delete/Deactivate service
    delete: async (id: string) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Error deleting service: ", error);
            throw error;
        }
    }
};
