"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Loader2, Edit, Trash, Upload } from "lucide-react";
import { ServiceItem } from "@/types/clinic";
import { ServiceCatalogService } from "@/lib/services/service-catalog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ServicesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<ServiceItem>>({
        name: "",
        type: "consultation",
        price: 0,
        unit: "Lần",
        isActive: true
    });

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        setLoading(true);
        try {
            const data = await ServiceCatalogService.getAll();
            setServices(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price === undefined) return;

        try {
            if (currentId) {
                await ServiceCatalogService.update(currentId, formData);
            } else {
                await ServiceCatalogService.add(formData as Omit<ServiceItem, 'id'>);
            }
            setIsDialogOpen(false);
            setFormData({ name: "", type: "consultation", price: 0, unit: "Lần", isActive: true });
            setCurrentId(null);
            loadServices();
        } catch (error) {
            alert("Lỗi khi lưu dịch vụ");
        }
    };

    const handleOpenAdd = () => {
        setCurrentId(null);
        setFormData({ name: "", type: "consultation", price: 0, unit: "Lần", isActive: true });
        setIsDialogOpen(true);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split('\n');
            let count = 0;
            setLoading(true);

            try {
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const [name, typeRaw, unit, priceRaw] = line.split(',').map(s => s.trim());
                    if (!name) continue;

                    let type: any = 'consultation';
                    const t = typeRaw?.toLowerCase();
                    if (t === 'xn' || t === 'lab' || t === 'xét nghiệm') type = 'lab';
                    else if (t === 'tt' || t === 'procedure' || t === 'thủ thuật') type = 'procedure';
                    else if (t === 'cls' || t === 'paraclinical' || t === 'cận lâm sàng') type = 'paraclinical';
                    else if (t === 'goi' || t === 'package') type = 'package';

                    const price = parseInt(priceRaw) || 0;

                    await ServiceCatalogService.add({
                        name,
                        type,
                        unit: unit || 'Lần',
                        price,
                        isActive: true
                    });
                    count++;
                }
                alert(`Đã nhập thành công ${count} dịch vụ!`);
                loadServices();
            } catch (error) {
                console.error(error);
                alert("Lỗi khi nhập file.");
            } finally {
                setLoading(false);
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Danh mục Dịch vụ</h2>

                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv,.txt"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleImport}
                            title="Nhập từ CSV (Tên, Loại, Đơn vị, Giá)"
                        />
                        <Button variant="outline">
                            <Upload className="w-4 h-4 mr-2" />
                            Nhập từ file
                        </Button>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleOpenAdd}>
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm dịch vụ
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{currentId ? "Sửa dịch vụ" : "Thêm dịch vụ mới"}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Tên dịch vụ</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Loại dịch vụ</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="consultation">Khám bệnh</SelectItem>
                                                <SelectItem value="procedure">Thủ thuật</SelectItem>
                                                <SelectItem value="paraclinical">Cận lâm sàng</SelectItem>
                                                <SelectItem value="lab">Xét nghiệm</SelectItem>
                                                <SelectItem value="package">Gói/Combo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Đơn vị tính</Label>
                                        <Input
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Đơn giá (VNĐ)</Label>
                                    <Input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                                <Button onClick={handleSave}>Lưu dịch vụ</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm kiếm dịch vụ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tên dịch vụ</TableHead>
                            <TableHead>Loại</TableHead>
                            <TableHead>Đơn vị</TableHead>
                            <TableHead className="text-right">Đơn giá (VNĐ)</TableHead>
                            <TableHead>Trạng thái</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : filteredServices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Chưa có dịch vụ nào. Hãy thêm mới!
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredServices.map((service) => (
                                <TableRow key={service.id}>
                                    <TableCell className="font-medium">{service.name}</TableCell>
                                    <TableCell className="capitalize">{service.type}</TableCell>
                                    <TableCell>{service.unit}</TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(service.price)}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${service.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {service.isActive ? 'Hoạt động' : 'Ngưng'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                setCurrentId(service.id);
                                                setFormData({ ...service });
                                                setIsDialogOpen(true);
                                            }}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={async () => {
                                                if (confirm("Chắc chắn xóa dịch vụ này?")) {
                                                    await ServiceCatalogService.delete(service.id);
                                                    loadServices();
                                                }
                                            }}>
                                                <Trash className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
