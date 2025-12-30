"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash, Pill, CheckCircle, XCircle } from "lucide-react";
import { PharmacyService } from "@/lib/services/pharmacy-service";
import { Medicine } from "@/types/clinic";

export function MedicineCatalog() {
    const [searchTerm, setSearchTerm] = useState("");
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form state
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Medicine>>({
        name: "",
        unit: "Viên",
        usage: "",
        sku: "",
        category: "",
        minStockLevel: 10,
        costPrice: 0,
        sellPrice: 0,
        isActive: true
    });

    const loadMedicines = async () => {
        setLoading(true);
        try {
            const data = await PharmacyService.getMedicines();
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
            usage: "",
            sku: "",
            category: "",
            minStockLevel: 10,
            costPrice: 0,
            sellPrice: 0,
            isActive: true
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (item: Medicine) => {
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
                await PharmacyService.updateMedicine(currentId, formData);
            } else {
                await PharmacyService.addMedicine(formData as Omit<Medicine, "id">);
            }
            setIsDialogOpen(false);
            loadMedicines();
        } catch (e: any) {
            console.error("Error saving medicine:", e);
            alert(`Lỗi lưu dữ liệu: ${e.message || "Vui lòng thử lại"}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Chắc chắn xóa thuốc này? Hành động này không thể hoàn tác.")) {
            await PharmacyService.deleteMedicine(id);
            loadMedicines();
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm tên hoặc mã..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={handleOpenAdd} className="gap-2">
                    <Plus className="w-4 h-4" /> Thêm định nghĩa mới
                </Button>
            </div>

            <Card className="bg-slate-50 border-dashed border-2">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <h4 className="font-semibold text-sm">Nhập từ File (CSV/Excel)</h4>
                        <p className="text-xs text-muted-foreground">Tải lên danh sách thuốc định dạng: <span className="font-mono">Mã, Tên, Đơn vị, Giá nhập, Giá bán</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="file"
                            accept=".csv, .txt"
                            className="w-[250px] bg-white h-9 text-sm"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                    const text = event.target?.result as string;
                                    const lines = text.split('\n');
                                    let count = 0;
                                    // Simple CSV parsing
                                    for (let i = 1; i < lines.length; i++) {
                                        const line = lines[i].trim();
                                        if (!line) continue;
                                        // Expect: SKU, Name, Unit, Category, SellPrice
                                        const parts = line.split(',').map(s => s.trim());
                                        if (parts.length >= 2) {
                                            // Ensure at least SKU/Name
                                            const [sku, name, unit, category, priceStr] = parts;
                                            if (name) {
                                                await PharmacyService.addMedicine({
                                                    name,
                                                    sku: sku || "",
                                                    unit: unit || 'Viên',
                                                    category: category || 'Tổng hợp',
                                                    sellPrice: Number(priceStr) || 0,
                                                    minStockLevel: 10,
                                                    isActive: true
                                                });
                                                count++;
                                            }
                                        }
                                    }
                                    alert(`Đã nhập thành công ${count} loại thuốc!`);
                                    loadMedicines();
                                    e.target.value = ''; // Reset
                                };
                                reader.readAsText(file);
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mã (SKU)</TableHead>
                                <TableHead>Tên thuốc</TableHead>
                                <TableHead>Phân loại</TableHead>
                                <TableHead>Đơn vị</TableHead>
                                <TableHead>Cách dùng mặc định</TableHead>
                                <TableHead className="text-center">Trạng thái</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell>
                                </TableRow>
                            ) : filteredMedicines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu thuốc.</TableCell>
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
                                    <TableCell>{item.category || "---"}</TableCell>
                                    <TableCell>{item.unit}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.usage || "---"}</TableCell>
                                    <TableCell className="text-center">
                                        {item.isActive ?
                                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> :
                                            <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                                        }
                                    </TableCell>
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
                        <DialogTitle>{currentId ? "Sửa thông tin thuốc" : "Thêm định nghĩa thuốc mới"}</DialogTitle>
                        <DialogDescription>Chập các thông tin cơ bản và giá tham chiếu.</DialogDescription>
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
                                <Label>Đơn vị cơ bản</Label>
                                <Input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="Viên" />
                            </div>

                            {/* Packaging Configuration */}
                            <div className="col-span-2 grid grid-cols-3 gap-4 border p-3 rounded bg-slate-50">
                                <div className="space-y-2">
                                    <Label className="text-xs">Quy cách đóng gói</Label>
                                    <Input
                                        placeholder="VD: Hộp 10 vỉ"
                                        value={formData.packaging || ""}
                                        onChange={e => setFormData({ ...formData, packaging: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Số vỉ / Hộp</Label>
                                    <Input
                                        type="number"
                                        placeholder="1"
                                        value={formData.packagingSpecification?.boxToBlister || ""}
                                        onChange={e => setFormData({
                                            ...formData,
                                            packagingSpecification: { ...formData.packagingSpecification, boxToBlister: Number(e.target.value) }
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Số viên / Vỉ</Label>
                                    <Input
                                        type="number"
                                        placeholder="10"
                                        value={formData.packagingSpecification?.blisterToUnit || ""}
                                        onChange={e => setFormData({
                                            ...formData,
                                            packagingSpecification: { ...formData.packagingSpecification, blisterToUnit: Number(e.target.value) }
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Phân loại</Label>
                                <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="VD: Kháng sinh, Giảm đau" />
                            </div>
                            <div className="space-y-2">
                                <Label>Cảnh báo tồn kho ít nhất</Label>
                                <Input type="number" value={formData.minStockLevel?.toString()} onChange={e => setFormData({ ...formData, minStockLevel: Number(e.target.value) })} />
                            </div>

                            {/* Price Configuration */}
                            <div className="col-span-2 grid grid-cols-2 gap-4 border p-3 rounded bg-blue-50/50">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Giá Nhập / {formData.unit || "Đơn vị"}</Label>
                                    <Input
                                        type="number"
                                        className="bg-white font-bold"
                                        value={formData.costPrice}
                                        onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Giá Bán / {formData.unit || "Đơn vị"}</Label>
                                    <Input
                                        type="number"
                                        className="bg-white font-bold text-blue-700"
                                        value={formData.sellPrice}
                                        onChange={e => setFormData({ ...formData, sellPrice: Number(e.target.value) })}
                                    />
                                </div>

                                {/* Box Price Helper */}
                                {(formData.packagingSpecification?.boxToBlister && formData.packagingSpecification.blisterToUnit) && (
                                    <>
                                        <div className="col-span-2 text-xs text-muted-foreground italic border-t pt-2 mt-1">
                                            Công cụ tính nhanh từ giá Hộp (Tự động chia cho {(formData.packagingSpecification.boxToBlister * formData.packagingSpecification.blisterToUnit)} {formData.unit})
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Giá Nhập (Hộp)</Label>
                                            <Input
                                                type="number"
                                                placeholder="Nhập giá hộp..."
                                                className="bg-white/50"
                                                onChange={(e) => {
                                                    const boxPrice = Number(e.target.value);
                                                    const ratio = (formData.packagingSpecification?.boxToBlister || 1) * (formData.packagingSpecification?.blisterToUnit || 1);
                                                    if (ratio > 0 && boxPrice > 0) {
                                                        setFormData(prev => ({ ...prev, costPrice: Math.round(boxPrice / ratio) }));
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Giá Bán (Hộp)</Label>
                                            <Input
                                                type="number"
                                                placeholder="Nhập giá hộp..."
                                                className="bg-white/50"
                                                onChange={(e) => {
                                                    const boxPrice = Number(e.target.value);
                                                    const ratio = (formData.packagingSpecification?.boxToBlister || 1) * (formData.packagingSpecification?.blisterToUnit || 1);
                                                    if (ratio > 0 && boxPrice > 0) {
                                                        setFormData(prev => ({ ...prev, sellPrice: Math.round(boxPrice / ratio) }));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Cách dùng mặc định</Label>
                                <Input value={formData.usage} onChange={e => setFormData({ ...formData, usage: e.target.value })} placeholder="VD: Sáng 1, Chiều 1, sau ăn..." />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSave}>Lưu thông tin</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
