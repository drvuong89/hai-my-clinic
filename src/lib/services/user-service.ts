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
        // 1. Create User in Firebase Auth (Using Secondary App to avoid logout)
        // NOTE: This requires enabling "Email/Password" provider in Firebase Console
        let secondaryApp;
        let newUid = "";
        try {
            const { initializeApp, getApp, deleteApp } = await import("firebase/app");
            const { getAuth, createUserWithEmailAndPassword } = await import("firebase/auth");

            // Random name for secondary app
            const appName = "secondaryApp-" + Date.now();
            const config = {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            };

            secondaryApp = initializeApp(config, appName);
            const secondaryAuth = getAuth(secondaryApp);

            if (data.email && data.password) {
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
                newUid = userCredential.user.uid;
            } else {
                throw new Error("Missing email or password");
            }

            // 2. Create User Profile in Firestore
            // Use SECONDARY App's Firestore (authenticated as new user) to ensure "owner" write permissions
            const { getFirestore, setDoc, doc } = await import("firebase/firestore");
            const secondaryDb = getFirestore(secondaryApp);

            await setDoc(doc(secondaryDb, COLLECTION_NAME, newUid), {
                ...data,
                password: null, // Security: Don't save password
                createdAt: Date.now()
            });

            // Cleanup
            await deleteApp(secondaryApp);

            return newUid;

        } catch (error: any) {
            console.error("Error creating user:", error);
            if (secondaryApp) {
                const { deleteApp } = await import("firebase/app");
                await deleteApp(secondaryApp).catch(() => { });
            }
            throw error;
        }
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
