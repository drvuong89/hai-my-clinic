import { db } from "@/lib/firebase";
import { VisitSession, Patient, InvoiceItem } from "@/types/clinic";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";

export interface DailyRevenue {
    date: string; // YYYY-MM-DD
    totalRevenue: number;
    totalVisits: number;
    visits: {
        id: string;
        patientName: string;
        time: string;
        amount: number;
        services: string[];
    }[];
}

export const ReportService = {
    // Get Daily Revenue
    getDailyRevenue: async (dateStr: string): Promise<DailyRevenue> => {
        try {
            // Create start and end of day in millis
            const startOfDay = new Date(dateStr);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(dateStr);
            endOfDay.setHours(23, 59, 59, 999);

            // Fetch visits for the day
            // Note: Indexing might be required for compound queries. 
            // We fetch by time range first, then filter status client-side if needed to avoid index issues.
            const q = query(
                collection(db, "visits"),
                where("checkInTime", ">=", startOfDay.getTime()),
                where("checkInTime", "<=", endOfDay.getTime())
            );

            const snapshot = await getDocs(q);
            let totalRevenue = 0;
            const visits: any[] = [];

            snapshot.forEach(doc => {
                const data = doc.data() as VisitSession;
                // Count all visits in the time range, even if no services (revenue 0)
                const visitTotal = (data.services || []).reduce((sum, item) => sum + (item.total || 0), 0);
                totalRevenue += visitTotal;

                visits.push({
                    id: doc.id,
                    patientName: data.patientName || "Unknown",
                    time: new Date(data.checkInTime).toLocaleTimeString('vi-VN'),
                    amount: visitTotal,
                    services: (data.services || []).map(s => s.name)
                });
            });

            return {
                date: dateStr,
                totalRevenue,
                totalVisits: visits.length,
                visits
            };

        } catch (error) {
            console.error("Error fetching daily revenue:", error);
            throw error;
        }
    },

    // Get All Patients for Export
    getAllPatients: async (): Promise<Patient[]> => {
        try {
            const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        } catch (error) {
            console.error("Error fetching all patients:", error);
            return [];
        }
    }
};
