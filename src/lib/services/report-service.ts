import { db } from "@/lib/firebase";
import { VisitSession, Patient, InvoiceItem } from "@/types/clinic";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";

export interface DailyRevenue {
    date: string; // YYYY-MM-DD
    totalRevenue: number;
    serviceRevenue: number;
    medicineRevenue: number;
    totalVisits: number;
    totalOrders: number;
    visits: {
        id: string;
        patientName: string;
        time: string;
        type: 'service' | 'medicine';
        amount: number;
        items: string[];
    }[];
    dailyTotal?: number;
    revenueBySource?: {
        service: number;
        medicine_clinic: number;
        medicine_online: number;
    };
    revenueByServiceItem?: { [key: string]: { quantity: number; amount: number } };
    revenueByMedicineItem?: { [key: string]: { quantity: number; amount: number } };
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

            // 1. Fetch VISITS (Service Revenue)
            const qVisits = query(
                collection(db, "visits"),
                where("checkInTime", ">=", startOfDay.getTime()),
                where("checkInTime", "<=", endOfDay.getTime())
            );
            const visitSnap = await getDocs(qVisits);

            // 1a. Fetch Medicines for Lookup
            const medsQ = query(collection(db, "medicines"));
            const medsSnap = await getDocs(medsQ);
            const medMap = new Map<string, string>();
            medsSnap.forEach(doc => {
                const m = doc.data();
                medMap.set(doc.id, m.name);
            });

            // 2. Fetch MEDICINE SALES
            const qSales = query(
                collection(db, "prescription_sales"),
                where("createdAt", ">=", startOfDay.getTime()),
                where("createdAt", "<=", endOfDay.getTime())
            );
            const saleSnap = await getDocs(qSales);

            let serviceRevenue = 0;
            let medicineRevenue = 0;
            const transactions: any[] = [];
            const serviceBreakdown: { [key: string]: { quantity: number; amount: number } } = {};
            const medicineBreakdown: { [key: string]: { quantity: number; amount: number } } = {};

            // Process Visits
            visitSnap.forEach(doc => {
                const data = doc.data() as VisitSession;
                const visitTotal = (data.services || []).reduce((sum, item) => sum + (item.total || 0), 0);
                if (visitTotal > 0) {
                    serviceRevenue += visitTotal;

                    // Breakdown Logic
                    (data.services || []).forEach(s => {
                        if ((s.total || 0) > 0) {
                            if (!serviceBreakdown[s.name]) {
                                serviceBreakdown[s.name] = { quantity: 0, amount: 0 };
                            }
                            serviceBreakdown[s.name].quantity += (s.quantity || 1);
                            serviceBreakdown[s.name].amount += (s.total || 0);
                        }
                    });

                    transactions.push({
                        id: doc.id,
                        patientName: data.patientName || "Khách lẻ",
                        time: new Date(data.checkInTime).toLocaleTimeString('vi-VN'),
                        type: 'service',
                        amount: visitTotal,
                        items: (data.services || []).map(s => s.name)
                    });
                }
            });

            // Process Sales
            saleSnap.forEach(doc => {
                const data = doc.data() as any; // PrescriptionOrder
                // If this sale is linked to a visit we might double count if we aren't careful?
                // Currently Pharmacy Sales are separate from EMR Service Charges. 
                // EMR Service Charges = Consultation, Ultrasound.
                // Pharmacy Sales = Medicines.
                // So they are distinct. GOOD.

                medicineRevenue += data.totalAmount;

                // Breakdown Logic for Medicines
                (data.items || []).forEach((item: any) => {
                    const id = item.medicineId;
                    const name = medMap.get(id) || `Unknown (${id})`;

                    if (!medicineBreakdown[name]) {
                        medicineBreakdown[name] = { quantity: 0, amount: 0 };
                    }
                    medicineBreakdown[name].quantity += (item.quantity || 0);
                    medicineBreakdown[name].amount += (item.subtotal || 0);
                });

                transactions.push({
                    id: doc.id,
                    patientName: data.patientName || "Khách lẻ",
                    time: new Date(data.createdAt).toLocaleTimeString('vi-VN'),
                    type: 'medicine',
                    amount: data.totalAmount,
                    source: data.saleSource || 'clinic', // Capture source
                    items: (data.items || []).map((i: any) => i.medicineId)
                });
            });

            // Sort transactions by time
            transactions.sort((a, b) => b.time.localeCompare(a.time));

            return {
                date: dateStr,
                totalRevenue: serviceRevenue + medicineRevenue,
                serviceRevenue,
                medicineRevenue,
                totalVisits: visitSnap.size,
                totalOrders: saleSnap.size,
                visits: transactions,
                // Breakdown
                revenueBySource: {
                    service: serviceRevenue,
                    medicine_clinic: transactions.filter(t => t.type === 'medicine' && t.source !== 'online').reduce((sum, t) => sum + t.amount, 0),
                    medicine_online: transactions.filter(t => t.type === 'medicine' && t.source === 'online').reduce((sum, t) => sum + t.amount, 0),
                },
                revenueByServiceItem: serviceBreakdown,
                revenueByMedicineItem: medicineBreakdown
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
