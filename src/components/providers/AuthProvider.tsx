"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types/clinic";

interface AuthContextType {
    user: User | null;
    role: UserRole | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            setUser(authUser);
            if (authUser) {
                try {
                    // Fetch AppUser by Email to get Role
                    // NOTE: In a real app, sync UID or use Custom Claims
                    const q = query(collection(db, "users"), where("email", "==", authUser.email));
                    const snap = await getDocs(q);

                    if (!snap.empty) {
                        const userData = snap.docs[0].data();
                        setRole(userData.role as UserRole);
                    } else if (authUser.email === 'admin@haimyclinic.com') {
                        // FALLBACK for Root Admin if profile missing
                        console.warn("Admin profile missing, forcing admin role for root.");
                        setRole('admin');
                    } else {
                        // Fallback or unauthorized?
                        console.warn("User profile not found in Firestore");
                        setRole(null);
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                }
            } else {
                setRole(null);
            }
            setLoading(false);

            // Optional: Redirect logic if needed globally, usually handled in middleware or layout
            if (!authUser && window.location.pathname !== '/login') {
                router.push('/login');
            }
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, role, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
