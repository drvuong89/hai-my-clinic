"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ShoppingCart, Trash, Plus, Minus, CreditCard, User } from "lucide-react";
import { PharmacyService } from "@/lib/services/pharmacy-service";
import { Medicine, InventoryBatch } from "@/types/clinic";

interface CartItem {
    medicine: Medicine;
    quantity: number;
    price: number;
}

export function PointOfSale() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
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
        <div className="flex flex-col md:flex-row gap-6 h-[700px]">
            {/* Left: Product List */}
            <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm thuốc để bán..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <Card className="flex-1 overflow-auto border-none shadow-none bg-muted/10">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {loading ? (
                                <div className="col-span-3 text-center py-12">Đang tải dữ liệu...</div>
                            ) : filteredMedicines.map(med => {
                                const stock = stockMap.get(med.id) || 0;
                                return (
                                    <div
                                        key={med.id}
                                        className={`bg-card border rounded-lg p-3 cursor-pointer hover:border-primary transition-all ${stock === 0 ? 'opacity-60 grayscale' : ''}`}
                                        onClick={() => addToCart(med)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-mono text-[10px] text-muted-foreground">{med.sku}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {stock} {med.unit}
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{med.name}</h4>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right: Cart */}
            <Card className="w-full md:w-[380px] flex flex-col h-full shadow-lg border-l rounded-none md:rounded-lg">
                <CardHeader className="border-b bg-muted/30 py-3">
                    <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="font-semibold">Giỏ hàng</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <Input
                            value={patientName}
                            onChange={e => setPatientName(e.target.value)}
                            className="h-8 bg-white text-sm"
                            placeholder="Tên khách hàng..."
                        />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 opacity-50">
                            <ShoppingCart className="w-10 h-10" />
                            <p className="text-sm">Chưa có sản phẩm</p>
                        </div>
                    ) : (
                        <div className="divide-y text-sm">
                            {cart.map(item => (
                                <div key={item.medicine.id} className="p-3 space-y-2 bg-card">
                                    <div className="flex justify-between font-medium">
                                        <span>{item.medicine.name}</span>
                                        <button onClick={() => removeFromCart(item.medicine.id)} className="text-red-500 hover:text-red-700">
                                            <Trash className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center border rounded bg-background">
                                            <button className="px-2 py-1 hover:bg-muted" onClick={() => updateQuantity(item.medicine.id, -1)}><Minus className="w-3 h-3" /></button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <button className="px-2 py-1 hover:bg-muted" onClick={() => updateQuantity(item.medicine.id, 1)}><Plus className="w-3 h-3" /></button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="number"
                                                className="w-20 h-7 text-right text-xs"
                                                value={item.price}
                                                onChange={e => updatePrice(item.medicine.id, Number(e.target.value))}
                                            />
                                            <span className="text-[10px] text-muted-foreground">đ</span>
                                        </div>
                                    </div>
                                    <div className="text-right font-bold text-blue-600">
                                        {(item.quantity * item.price).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                <div className="border-t bg-muted/30 p-4 space-y-3">
                    <div className="flex justify-between items-center text-base font-bold">
                        <span>Tổng tiền:</span>
                        <span className="text-primary">{totalAmount.toLocaleString()} đ</span>
                    </div>
                    <Button className="w-full" onClick={handleCheckout} disabled={cart.length === 0}>
                        <CreditCard className="w-4 h-4 mr-2" /> Thanh toán
                    </Button>
                </div>
            </Card>
        </div>
    );
}
