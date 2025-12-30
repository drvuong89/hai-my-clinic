"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Search, ShoppingCart, Trash, Plus, Minus, CreditCard, User, FileText, Check, Printer } from "lucide-react";
import { PharmacyService } from "@/lib/services/pharmacy-service";
import { Medicine, InventoryBatch, MedicalRecord, PrescriptionItem } from "@/types/clinic";
import { EmrService } from "@/lib/services/emr-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MedicineSearch } from "@/components/clinic/MedicineSearch";

interface CartItem {
    medicine: Medicine;
    quantity: number;
    price: number;
    unit: string;
    usage: string;
}

export default function PharmacyPOSPage() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [batches, setBatches] = useState<InventoryBatch[]>([]);
    const [loading, setLoading] = useState(true);

    // Prescription State
    const [pendingPrescriptions, setPendingPrescriptions] = useState<MedicalRecord[]>([]);
    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

    // Cart / Order State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [patientName, setPatientName] = useState("Khách lẻ"); // Default to retail customer

    const loadData = async () => {
        setLoading(true);
        try {
            const [medsData, batchesData, prescriptions] = await Promise.all([
                PharmacyService.getMedicines(),
                PharmacyService.getBatches(),
                EmrService.getPendingPrescriptions()
            ]);
            setMedicines(medsData);
            setBatches(batchesData);
            setPendingPrescriptions(prescriptions);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Price Lookup Logic (Simple FIFO/First Batch)
    const getSellPrice = (medicineId: string): number => {
        // Find batch with stock
        const validBatch = batches.find(b => b.medicineId === medicineId && b.currentQuantity > 0);
        return validBatch?.sellPrice || validBatch?.costPrice || 0;
    };

    const addToCart = (medicine: Medicine) => {
        setCart(prev => {
            const existing = prev.find(i => i.medicine.id === medicine.id);
            if (existing) return prev;

            const price = getSellPrice(medicine.id);
            return [...prev, {
                medicine,
                quantity: 1,
                price: price,
                unit: medicine.unit,
                usage: medicine.usage || "Theo chỉ dẫn"
            }];
        });
    };

    const updateQuantity = (medId: string, quantity: number) => {
        setCart(prev => prev.map(item =>
            item.medicine.id === medId ? { ...item, quantity: Math.max(1, quantity) } : item
        ));
    };

    const updatePrice = (medId: string, newPrice: number) => {
        setCart(prev => prev.map(item =>
            item.medicine.id === medId ? { ...item, price: newPrice } : item
        ));
    };

    const updateUsage = (medId: string, usage: string) => {
        setCart(prev => prev.map(item =>
            item.medicine.id === medId ? { ...item, usage } : item
        ));
    };

    const removeFromCart = (medId: string) => {
        setCart(prev => prev.filter(i => i.medicine.id !== medId));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!patientName) {
            alert("Vui lòng nhập tên khách hàng");
            return;
        }

        try {
            const orderItems = cart.map(item => ({
                medicineId: item.medicine.id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price,
                batchId: "auto-assigned" // Simplified for now
            }));

            await PharmacyService.createSale({
                patientName,
                status: 'completed',
                createdBy: 'current_user',
            }, orderItems);

            if (selectedVisitId) {
                await EmrService.updateRecord(selectedVisitId, {
                    paymentStatus: 'paid',
                    status: 'completed'
                });
                setSelectedVisitId(null);
            }

            alert("Thanh toán thành công!");
            setCart([]);
            setPatientName("Khách lẻ");
            loadData();
        } catch (e: any) {
            console.error(e);
            alert("Lỗi thanh toán: " + e.message);
        }
    };

    const loadPrescriptionToCart = (visit: MedicalRecord) => {
        if (!visit.prescription || visit.prescription.length === 0) {
            alert("Đơn thuốc này không có thuốc!");
            return;
        }

        const newCart: CartItem[] = [];
        visit.prescription.forEach(pItem => {
            const med = medicines.find(m => m.id === pItem.id); // pItem.id is medicineId in PrescriptionItem but sometimes we map id to id. Let's assume matches.
            // Wait, PrescriptionItem extends ServiceItem where id is serviceId (medicineId).

            if (med) {
                const price = getSellPrice(med.id);
                newCart.push({
                    medicine: med,
                    quantity: pItem.quantity,
                    price: price, // Auto-fill price
                    unit: med.unit,
                    usage: pItem.usage
                });
            }
        });

        setCart(newCart);
        setPatientName(visit.patientName || "Khách từ EMR");
        setSelectedVisitId(visit.id);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] gap-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Bán hàng & Kê đơn</h2>
                <div className="flex gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2 relative">
                                <FileText className="w-4 h-4" />
                                Đơn thuốc chờ
                                {pendingPrescriptions.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                        {pendingPrescriptions.length}
                                    </span>
                                )}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Danh sách đơn thuốc chờ thanh toán</DialogTitle>
                            </DialogHeader>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bệnh nhân</TableHead>
                                        <TableHead>Bác sĩ</TableHead>
                                        <TableHead>Thuốc</TableHead>
                                        <TableHead>Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingPrescriptions.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-4">Không có đơn thuốc nào.</TableCell></TableRow>
                                    ) : pendingPrescriptions.map(visit => (
                                        <TableRow key={visit.id}>
                                            <TableCell>
                                                <div className="font-bold text-base">{visit.patientName}</div>
                                                <div className="text-sm text-muted-foreground">{new Date(visit.checkInTime).toLocaleTimeString()}</div>
                                            </TableCell>
                                            <TableCell>{visit.doctorName}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {visit.prescription?.map(p => p.name).join(", ")}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm" onClick={() => loadPrescriptionToCart(visit as MedicalRecord)}>
                                                    Chọn đơn <Check className="w-4 h-4 ml-1" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 h-full">
                {/* Main Prescription/Order Form */}
                <Card className="md:col-span-2 flex flex-col h-full border-none shadow-md">
                    <CardHeader className="bg-slate-50 border-b py-4">
                        <div className="flex gap-4 items-center">
                            <div className="flex-1">
                                <Label className="text-xs text-muted-foreground mb-1 block">Tìm và thêm thuốc</Label>
                                <MedicineSearch onSelect={addToCart} />
                            </div>
                            <div className="w-1/3">
                                <Label className="text-xs text-muted-foreground mb-1 block">Bệnh nhân / Khách hàng</Label>
                                <div className="relative">
                                    <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={patientName}
                                        onChange={e => setPatientName(e.target.value)}
                                        className="pl-8 bg-white"
                                        placeholder="Tên khách hàng..."
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Tên thuốc</TableHead>
                                    <TableHead className="w-[80px]">ĐVT</TableHead>
                                    <TableHead className="w-[100px]">Số lượng</TableHead>
                                    <TableHead className="w-[120px] text-right">Đơn giá</TableHead>
                                    <TableHead className="w-[120px] text-right">Thành tiền</TableHead>
                                    <TableHead className="w-[200px]">Cách dùng</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cart.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground border-dashed">
                                            Chưa có thuốc trong đơn.
                                        </TableCell>
                                    </TableRow>
                                ) : cart.map((item, index) => (
                                    <TableRow key={item.medicine.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{item.medicine.name}</div>
                                            <div className="text-xs text-muted-foreground">{item.medicine.sku}</div>
                                        </TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="1"
                                                className="w-16 h-8"
                                                value={item.quantity}
                                                onChange={e => updateQuantity(item.medicine.id, Number(e.target.value))}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="number"
                                                className="w-24 h-8 text-right ml-auto"
                                                value={item.price}
                                                onChange={e => updatePrice(item.medicine.id, Number(e.target.value))}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-blue-600">
                                            {(item.quantity * item.price).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="h-8 text-xs"
                                                value={item.usage}
                                                placeholder="VD: Sáng 1 viên..."
                                                onChange={e => updateUsage(item.medicine.id, e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 h-8 w-8" onClick={() => removeFromCart(item.medicine.id)}>
                                                <Trash className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Right Side: Summary & Payment */}
                <Card className="h-full bg-slate-50 border-l shadow-sm">
                    <CardHeader>
                        <CardTitle>Tổng kết đơn hàng</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tổng số mặt hàng:</span>
                                <span className="font-bold">{cart.length}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-baseline">
                                <span className="text-lg font-bold">Tổng cộng:</span>
                                <span className="text-3xl font-bold text-blue-700">{totalAmount.toLocaleString()} đ</span>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border space-y-4">
                            <div className="space-y-2">
                                <Label>Ghi chú đơn hàng</Label>
                                <Input placeholder="Ghi chú thêm..." />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-3">
                        <Button className="w-full h-12 text-lg gap-2 shadow-lg" onClick={handleCheckout} disabled={cart.length === 0}>
                            <CreditCard className="w-5 h-5" /> Thanh toán & Hoàn tất
                        </Button>
                        <Button variant="outline" className="w-full">
                            <Printer className="w-4 h-4 mr-2" /> In hóa đơn
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
