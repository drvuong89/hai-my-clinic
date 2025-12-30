import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppUser } from "@/types/clinic";

const COLLECTION_NAME = "users";

export const UserService = {
    // Get all users
    getAllUsers: async (): Promise<AppUser[]> => {
        const snapshot = await getDocs(collection(db, COLLECTION_NAME));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
    },

    // Get active users only
    getActiveUsers: async (): Promise<AppUser[]> => {
        const q = query(collection(db, COLLECTION_NAME), where("isActive", "==", true));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
    },

    // Add new user
    addUser: async (data: Omit<AppUser, "id" | "createdAt">) => {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: Date.now()
        });
        return docRef.id;
    },

    // Update user
    updateUser: async (id: string, data: Partial<AppUser>) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, data);
    },

    // Delete user
    deleteUser: async (id: string) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    }
};
