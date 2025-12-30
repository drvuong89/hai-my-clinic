"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Search, ShoppingCart, Trash, Plus, Minus, CreditCard, User, History } from "lucide-react";
import { PharmacyService } from "@/lib/services/pharmacy-service";
import { Medicine, InventoryBatch } from "@/types/clinic";

interface CartItem {
    medicine: Medicine;
    quantity: number;
    price: number; // Sale price input manually or fetched
}

export default function PharmacyPOSPage() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [batches, setBatches] = useState<InventoryBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [patientName, setPatientName] = useState("Khách lẻ");

    const loadData = async () => {
        setLoading(true);
        try {
            const [medsData, batchesData] = await Promise.all([
                PharmacyService.getMedicines(),
                PharmacyService.getBatches()
            ]);
            setMedicines(medsData);
            setBatches(batchesData);

            // Calc stock cache
            const map = new Map<string, number>();
            batchesData.forEach(b => {
                const current = map.get(b.medicineId) || 0;
                map.set(b.medicineId, current + b.currentQuantity);
            });
            setStockMap(map);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredMedicines = medicines.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addToCart = (medicine: Medicine) => {
        const available = stockMap.get(medicine.id) || 0;
        if (available <= 0) {
            alert("Sản phẩm này đã hết hàng!");
            return;
        }

        setCart(prev => {
            const existing = prev.find(i => i.medicine.id === medicine.id);
            if (existing) return prev; // Already in cart
            return [...prev, { medicine, quantity: 1, price: 0 }];
        });
    };

    const updateQuantity = (medId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.medicine.id === medId) {
                const newQty = Math.max(1, item.quantity + delta);
                // Check stock
                const stock = stockMap.get(medId) || 0;
                if (newQty > stock) {
                    alert(`Chỉ còn ${stock} sản phẩm trong kho!`);
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const updatePrice = (medId: string, newPrice: number) => {
        setCart(prev => prev.map(item => {
            if (item.medicine.id === medId) {
                return { ...item, price: newPrice };
            }
            return item;
        }));
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
                price: item.price
            }));

            await PharmacyService.createSale({
                patientName,
                status: 'completed',
                createdBy: 'current_user_placeholder'
            }, orderItems);

            alert("Thanh toán thành công!");
            setCart([]);
            setPatientName("Khách lẻ");
            loadData(); // Refresh stock
        } catch (e: any) {
            console.error(e);
            alert("Lỗi thanh toán: " + e.message);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] md:flex-row gap-6">
            {/* Left: Product List */}
            <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                    <h2 className="text-2xl font-bold">Bán hàng (POS)</h2>
                    <div className="relative w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm thuốc..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="flex-1 overflow-auto border-none shadow-none bg-transparent">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                        {loading ? (
                            <div className="col-span-4 text-center py-12">Đang tải dữ liệu...</div>
                        ) : filteredMedicines.map(med => {
                            const stock = stockMap.get(med.id) || 0;
                            return (
                                <Card
                                    key={med.id}
                                    className={`cursor-pointer hover:border-primary transition-colors ${stock === 0 ? 'opacity-60 grayscale' : ''}`}
                                    onClick={() => addToCart(med)}
                                >
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex justify-between items-start">
                                            <span className="font-mono text-xs text-muted-foreground">{med.sku}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {stock} {med.unit}
                                            </span>
                                        </div>
                                        <CardTitle className="text-base line-clamp-2 min-h-[3rem]">{med.name}</CardTitle>
                                    </CardHeader>
                                </Card>
                            )
                        })}
                    </div>
                </Card>
            </div>

            {/* Right: Cart */}
            <Card className="w-full md:w-[400px] flex flex-col h-full shadow-lg border-l">
                <CardHeader className="border-b bg-muted/40">
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" /> Giỏ hàng
                    </CardTitle>
                    <div className="pt-4">
                        <Label className="text-xs text-muted-foreground">Khách hàng</Label>
                        <div className="flex gap-2">
                            <Input
                                value={patientName}
                                onChange={e => setPatientName(e.target.value)}
                                className="bg-white"
                            />
                            <Button variant="outline" size="icon"><User className="w-4 h-4" /></Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                            <ShoppingCart className="w-12 h-12 opacity-20" />
                            <p>Giỏ hàng trống</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {cart.map(item => (
                                <div key={item.medicine.id} className="p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="font-medium">{item.medicine.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 text-red-500 p-0"
                                            onClick={() => removeFromCart(item.medicine.id)}
                                        >
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center border rounded-md">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-r-none px-0" onClick={() => updateQuantity(item.medicine.id, -1)}><Minus className="w-3 h-3" /></Button>
                                            <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-l-none px-0" onClick={() => updateQuantity(item.medicine.id, 1)}><Plus className="w-3 h-3" /></Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">Giá:</span>
                                            <Input
                                                type="number"
                                                className="w-24 h-8 text-right"
                                                value={item.price}
                                                onChange={e => updatePrice(item.medicine.id, Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right text-sm font-bold text-blue-600">
                                        {(item.quantity * item.price).toLocaleString()} đ
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                <div className="border-t bg-muted/40 p-4 space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>Tổng tiền:</span>
                        <span>{totalAmount.toLocaleString()} đ</span>
                    </div>
                    <Button size="lg" className="w-full gap-2" onClick={handleCheckout} disabled={cart.length === 0}>
                        <CreditCard className="w-5 h-5" /> Thanh toán
                    </Button>
                </div>
            </Card>
        </div>
    );
}
