"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Package, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { PharmacyService } from "@/lib/services/pharmacy-service";
import { Medicine, InventoryBatch } from "@/types/clinic";

interface ConsolidatedStock {
    medicine: Medicine;
    totalQty: number;
    batches: InventoryBatch[];
}

export default function InventoryPage() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [batches, setBatches] = useState<InventoryBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    // Import Form State
    const [importData, setImportData] = useState<Partial<InventoryBatch>>({
        medicineId: "",
        batchNumber: "",
        expiryDate: "",
        importDate: new Date().toISOString().split('T')[0],
        costPrice: 0,
        originalQuantity: 0,
        supplier: ""
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [medsData, batchesData] = await Promise.all([
                PharmacyService.getMedicines(),
                PharmacyService.getBatches()
            ]);
            setMedicines(medsData);
            setBatches(batchesData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const consolidatedStock = useMemo(() => {
        const stockMap = new Map<string, ConsolidatedStock>();

        medicines.forEach(med => {
            stockMap.set(med.id, { medicine: med, totalQty: 0, batches: [] });
        });

        batches.forEach(batch => {
            if (batch.currentQuantity > 0) { // Only show active stock
                const entry = stockMap.get(batch.medicineId);
                if (entry) {
                    entry.totalQty += batch.currentQuantity;
                    entry.batches.push(batch);
                }
            }
        });

        return Array.from(stockMap.values()).filter(item =>
            item.medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.medicine.sku.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [medicines, batches, searchTerm]);

    const toggleRow = (medId: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(medId)) {
            newSet.delete(medId);
        } else {
            newSet.add(medId);
        }
        setExpandedRows(newSet);
    };

    const handleImportSave = async () => {
        if (!importData.medicineId || !importData.batchNumber || !importData.expiryDate || !importData.originalQuantity) {
            alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
            return;
        }

        try {
            await PharmacyService.addBatch({
                medicineId: importData.medicineId,
                batchNumber: importData.batchNumber,
                expiryDate: importData.expiryDate,
                importDate: importData.importDate!,
                costPrice: Number(importData.costPrice),
                originalQuantity: Number(importData.originalQuantity),
                supplier: importData.supplier || ""
            });
            setIsDialogOpen(false);
            setImportData({
                medicineId: "",
                batchNumber: "",
                expiryDate: "",
                importDate: new Date().toISOString().split('T')[0],
                costPrice: 0,
                originalQuantity: 0,
                supplier: ""
            });
            loadData();
        } catch (e) {
            alert("Lỗi nhập kho");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Kho & Nhập Hàng</h2>
                    <p className="text-muted-foreground">Quản lý nhập kho (Theo lô/Hạn dùng) và xem tồn kho.</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Nhập kho mới
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Tổng quan tồn kho</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm tên thuốc..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Tên thuốc</TableHead>
                                <TableHead>Đơn vị</TableHead>
                                <TableHead className="text-right">Tổng tồn kho</TableHead>
                                <TableHead className="text-right">Trạng thái</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-6">Đang tải...</TableCell></TableRow>
                            ) : consolidatedStock.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-6">Không có dữ liệu</TableCell></TableRow>
                            ) : consolidatedStock.map((item) => (
                                <>
                                    <TableRow key={item.medicine.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(item.medicine.id)}>
                                        <TableCell>
                                            {expandedRows.has(item.medicine.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </TableCell>
                                        <TableCell className="font-medium">{item.medicine.name} <span className="text-muted-foreground text-xs ml-2">({item.medicine.sku})</span></TableCell>
                                        <TableCell>{item.medicine.unit}</TableCell>
                                        <TableCell className="text-right font-bold text-lg">{item.totalQty}</TableCell>
                                        <TableCell className="text-right">
                                            {item.totalQty <= (item.medicine.minStockLevel || 0) && (
                                                <div className="flex items-center justify-end text-amber-600 gap-1 text-xs font-bold">
                                                    <AlertTriangle className="w-3 h-3" /> Sắp hết
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    {expandedRows.has(item.medicine.id) && (
                                        <TableRow className="bg-muted/30">
                                            <TableCell colSpan={5} className="p-0">
                                                <div className="p-4 pl-12">
                                                    <h4 className="font-semibold text-xs uppercase mb-2 text-muted-foreground">Chi tiết lô hàng</h4>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="h-8">
                                                                <TableHead className="h-8 text-xs">Số lô</TableHead>
                                                                <TableHead className="h-8 text-xs">Hạn dùng</TableHead>
                                                                <TableHead className="h-8 text-xs text-right">Giá nhập</TableHead>
                                                                <TableHead className="h-8 text-xs text-right">SL Gốc</TableHead>
                                                                <TableHead className="h-8 text-xs text-right">SL Hiện tại</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {item.batches.map(batch => (
                                                                <TableRow key={batch.id} className="h-8">
                                                                    <TableCell className="py-1 text-xs font-mono">{batch.batchNumber}</TableCell>
                                                                    <TableCell className="py-1 text-xs">{batch.expiryDate}</TableCell>
                                                                    <TableCell className="py-1 text-xs text-right">{batch.costPrice.toLocaleString()}</TableCell>
                                                                    <TableCell className="py-1 text-xs text-right text-muted-foreground">{batch.originalQuantity}</TableCell>
                                                                    <TableCell className="py-1 text-xs text-right font-bold">{batch.currentQuantity}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nhập kho mới</DialogTitle>
                        <DialogDescription>Nhập thông tin lô hàng. Tồn kho sẽ được cộng dồn theo Lô.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Chọn Thuốc <span className="text-red-500">*</span></Label>
                            <Select
                                value={importData.medicineId}
                                onValueChange={(val) => setImportData({ ...importData, medicineId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn thuốc..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {medicines.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Số lô (Batch No) <span className="text-red-500">*</span></Label>
                                <Input value={importData.batchNumber} onChange={e => setImportData({ ...importData, batchNumber: e.target.value })} placeholder="VD: B001" />
                            </div>
                            <div className="space-y-2">
                                <Label>Hạn sử dụng <span className="text-red-500">*</span></Label>
                                <Input type="date" value={importData.expiryDate} onChange={e => setImportData({ ...importData, expiryDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Số lượng nhập <span className="text-red-500">*</span></Label>
                                <Input type="number" value={importData.originalQuantity} onChange={e => setImportData({ ...importData, originalQuantity: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Giá nhập (đơn giá) <span className="text-red-500">*</span></Label>
                                <Input type="number" value={importData.costPrice} onChange={e => setImportData({ ...importData, costPrice: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Ngày nhập</Label>
                                <Input type="date" value={importData.importDate} onChange={e => setImportData({ ...importData, importDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Nhà cung cấp</Label>
                                <Input value={importData.supplier} onChange={e => setImportData({ ...importData, supplier: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleImportSave}>Lưu nhập kho</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
