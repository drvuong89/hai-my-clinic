"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, AlertTriangle, ChevronDown, ChevronRight, Package, RefreshCw } from "lucide-react";
import { PharmacyService } from "@/lib/services/pharmacy-service";
import { Medicine, InventoryBatch } from "@/types/clinic";

interface ConsolidatedStock {
    medicine: Medicine;
    totalQty: number;
    batches: InventoryBatch[];
}

export function InventoryManager() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [batches, setBatches] = useState<InventoryBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isAddMedDialogOpen, setIsAddMedDialogOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    // Import Form State
    const [importData, setImportData] = useState<Partial<InventoryBatch>>({
        medicineId: "",
        batchNumber: "",
        expiryDate: "",
        importDate: new Date().toISOString().split('T')[0],
        costPrice: 0,
        sellPrice: 0,
        originalQuantity: 0,
        supplier: ""
    });

    // Quick Add Medicine State
    const [newMedData, setNewMedData] = useState<Partial<Medicine>>({
        name: "", unit: "Viên", minStockLevel: 10, isActive: true
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

    const refreshMedicines = async () => {
        const meds = await PharmacyService.getMedicines();
        setMedicines(meds);
    };

    const consolidatedStock = useMemo(() => {
        const stockMap = new Map<string, ConsolidatedStock>();
        medicines.forEach(med => stockMap.set(med.id, { medicine: med, totalQty: 0, batches: [] }));

        batches.forEach(batch => {
            if (batch.currentQuantity > 0) {
                const entry = stockMap.get(batch.medicineId);
                if (entry) {
                    entry.totalQty += batch.currentQuantity;
                    entry.batches.push(batch);
                }
            }
        });

        return Array.from(stockMap.values()).filter(item =>
            item.medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.medicine.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [medicines, batches, searchTerm]);

    const toggleRow = (medId: string) => {
        const newSet = new Set(expandedRows);
        newSet.has(medId) ? newSet.delete(medId) : newSet.add(medId);
        setExpandedRows(newSet);
    };

    const handleImportSave = async () => {
        if (!importData.medicineId || !importData.batchNumber || !importData.expiryDate || !importData.originalQuantity) {
            alert("Vui lòng điền đủ thông tin bắt buộc!");
            return;
        }
        try {
            await PharmacyService.addBatch({
                medicineId: importData.medicineId,
                batchNumber: importData.batchNumber,
                expiryDate: importData.expiryDate,
                importDate: importData.importDate!,
                costPrice: Number(importData.costPrice),
                sellPrice: Number(importData.sellPrice || 0),
                originalQuantity: Number(importData.originalQuantity),
                supplier: importData.supplier || ""
            });
            setIsImportDialogOpen(false);
            setImportData({ ...importData, medicineId: "", batchNumber: "", originalQuantity: 0, costPrice: 0 });
            loadData();
        } catch (e: any) {
            console.error("Error importing batch:", e);
            alert(`Lỗi nhập kho: ${e.message}`);
        }
    };

    const handleAddMedicine = async () => {
        if (!newMedData.name) return;
        try {
            const id = await PharmacyService.addMedicine(newMedData as Omit<Medicine, "id">);
            setIsAddMedDialogOpen(false);
            setNewMedData({ name: "", unit: "Viên", minStockLevel: 10, isActive: true });
            await refreshMedicines();
            setImportData(prev => ({ ...prev, medicineId: id }));
        } catch (e: any) {
            console.error("Error quick adding medicine:", e);
            alert(`Lỗi thêm thuốc: ${e.message}`);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm tồn kho..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => setIsImportDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Nhập kho
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]"></TableHead>
                                <TableHead>Tên thuốc</TableHead>
                                <TableHead>Đơn vị</TableHead>
                                <TableHead className="text-right">Tổng tồn</TableHead>
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
                                        <TableCell className="text-right font-bold">{item.totalQty}</TableCell>
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
                                                <div className="p-4 pl-10 bg-slate-50/50">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="h-8 border-none">
                                                                <TableHead className="h-8 text-xs">Số lô</TableHead>
                                                                <TableHead className="h-8 text-xs">Hạn dùng</TableHead>
                                                                <TableHead className="h-8 text-xs text-right">Giá nhập</TableHead>
                                                                <TableHead className="h-8 text-xs text-right">Còn lại</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {item.batches.map(batch => (
                                                                <TableRow key={batch.id} className="h-8 border-none hover:bg-white">
                                                                    <TableCell className="py-1 text-xs font-mono">{batch.batchNumber}</TableCell>
                                                                    <TableCell className="py-1 text-xs">{batch.expiryDate}</TableCell>
                                                                    <TableCell className="py-1 text-xs text-right">{batch.costPrice.toLocaleString()}</TableCell>
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

            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Nhập kho</DialogTitle>
                        <DialogDescription>Nhập lẻ hoặc tải file Excel/CSV.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-2">
                        {/* 1. FILE IMPORT SECTION */}
                        <div className="border border-dashed p-4 rounded bg-slate-50 flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-sm">Nhập từ File</h4>
                                <p className="text-xs text-muted-foreground w-64">Định dạng: <span className="font-mono">Sku/Tên, Số Lô, Hạn Dùng (YYYY-MM-DD), Số Lượng</span></p>
                            </div>
                            <Input
                                type="file"
                                accept=".csv, .txt"
                                className="w-[220px] bg-white h-9 text-sm"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                        const text = event.target?.result as string;
                                        const lines = text.split('\n');
                                        let count = 0;
                                        // Simple Import Logic
                                        for (let i = 1; i < lines.length; i++) {
                                            const line = lines[i].trim();
                                            if (!line) continue;

                                            // Expect: SkuOrName, Batch, Expiry, Qty
                                            // The system will try to match SkuOrName to existing Medicine to get Prices.
                                            const [skuOrName, batch, expiry, qtyStr] = line.split(',').map(s => s.trim());

                                            if (skuOrName && qtyStr) {
                                                // Find medicine
                                                const med = medicines.find(m =>
                                                    m.sku?.toLowerCase() === skuOrName.toLowerCase() ||
                                                    m.name.toLowerCase() === skuOrName.toLowerCase()
                                                );

                                                if (med) {
                                                    await PharmacyService.addBatch({
                                                        medicineId: med.id,
                                                        batchNumber: batch || "BATCH-AUTO",
                                                        expiryDate: expiry || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().substring(0, 10),
                                                        importDate: new Date().toISOString().substring(0, 10),
                                                        originalQuantity: Number(qtyStr),
                                                        costPrice: med.costPrice || 0, // Auto-pick from Catalog
                                                        sellPrice: med.sellPrice || 0, // Auto-pick from Catalog
                                                        supplier: "Imported from File"
                                                    });
                                                    count++;
                                                }
                                            }
                                        }
                                        alert(`Đã nhập kho thành công ${count} lô hàng!`);
                                        loadData();
                                        e.target.value = '';
                                    };
                                    reader.readAsText(file);
                                }}
                            />
                        </div>

                        {/* 2. MANUAL IMPORT SECTION */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-1">Hoặc Nhập Lẻ</h4>
                            <div className="space-y-2">
                                <Label>Chọn Thuốc <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={importData.medicineId}
                                        onValueChange={(val) => {
                                            const med = medicines.find(m => m.id === val);
                                            setImportData({
                                                ...importData,
                                                medicineId: val,
                                                costPrice: med?.costPrice || 0,
                                                sellPrice: med?.sellPrice || 0
                                            });
                                        }}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Chọn thuốc..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {medicines.map(m => (
                                                <SelectItem key={m.id} value={m.id}>{m.name} (SKU: {m.sku})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="secondary" size="icon" onClick={() => setIsAddMedDialogOpen(true)}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Import Mode Toggle */}
                            {importData.medicineId && (() => {
                                const med = medicines.find(m => m.id === importData.medicineId);
                                const ratio = (med?.packagingSpecification?.boxToBlister || 0) * (med?.packagingSpecification?.blisterToUnit || 0);
                                if (ratio > 1) {
                                    return (
                                        <div className="bg-blue-50 p-2 rounded text-sm flex items-center justify-between">
                                            <span className="text-blue-700 font-medium">Quy đổi: 1 Hộp = {ratio} {med?.unit}</span>
                                        </div>
                                    )
                                }
                            })()}

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Số lô</Label>
                                    <Input value={importData.batchNumber} onChange={e => setImportData({ ...importData, batchNumber: e.target.value })} placeholder="VD: B001" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Hạn sử dụng</Label>
                                    <Input type="date" value={importData.expiryDate} onChange={e => setImportData({ ...importData, expiryDate: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Số lượng (Đơn vị cơ bản)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={importData.originalQuantity}
                                            onChange={e => setImportData({ ...importData, originalQuantity: Number(e.target.value) })}
                                        />
                                        {importData.medicineId && (
                                            <div className="absolute right-3 top-2 text-xs text-muted-foreground">
                                                {medicines.find(m => m.id === importData.medicineId)?.unit}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Read Only Prices */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-100 p-2 rounded opacity-80 cursor-not-allowed">
                                <div className="space-y-1">
                                    <Label className="text-xs">Giá Nhập / {medicines.find(m => m.id === importData.medicineId)?.unit || 'Đơn vị'}</Label>
                                    <div className="font-mono font-bold">{new Intl.NumberFormat('vi-VN').format(importData.costPrice || 0)} đ</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Giá Bán / {medicines.find(m => m.id === importData.medicineId)?.unit || 'Đơn vị'}</Label>
                                    <div className="font-mono font-bold text-blue-700">{new Intl.NumberFormat('vi-VN').format(importData.sellPrice || 0)} đ</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleImportSave}>Lưu nhập kho</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddMedDialogOpen} onOpenChange={setIsAddMedDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thêm tên thuốc mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Tên thuốc</Label>
                            <Input value={newMedData.name} onChange={e => setNewMedData({ ...newMedData, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Đơn vị</Label>
                                <Input value={newMedData.unit} onChange={e => setNewMedData({ ...newMedData, unit: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Mã SKU (Tùy chọn)</Label>
                                <Input value={newMedData.sku} onChange={e => setNewMedData({ ...newMedData, sku: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddMedDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleAddMedicine}>Lưu tên thuốc</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
