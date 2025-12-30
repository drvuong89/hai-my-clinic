"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Printer, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { EmrService } from "@/lib/services/emr-service";
import { MedicalRecord, Medicine, PrescriptionItem } from "@/types/clinic";

import { ServiceSearch } from "@/components/clinic/ServiceSearch";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash, Plus } from "lucide-react";
import { PrescriptionTemplate } from "@/components/clinic/PrescriptionTemplate";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export default function EmrDetailPage() {
    const params = useParams();
    const router = useRouter();
    const visitId = params.visitId as string;
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `Don-thuoc-${visitId}`,
    });

    const [loading, setLoading] = useState(true);
    const [record, setRecord] = useState<Partial<MedicalRecord>>({});
    const [patientDisplay, setPatientDisplay] = useState({ name: "", age: "", weeks: "" });

    useEffect(() => {
        const loadVisit = async () => {
            if (!visitId) return;
            try {
                const data = await EmrService.getVisit(visitId);
                if (data) {
                    setRecord(data);
                    // Update header display info
                    setPatientDisplay({
                        name: data.patientName || "Bệnh nhân", // Should come from Visit Snapshot
                        age: data.dateOfBirth ? `${new Date().getFullYear() - parseInt(data.dateOfBirth)}` : "..",
                        weeks: data.ultrasound?.gestationalAge || ".."
                    });

                    // Mark as in_progress if waiting
                    if (data.status === 'waiting') {
                        await EmrService.updateRecord(visitId, { status: 'in_progress' });
                    }
                }
            } catch (e) {
                console.error(e);
                alert("Lỗi tải hồ sơ");
            } finally {
                setLoading(false);
            }
        };
        loadVisit();
    }, [visitId]);

    const handleSave = async () => {
        try {
            await EmrService.updateRecord(visitId, record);
            alert("Đã lưu hồ sơ thành công!");
        } catch (e) {
            console.error(e);
            alert("Lỗi khi lưu");
        }
    };

    const handleFinish = async () => {
        if (!confirm("Xác nhận hoàn thành ca khám này? Bệnh nhân sẽ được chuyển trạng thái 'Đã khám'.")) return;

        try {
            // Save first to ensure latest data
            await EmrService.updateRecord(visitId, record);

            // Determine status: If prescriptions OR services exist, go to 'waiting_payment', else 'completed'
            const hasPrescriptions = record.prescription && record.prescription.length > 0;
            const hasServices = record.services && record.services.length > 0;
            const nextStatus = (hasPrescriptions || hasServices) ? 'waiting_payment' : 'completed';

            await EmrService.finishVisit(visitId, record.services || [], nextStatus);

            // Explicitly set payment status if needed (finishVisit only updates status/services)
            if (hasPrescriptions || hasServices) {
                await EmrService.updateRecord(visitId, { paymentStatus: 'unpaid' });
            }

            router.push('/doctor'); // Back to list
        } catch (e) {
            console.error(e);
            alert("Lỗi khi hoàn thành");
        }
    };

    // Helper to update deeply nested state
    const updateSection = (section: keyof MedicalRecord, field: string, value: any) => {
        setRecord(prev => {
            const currentSection = prev[section] as any || {};
            return {
                ...prev,
                [section]: {
                    ...currentSection,
                    [field]: value
                }
            };
        });
    };

    const updateObstetricPara = (field: 'term' | 'preterm' | 'abort' | 'living', value: string) => {
        setRecord(prev => {
            const obs = prev.obstetric || { para: { term: 0, preterm: 0, abort: 0, living: 0 } };
            const para = obs.para || { term: 0, preterm: 0, abort: 0, living: 0 };
            return {
                ...prev,
                obstetric: {
                    ...obs,
                    para: {
                        ...para,
                        [field]: parseInt(value) || 0
                    }
                }
            };
        });
    };



    const addServiceItem = (service: import("@/types/clinic").ServiceItem) => {
        setRecord(prev => {
            const currentList = prev.services || [];
            if (currentList.find(i => i.serviceId === service.id)) return prev;

            const newItem: import("@/types/clinic").InvoiceItem = {
                serviceId: service.id,
                name: service.name,
                quantity: 1,
                price: service.price,
                total: service.price * 1
            };
            return { ...prev, services: [...currentList, newItem] };
        });
    };

    const removeServiceItem = (serviceId: string) => {
        setRecord(prev => ({
            ...prev,
            services: (prev.services || []).filter(s => s.serviceId !== serviceId)
        }));
    };

    if (loading) return <div className="p-8 text-center">Đang tải hồ sơ...</div>;

    // Logic helper for status badge
    const getStatusBadge = (status: string | undefined) => {
        switch (status) {
            case 'completed': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold border border-green-200">Đã hoàn thành</span>;
            case 'in_progress': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold border border-blue-200">Đang khám</span>;
            default: return <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-sm font-bold border border-slate-200">Chờ khám</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Info Bar */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/doctor"><ArrowLeft className="w-5 h-5" /></Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold">{patientDisplay.name} <span className="text-lg font-normal text-muted-foreground">({patientDisplay.age} tuổi)</span></h2>
                            {getStatusBadge(record.status)}
                        </div>
                        <div className="flex gap-4 text-sm mt-1">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Thai {record.ultrasound?.gestationalAge || patientDisplay.weeks}</span>
                            <span className="text-muted-foreground">Lý do: {record.notes || "Khám bệnh"}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Printer className="w-4 h-4 mr-2" /> In phiếu</Button>
                    <Button size="sm" variant="secondary" onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Lưu nháp</Button>
                    <Button size="sm" onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" /> H.Thành & Kết thúc
                    </Button>
                </div>
            </div>

            {/* MAIN EMR TABS */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="w-full justify-start h-12">
                    <TabsTrigger value="overview" className="text-base px-6">Hành chính & Tiền sử</TabsTrigger>
                    <TabsTrigger value="exam" className="text-base px-6">Khám & Siêu âm</TabsTrigger>
                    <TabsTrigger value="diagnosis" className="text-base px-6">Chẩn đoán & Lời dặn</TabsTrigger>
                </TabsList>

                {/* TAB 1: OVERVIEW & VITALS */}
                <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Chỉ số sinh tồn</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mạch (lần/phút)</Label>
                                    <Input
                                        value={record.vitals?.pulse || ""}
                                        onChange={e => updateSection('vitals', 'pulse', e.target.value)}
                                        placeholder="VD: 80"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Huyết áp (mmHg)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={record.vitals?.systolic || ""}
                                            onChange={e => updateSection('vitals', 'systolic', e.target.value)}
                                            placeholder="Tâm thu"
                                        />
                                        <Input
                                            value={record.vitals?.diastolic || ""}
                                            onChange={e => updateSection('vitals', 'diastolic', e.target.value)}
                                            placeholder="Tâm trương"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Cân nặng (kg)</Label>
                                    <Input
                                        value={record.vitals?.weight || ""}
                                        onChange={e => updateSection('vitals', 'weight', e.target.value)}
                                        placeholder="VD: 55"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Chiều cao (cm)</Label>
                                    <Input
                                        value={record.vitals?.height || ""}
                                        onChange={e => updateSection('vitals', 'height', e.target.value)}
                                        placeholder="VD: 160"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Tiền sử Sản khoa (PARA)</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-4 gap-2">
                                <div className="space-y-2 text-center">
                                    <Label>Đủ</Label>
                                    <Input className="text-center" placeholder="0"
                                        value={record.obstetric?.para?.term || 0}
                                        onChange={e => updateObstetricPara('term', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 text-center">
                                    <Label>Thiếu</Label>
                                    <Input className="text-center" placeholder="0"
                                        value={record.obstetric?.para?.preterm || 0}
                                        onChange={e => updateObstetricPara('preterm', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 text-center">
                                    <Label>Sảy</Label>
                                    <Input className="text-center" placeholder="0"
                                        value={record.obstetric?.para?.abort || 0}
                                        onChange={e => updateObstetricPara('abort', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 text-center">
                                    <Label>Sống</Label>
                                    <Input className="text-center" placeholder="0"
                                        value={record.obstetric?.para?.living || 0}
                                        onChange={e => updateObstetricPara('living', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-4 mt-4 space-y-2">
                                    <Label>Tiền sử bệnh lý (Mổ đẻ cũ, Dị ứng...)</Label>
                                    <Textarea placeholder="Ghi chú chi tiết tiền sử..."
                                        value={record.obstetric?.badHistory || ""}
                                        onChange={e => updateSection('obstetric', 'badHistory', e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB 2: EXAM & ULTRASOUND */}
                <TabsContent value="exam">
                    <div className="space-y-6">
                        {/* Service Indication */}
                        <Card>
                            <CardHeader><CardTitle className="text-xl text-primary">Chỉ định Cận lâm sàng / Dịch vụ</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="max-w-md">
                                    <Label className="mb-2 block">Thêm dịch vụ</Label>
                                    <ServiceSearch onSelect={addServiceItem} />
                                </div>

                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tên dịch vụ</TableHead>
                                                <TableHead className="w-[100px]">Số lượng</TableHead>
                                                <TableHead className="w-[150px] text-right">Đơn giá</TableHead>
                                                <TableHead className="w-[150px] text-right">Thành tiền</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(record.services || []).length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                                        Chưa có dịch vụ nào được chỉ định.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                (record.services || []).map((item) => (
                                                    <TableRow key={item.serviceId}>
                                                        <TableCell className="font-medium">{item.name}</TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                value={item.quantity}
                                                                className="w-16 text-center"
                                                                onChange={e => {
                                                                    const qty = parseInt(e.target.value) || 1;
                                                                    setRecord(prev => ({
                                                                        ...prev,
                                                                        services: prev.services?.map(s => s.serviceId === item.serviceId ? { ...s, quantity: qty, total: qty * s.price } : s)
                                                                    }))
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold">
                                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => removeServiceItem(item.serviceId)}>
                                                                <Trash className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Ultrasound */}
                        <Card>
                            <CardHeader><CardTitle>Kết quả Siêu âm thai</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-2"><Label>Ngôi thai</Label><Input value={record.ultrasound?.presentation || ""} onChange={e => updateSection('ultrasound', 'presentation', e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Tim thai (l/p)</Label><Input value={record.ultrasound?.fetalHeartRate || ""} onChange={e => updateSection('ultrasound', 'fetalHeartRate', e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Nhau thai</Label><Input value={record.ultrasound?.placenta || ""} onChange={e => updateSection('ultrasound', 'placenta', e.target.value)} /></div>
                                </div>

                                <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Các chỉ số sinh trắc (Biometry)</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-2"><Label>ĐK Lưỡng đỉnh (BPD)</Label><Input value={record.ultrasound?.bpd || ""} onChange={e => updateSection('ultrasound', 'bpd', e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Chu vi đầu (HC)</Label><Input value={record.ultrasound?.hc || ""} onChange={e => updateSection('ultrasound', 'hc', e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Chu vi bụng (AC)</Label><Input value={record.ultrasound?.ac || ""} onChange={e => updateSection('ultrasound', 'ac', e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Xương đùi (FL)</Label><Input value={record.ultrasound?.fl || ""} onChange={e => updateSection('ultrasound', 'fl', e.target.value)} /></div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-lg border">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-primary font-bold">Trọng lượng thai (EFW)</Label>
                                            <Input className="font-bold text-lg" placeholder="Tự động tính..." value={record.ultrasound?.efw || ""} onChange={e => updateSection('ultrasound', 'efw', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-primary font-bold">Tuổi thai (GA)</Label>
                                            <Input className="font-bold text-lg" placeholder="Tự động tính..." value={record.ultrasound?.gestationalAge || ""} onChange={e => updateSection('ultrasound', 'gestationalAge', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-primary font-bold">Dự kiến sinh (EDD)</Label>
                                            <Input type="date" className="font-bold text-lg" value={record.ultrasound?.edd || ""} onChange={e => updateSection('ultrasound', 'edd', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Kết luận / Ghi chú siêu âm</Label>
                                    <Textarea className="min-h-[100px]" value={record.ultrasound?.notes || ""} onChange={e => updateSection('ultrasound', 'notes', e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB 3: DIAGNOSIS & PRESCRIPTION */}
                <TabsContent value="diagnosis">
                    <Card>
                        <CardHeader><CardTitle className="text-xl text-primary">Chẩn đoán & Lời dặn</CardTitle></CardHeader>
                        <CardContent className="space-y-8">
                            {/* SECTION 1: DIAGNOSIS */}
                            <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border">
                                <Label className="text-lg font-bold text-blue-800 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm">1</div>
                                    Chẩn đoán xác định
                                </Label>
                                <Textarea
                                    className="text-base min-h-[80px] bg-white"
                                    placeholder="Nhập chẩn đoán bệnh..."
                                    value={record.diagnosis || ""}
                                    onChange={e => setRecord(p => ({ ...p, diagnosis: e.target.value }))}
                                />
                            </div>

                            {/* SECTION 2: DOCTOR ADVICE */}
                            <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border">
                                <Label className="text-lg font-bold text-blue-800 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm">2</div>
                                    Lời dặn của bác sĩ
                                </Label>
                                <Textarea
                                    className="text-base min-h-[120px] bg-white"
                                    placeholder="Chế độ ăn uống, sinh hoạt, lịch tái khám..."
                                    value={record.doctorAdvice || ""}
                                    onChange={e => setRecord(p => ({ ...p, doctorAdvice: e.target.value }))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Hidden Print Component */}
            <div className="hidden">
                <PrescriptionTemplate ref={printRef} record={record as MedicalRecord} />
            </div>
        </div >
    );
}
