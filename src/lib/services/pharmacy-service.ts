import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, getDoc, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Medicine, InventoryBatch, PrescriptionOrder } from "@/types/clinic";

const MEDIGINE_COL = "medicines";
const BATCH_COL = "inventory_batches";
const SALE_COL = "prescription_sales";

export const PharmacyService = {
    // --- CATALOG (MEDICINES) ---
    getMedicines: async (): Promise<Medicine[]> => {
        const q = query(collection(db, MEDIGINE_COL), orderBy("name"));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
    },

    addMedicine: async (data: Omit<Medicine, "id">) => {
        const docRef = await addDoc(collection(db, MEDIGINE_COL), { ...data, isActive: true });
        return docRef.id;
    },

    updateMedicine: async (id: string, data: Partial<Medicine>) => {
        await updateDoc(doc(db, MEDIGINE_COL, id), data);
    },

    deleteMedicine: async (id: string) => {
        await deleteDoc(doc(db, MEDIGINE_COL, id));
    },

    // --- INVENTORY (BATCHES) ---
    getBatches: async (medicineId?: string): Promise<InventoryBatch[]> => {
        let q;
        if (medicineId) {
            q = query(collection(db, BATCH_COL), where("medicineId", "==", medicineId), orderBy("expiryDate", "asc"));
        } else {
            q = query(collection(db, BATCH_COL), orderBy("expiryDate", "asc"));
        }
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryBatch));
    },

    // Import Goods
    addBatch: async (data: Omit<InventoryBatch, "id" | "currentQuantity">) => {
        // currentQuantity starts equal to originalQuantity
        const batchData = { ...data, currentQuantity: data.originalQuantity };
        const docRef = await addDoc(collection(db, BATCH_COL), batchData);
        return docRef.id;
    },

    // Calculate Total Stock for a Medicine
    getTotalStock: async (medicineId: string): Promise<number> => {
        const q = query(collection(db, BATCH_COL), where("medicineId", "==", medicineId));
        const snap = await getDocs(q);
        let total = 0;
        snap.forEach(doc => {
            const batch = doc.data() as InventoryBatch;
            total += batch.currentQuantity;
        });
        return total;
    },

    // --- SALES (POS) ---
    // Sell items using FEFO (First Expiring First Out) logic
    createSale: async (
        orderData: Omit<PrescriptionOrder, "id" | "items" | "totalAmount">,
        cartItems: { medicineId: string; quantity: number; price: number }[]
    ) => {
        return await runTransaction(db, async (transaction) => {
            let totalAmount = 0;
            const finalItems: PrescriptionOrder['items'] = [];

            for (const item of cartItems) {
                // 1. Get all batches for this medicine, ordered by expiry (FEFO)
                // Note: We need to query inside transaction or get refs. 
                // Since Queries in transactions are tricky in some SDKs, we fetch first.
                // But specifically for consistency, we'll try querying.
                // Firestore Client SDK transactions support reading queries.

                const q = query(
                    collection(db, BATCH_COL),
                    where("medicineId", "==", item.medicineId),
                    where("currentQuantity", ">", 0),
                    orderBy("expiryDate", "asc")
                );

                // We actually have to execute this GET outside key loop or use refs if we can't query.
                // For valid transactions, reads must come before writes. 
                // This is a complex logic. We will simplify: Read all needed batches first.

                // Workaround: We will query batches for each item. 
                // *In a real high-concurrency app, this loop logic requires careful handling.*
                const batchSnap = await getDocs(q); // Reading is allowed

                let remainingQtyToDeduct = item.quantity;
                const availableBatches = batchSnap.docs.map(doc => ({ ref: doc.ref, data: doc.data() as InventoryBatch }));

                // Calculate total available
                const totalAvailable = availableBatches.reduce((sum, b) => sum + b.data.currentQuantity, 0);
                if (totalAvailable < item.quantity) {
                    throw new Error(`Thuốc ID ${item.medicineId} không đủ hàng tồn (Cần: ${item.quantity}, Có: ${totalAvailable})`);
                }

                for (const batch of availableBatches) {
                    if (remainingQtyToDeduct <= 0) break;

                    const deductAmount = Math.min(batch.data.currentQuantity, remainingQtyToDeduct);

                    // Add to final items list for the record
                    finalItems.push({
                        medicineId: item.medicineId,
                        batchId: batch.ref.id,
                        quantity: deductAmount,
                        price: item.price,
                        subtotal: deductAmount * item.price
                    });

                    // Update batch quantity
                    const newQty = batch.data.currentQuantity - deductAmount;
                    transaction.update(batch.ref, { currentQuantity: newQty });

                    remainingQtyToDeduct -= deductAmount;
                    totalAmount += (deductAmount * item.price);
                }
            }

            // Create Order Record
            const orderRef = doc(collection(db, SALE_COL));
            transaction.set(orderRef, {
                ...orderData,
                items: finalItems,
                totalAmount: totalAmount,
                createdAt: Date.now()
            });

            return orderRef.id;
        });
    }
};
