"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash, Pill } from "lucide-react";
import { InventoryService } from "@/lib/services/inventory-service";
import { ServiceItem } from "@/types/clinic";

export default function PharmacySettingsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [medicines, setMedicines] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form state
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ServiceItem>>({
        name: "",
        unit: "Viên",
        price: 0,
        costPrice: 0,
        quantity: 0,
        importDate: "",
        usage: "",
        sku: "",
        isActive: true
    });

    const loadMedicines = async () => {
        setLoading(true);
        try {
            const data = await InventoryService.getMedicines();
            setMedicines(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMedicines();
    }, []);

    const filteredMedicines = medicines.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenAdd = () => {
        setCurrentId(null);
        setFormData({
            name: "",
            unit: "Viên",
            price: 0,
            costPrice: 0,
            quantity: 0,
            importDate: new Date().toISOString().split('T')[0],
            usage: "",
            sku: "",
            isActive: true
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (item: ServiceItem) => {
        setCurrentId(item.id);
        setFormData(item);
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) {
            alert("Vui lòng nhập tên thuốc");
            return;
        }

        try {
            if (currentId) {
                await InventoryService.updateMedicine(currentId, formData);
            } else {
                await InventoryService.addMedicine({
                    name: formData.name!,
                    unit: formData.unit || "Viên",
                    price: Number(formData.price) || 0,
                    costPrice: Number(formData.costPrice) || 0,
                    quantity: Number(formData.quantity) || 0,
                    importDate: formData.importDate || new Date().toISOString().split('T')[0],
                    usage: formData.usage || "",
                    sku: formData.sku || "",
                    type: "pharmacy",
                    isActive: true
                });
            }
            setIsDialogOpen(false);
            loadMedicines();
        } catch (e) {
            console.error(e);
            alert("Lỗi lưu dữ liệu");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Chắc chắn xóa thuốc này?")) {
            await InventoryService.deleteMedicine(id);
            loadMedicines();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Kho Thuốc</h2>
                    <p className="text-muted-foreground">Quản lý danh mục thuốc, giá và tồn kho.</p>
                </div>
                <Button onClick={handleOpenAdd} className="gap-2">
                    <Plus className="w-4 h-4" /> Thêm thuốc
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Danh sách thuốc</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm theo tên hoặc mã..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mã / SKU</TableHead>
                                <TableHead>Tên thuốc</TableHead>
                                <TableHead>Đơn vị</TableHead>
                                <TableHead className="text-right">Tồn kho</TableHead>
                                <TableHead>Ngày nhập</TableHead>
                                <TableHead className="text-right">Giá nhập</TableHead>
                                <TableHead className="text-right">Tổng nhập</TableHead>
                                <TableHead className="text-right">Giá bán</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8">Đang tải...</TableCell>
                                </TableRow>
                            ) : filteredMedicines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu thuốc.</TableCell>
                                </TableRow>
                            ) : filteredMedicines.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono text-xs">{item.sku || "---"}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Pill className="w-4 h-4 text-blue-500" />
                                            {item.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{item.unit}</TableCell>
                                    <TableCell className={`text-right font-bold ${item.quantity! < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                        {item.quantity}
                                    </TableCell>
                                    <TableCell className="text-xs">{item.importDate || "--"}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{item.costPrice?.toLocaleString()}</TableCell>
                                    <TableCell className="text-right font-medium text-blue-900">
                                        {((item.costPrice || 0) * (item.quantity || 0)).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{item.price.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                                                <Trash className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{currentId ? "Cập nhật thuốc" : "Thêm thuốc mới"}</DialogTitle>
                        <DialogDescription>Nhập thông tin chi tiết thuốc, giá và số lượng.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Tên thuốc <span className="text-red-500">*</span></Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Panadol Extra" />
                            </div>
                            <div className="space-y-2">
                                <Label>Mã thuốc (SKU)</Label>
                                <Input value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} placeholder="VD: PAN001" />
                            </div>
                            <div className="space-y-2">
                                <Label>Đơn vị tính</Label>
                                <Input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="Viên, Vỉ, Hộp..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Giá nhập (VNĐ)</Label>
                                <Input type="number" value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Giá bán (VNĐ)</Label>
                                <Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Số lượng tồn đầu kỳ</Label>
                                <Input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Cách dùng mặc định</Label>
                                <Input value={formData.usage} onChange={e => setFormData({ ...formData, usage: e.target.value })} placeholder="Sáng 1, Chiều 1, sau ăn..." />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSave}>Lưu thông tin</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
