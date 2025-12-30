"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShoppingCart, Trash, Plus, Minus, CreditCard, User, Globe, Store, ClipboardList, Stethoscope, RefreshCcw, Banknote } from "lucide-react";
import { PharmacyService } from "@/lib/services/pharmacy-service";
import { Medicine, InventoryBatch } from "@/types/clinic";

interface CartItem {
    medicine: Medicine;
    quantity: number;
    price: number;
}

export function PointOfSale() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [batches, setBatches] = useState<InventoryBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Tabs: 'lookup', 'retail' (walk-in), 'online'
    const [activeTab, setActiveTab] = useState("retail");

    // Stock Cache
    const [stockMap, setStockMap] = useState<Map<string, { total: number, batches: InventoryBatch[] }>>(new Map());

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [patientName, setPatientName] = useState("Khách lẻ");
    // Customer Info (Ad-hoc)
    const [customerInfo, setCustomerInfo] = useState({
        phone: "",
        address: "",
        yob: "",
        gender: "male" as "male" | "female"
    });

    const [salesHistory, setSalesHistory] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [medsData, batchesData, salesData] = await Promise.all([
                PharmacyService.getMedicines(),
                PharmacyService.getBatches(),
                PharmacyService.getSales()
            ]);
            setMedicines(medsData);
            setBatches(batchesData);
            setSalesHistory(salesData);

            // Calc stock cache
            const map = new Map<string, { total: number, batches: InventoryBatch[] }>();
            medsData.forEach(m => map.set(m.id, { total: 0, batches: [] }));

            batchesData.forEach(b => {
                if (b.currentQuantity > 0) {
                    const current = map.get(b.medicineId);
                    if (current) {
                        current.total += b.currentQuantity;
                        current.batches.push(b);
                        // Sort batches by earliest expiry
                        current.batches.sort((x, y) => x.expiryDate.localeCompare(y.expiryDate));
                    }
                }
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
        const stockInfo = stockMap.get(medicine.id);
        const available = stockInfo?.total || 0;

        if (available <= 0) {
            alert("Sản phẩm này đã hết hàng!");
            return;
        }

        setCart(prev => {
            const existing = prev.find(i => i.medicine.id === medicine.id);
            if (existing) return prev; // Already in cart (user can increase qty there)
            return [...prev, { medicine, quantity: 1, price: medicine.sellPrice || 0 }];
        });
    };

    const updateQuantity = (medId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.medicine.id === medId) {
                const newQty = Math.max(1, item.quantity + delta);
                const stock = stockMap.get(medId)?.total || 0;
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
        if (!patientName && activeTab !== 'lookup') {
            alert("Vui lòng nhập tên khách hàng");
            return;
        }

        try {
            const orderItems = cart.map(item => ({
                medicineId: item.medicine.id,
                quantity: item.quantity,
                price: item.price
            }));

            let saleSource: 'clinic' | 'online' | 'retail' = 'clinic';
            if (activeTab === 'online') saleSource = 'online';
            if (activeTab === 'retail') saleSource = 'retail';

            const finalPatientName = activeTab === 'online'
                ? `${patientName} (${customerInfo.phone})`
                : patientName;

            // 1. Create Pharmacy Sale Record
            await PharmacyService.createSale({
                patientName: finalPatientName,
                customerPhone: customerInfo.phone,
                customerAddress: customerInfo.address,
                customerYob: customerInfo.yob ? parseInt(customerInfo.yob) : undefined,
                customerGender: customerInfo.gender,
                status: 'completed',
                createdBy: 'current_user',
                saleSource: saleSource
            }, orderItems);

            alert("Thanh toán thành công!");
            setCart([]);
            setPatientName(activeTab === 'retail' ? "Khách lẻ" : "");
            setCustomerInfo({ phone: "", address: "", yob: "", gender: "male" });
            loadData(); // Refresh stock

        } catch (e: any) {
            console.error(e);
            alert("Lỗi thanh toán: " + e.message);
        }
    };

    const handleExportSales = async () => {
        if (!confirm("Xuất toàn bộ lịch sử bán hàng ra file Excel (CSV)?")) return;
        try {
            const allBookings = await PharmacyService.getSales();
            const bookings = allBookings.filter(b => b.saleSource === 'retail' || b.saleSource === 'online');

            // Generate CSV
            const headers = ["Mã đơn", "Ngày tạo", "Khách hàng", "SĐT", "Địa chỉ", "Năm sinh", "Tổng tiền", "Nguồn", "Chi tiết"];
            const rows = bookings.map(b => [
                b.id,
                new Date(b.createdAt).toLocaleString('vi-VN'),
                b.patientName,
                b.customerPhone || "",
                b.customerAddress || "",
                b.customerYob || "",
                b.totalAmount,
                b.saleSource,
                b.items.map(i => `${i.quantity}x ${i.medicineId}`).join("; ")
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map(r => r.map(c => `"${c}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Bao_cao_ban_hang_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error(e);
            alert("Lỗi xuất file");
        }
    };




    // Shared Product Grid Component
    const ProductGrid = () => (
        <div className="flex-1 flex flex-col space-y-4 min-h-0 bg-white p-4 rounded-lg border shadow-sm h-full">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm thuốc (Tên hoặc Mã SKU)..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex-1 overflow-auto pr-2">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {loading ? (
                        <div className="col-span-full text-center py-12 text-muted-foreground">Đang tải dữ liệu...</div>
                    ) : filteredMedicines.map(med => {
                        const stockInfo = stockMap.get(med.id);
                        const stock = stockInfo?.total || 0;
                        return (
                            <div
                                key={med.id}
                                className={`
                                    relative flex flex-col justify-between
                                    bg-card border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md hover:border-blue-300
                                    ${stock === 0 ? 'opacity-60 grayscale bg-slate-50' : 'bg-white'}
                                `}
                                onClick={() => addToCart(med)}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono text-[10px] text-muted-foreground bg-slate-100 px-1 rounded">{med.sku}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {stock} {med.unit}
                                        </span>
                                    </div>
                                    <h4 className="font-medium text-sm line-clamp-2 mb-1 min-h-[2.5rem]" title={med.name}>{med.name}</h4>
                                    <div className="text-xs text-muted-foreground line-clamp-1 italic">{med.category}</div>
                                </div>
                                <div className="mt-2 text-right font-bold text-blue-700">
                                    {med.sellPrice?.toLocaleString()} đ
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-[750px] flex flex-col space-y-2">
            <Tabs
                value={activeTab}
                onValueChange={val => {
                    setActiveTab(val);
                    setCart([]); // Clear cart when switching modes for safety
                    setPatientName(val === 'retail' ? "Khách lẻ" : "");
                }}
                className="flex-1 flex flex-col"
            >
                <div className="flex items-center justify-between px-1">
                    <TabsList className="grid w-full md:w-[800px] grid-cols-4">
                        <TabsTrigger value="lookup" className="gap-2">
                            <ClipboardList className="w-4 h-4" /> Danh sách thuốc (Tra cứu)
                        </TabsTrigger>
                        <TabsTrigger value="retail" className="gap-2">
                            <Store className="w-4 h-4" /> Bán lẻ tại quầy
                        </TabsTrigger>
                        <TabsTrigger value="online" className="gap-2">
                            <Globe className="w-4 h-4" /> Khách mua Online
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <ClipboardList className="w-4 h-4" /> Lịch sử đơn hàng
                        </TabsTrigger>
                    </TabsList>

                    {/* REVENUE CARD */}
                    <Card className="bg-orange-50 border-orange-100 ml-4 hidden md:block">
                        <CardContent className="p-2 flex items-center gap-3">
                            <div className="bg-orange-200 p-2 rounded-full"><Banknote className="w-4 h-4 text-orange-700" /></div>
                            <div>
                                <p className="text-[10px] text-orange-600 font-bold uppercase">Doanh thu hôm nay</p>
                                <p className="text-lg font-bold text-orange-900 leading-none">
                                    {loading ? "..." : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                        salesHistory
                                            .filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString())
                                            .reduce((sum, s) => sum + (s.totalAmount || 0), 0)
                                    )}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* TAB 1: LOOKUP (READ ONLY) */}
                <TabsContent value="lookup" className="flex-1 border rounded-lg p-4 bg-white mt-4 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tra cứu nhanh..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-muted-foreground italic">
                            *Dữ liệu tồn kho và hạn dùng chi tiết
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto border rounded-md">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0">
                                <TableRow>
                                    <TableHead>Mã SKU</TableHead>
                                    <TableHead>Tên thuốc</TableHead>
                                    <TableHead>Đơn vị</TableHead>
                                    <TableHead className="text-right">Giá bán</TableHead>
                                    <TableHead className="text-right">Tổng tồn</TableHead>
                                    <TableHead>Hạn dùng (Lô gần nhất)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMedicines.map(med => {
                                    const stockInfo = stockMap.get(med.id);
                                    const nearestBatch = stockInfo?.batches?.[0];
                                    return (
                                        <TableRow key={med.id} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs">{med.sku}</TableCell>
                                            <TableCell className="font-medium">{med.name}</TableCell>
                                            <TableCell>{med.unit}</TableCell>
                                            <TableCell className="text-right text-blue-600 font-bold">{med.sellPrice?.toLocaleString()} đ</TableCell>
                                            <TableCell className="text-right font-bold">{stockInfo?.total || 0}</TableCell>
                                            <TableCell className="text-xs">
                                                {nearestBatch ? (
                                                    <span className={`${new Date(nearestBatch.expiryDate) < new Date() ? 'text-red-500 font-bold' : ''}`}>
                                                        {nearestBatch.expiryDate} (Lo: {nearestBatch.batchNumber})
                                                    </span>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* TAB 2: RETAIL SALES */}
                {/* TAB 2: RETAIL SALES */}
                <TabsContent value="retail" className="flex-1 flex gap-4 mt-4 min-h-0">
                    <ProductGrid />
                    {/* INLINED RETAIL CART */}
                    <Card className="w-full md:w-[400px] flex flex-col h-full shadow-lg border-l rounded-none md:rounded-lg">
                        <CardHeader className="border-b bg-muted/30 py-3">
                            <div className="flex items-center gap-2 mb-2">
                                <ShoppingCart className="w-4 h-4" />
                                <span className="font-semibold">Giỏ hàng Bán lẻ</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={patientName}
                                        onChange={e => setPatientName(e.target.value)}
                                        className="h-8 bg-white text-sm font-bold"
                                        placeholder="Tên khách hàng..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        value={customerInfo.phone}
                                        onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                        className="h-8 bg-white text-sm"
                                        placeholder="SĐT..."
                                    />
                                    <Input
                                        value={customerInfo.yob}
                                        onChange={e => setCustomerInfo({ ...customerInfo, yob: e.target.value })}
                                        className="h-8 bg-white text-sm"
                                        placeholder="Năm sinh..."
                                        type="number"
                                    />
                                </div>
                                <Input
                                    value={customerInfo.address}
                                    onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                                    className="h-8 bg-white text-sm"
                                    placeholder="Địa chỉ..."
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
                                        <div key={item.medicine.id} className="p-3 space-y-2 bg-card hover:bg-slate-50">
                                            <div className="flex justify-between font-medium">
                                                <span>{item.medicine.name}</span>
                                                <button onClick={() => removeFromCart(item.medicine.id)} className="text-red-500 hover:text-red-700">
                                                    <Trash className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center border rounded bg-background shadow-sm">
                                                    <button className="px-2 py-1 hover:bg-muted" onClick={() => updateQuantity(item.medicine.id, -1)}><Minus className="w-3 h-3" /></button>
                                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                    <button className="px-2 py-1 hover:bg-muted" onClick={() => updateQuantity(item.medicine.id, 1)}><Plus className="w-3 h-3" /></button>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        className="w-24 h-7 text-right text-xs font-mono"
                                                        value={item.price}
                                                        onChange={e => updatePrice(item.medicine.id, Number(e.target.value))}
                                                    />
                                                    <span className="text-[10px] text-muted-foreground">đ</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                                                <span>Đơn vị: {item.medicine.unit}</span>
                                                <span className="font-bold text-blue-600 text-sm">
                                                    {(item.quantity * item.price).toLocaleString()}
                                                </span>
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
                            <Button className="w-full" size="lg" onClick={handleCheckout} disabled={cart.length === 0}>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Thanh toán & Hoàn tất
                            </Button>
                        </div>
                    </Card>
                </TabsContent>

                {/* TAB 4: ONLINE SALES */}
                <TabsContent value="online" className="flex-1 flex gap-4 mt-4 min-h-0">
                    <ProductGrid />
                    {/* INLINED ONLINE CART */}
                    <Card className="w-full md:w-[400px] flex flex-col h-full shadow-lg border-l rounded-none md:rounded-lg">
                        <CardHeader className="border-b bg-muted/30 py-3">
                            <div className="flex items-center gap-2 mb-2">
                                <ShoppingCart className="w-4 h-4" />
                                <span className="font-semibold">Giỏ hàng Online</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={patientName}
                                        onChange={e => setPatientName(e.target.value)}
                                        className="h-8 bg-white text-sm font-bold"
                                        placeholder="Tên khách hàng..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        value={customerInfo.phone}
                                        onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                        className="h-8 bg-white text-sm"
                                        placeholder="SĐT..."
                                    />
                                    <Input
                                        value={customerInfo.yob}
                                        onChange={e => setCustomerInfo({ ...customerInfo, yob: e.target.value })}
                                        className="h-8 bg-white text-sm"
                                        placeholder="Năm sinh..."
                                        type="number"
                                    />
                                </div>
                                <Input
                                    value={customerInfo.address}
                                    onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                                    className="h-8 bg-white text-sm"
                                    placeholder="Địa chỉ..."
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
                                        <div key={item.medicine.id} className="p-3 space-y-2 bg-card hover:bg-slate-50">
                                            <div className="flex justify-between font-medium">
                                                <span>{item.medicine.name}</span>
                                                <button onClick={() => removeFromCart(item.medicine.id)} className="text-red-500 hover:text-red-700">
                                                    <Trash className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center border rounded bg-background shadow-sm">
                                                    <button className="px-2 py-1 hover:bg-muted" onClick={() => updateQuantity(item.medicine.id, -1)}><Minus className="w-3 h-3" /></button>
                                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                    <button className="px-2 py-1 hover:bg-muted" onClick={() => updateQuantity(item.medicine.id, 1)}><Plus className="w-3 h-3" /></button>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        className="w-24 h-7 text-right text-xs font-mono"
                                                        value={item.price}
                                                        onChange={e => updatePrice(item.medicine.id, Number(e.target.value))}
                                                    />
                                                    <span className="text-[10px] text-muted-foreground">đ</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                                                <span>Đơn vị: {item.medicine.unit}</span>
                                                <span className="font-bold text-blue-600 text-sm">
                                                    {(item.quantity * item.price).toLocaleString()}
                                                </span>
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
                            <Button className="w-full" size="lg" onClick={handleCheckout} disabled={cart.length === 0}>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Tạo đơn Online
                            </Button>
                        </div>
                    </Card>
                </TabsContent>

                {/* TAB 5: HISTORY */}
                <TabsContent value="history" className="flex-1 flex flex-col gap-4 mt-4 min-h-0 bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Lịch sử bán hàng</h3>
                        <Button variant="outline" size="sm" onClick={handleExportSales}>
                            <ClipboardList className="w-4 h-4 mr-2" /> Xuất Báo Cáo (Excel/CSV)
                        </Button>
                    </div>

                    <div className="flex-1 overflow-auto border rounded-md">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0">
                                <TableRow>
                                    <TableHead>Mã Đơn</TableHead>
                                    <TableHead>Ngày tạo</TableHead>
                                    <TableHead>Khách hàng</TableHead>
                                    <TableHead>SĐT</TableHead>
                                    <TableHead>Địa chỉ</TableHead>
                                    <TableHead className="text-right">Tổng tiền</TableHead>
                                    <TableHead>Nguồn</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {salesHistory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Chưa có đơn hàng nào
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    salesHistory.map((order: any) => (
                                        <TableRow key={order.id} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {order.id.slice(0, 8)}...
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {new Date(order.createdAt).toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell className="font-medium">{order.patientName}</TableCell>
                                            <TableCell>{order.customerPhone || "-"}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={order.customerAddress}>
                                                {order.customerAddress || "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-blue-600">
                                                {order.totalAmount.toLocaleString()} đ
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-xs px-2 py-1 rounded-full border ${order.saleSource === 'online' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    order.saleSource === 'retail' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {order.saleSource === 'online' ? 'Online' :
                                                        order.saleSource === 'retail' ? 'Tại quầy' : 'Khám bệnh'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
