"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmrService } from "@/lib/services/emr-service";
import { MedicalRecord } from "@/types/clinic";

export default function EmrDetailPage() {
    const params = useParams();
    const router = useRouter();
    const visitId = params.visitId as string;

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
    }

    if (loading) return <div className="p-8 text-center">Đang tải hồ sơ...</div>;

    return (
        <div className="space-y-6">
            {/* Header / Info Bar */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/doctor"><ArrowLeft className="w-5 h-5" /></Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">{patientDisplay.name} <span className="text-lg font-normal text-muted-foreground">({patientDisplay.age} tuổi)</span></h2>
                        <div className="flex gap-4 text-sm mt-1">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Thai {record.ultrasound?.gestationalAge || patientDisplay.weeks}</span>
                            <span className="text-muted-foreground">Lý do: {record.notes || "Khám bệnh"}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Printer className="w-4 h-4 mr-2" /> In phiếu</Button>
                    <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Lưu hồ sơ</Button>
                </div>
            </div>

            {/* MAIN EMR TABS */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="w-full justify-start h-12">
                    <TabsTrigger value="overview" className="text-base px-6">Hành chính & Tiền sử</TabsTrigger>
                    <TabsTrigger value="exam" className="text-base px-6">Khám & Siêu âm</TabsTrigger>
                    <TabsTrigger value="diagnosis" className="text-base px-6">Chẩn đoán & Thuốc</TabsTrigger>
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-primary font-bold">Trọng lượng thai (EFW)</Label>
                                            <Input className="font-bold text-lg" placeholder="Tự động tính..." value={record.ultrasound?.efw || ""} onChange={e => updateSection('ultrasound', 'efw', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-primary font-bold">Tuổi thai (GA)</Label>
                                            <Input className="font-bold text-lg" placeholder="Tự động tính..." value={record.ultrasound?.gestationalAge || ""} onChange={e => updateSection('ultrasound', 'gestationalAge', e.target.value)} />
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Chẩn đoán & Lời dặn</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Chẩn đoán xác định</Label>
                                        <Textarea placeholder="VD: Thai 22 tuần..." value={record.diagnosis || ""} onChange={e => setRecord(p => ({ ...p, diagnosis: e.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Lời dặn của bác sĩ</Label>
                                        <Textarea placeholder="Nghỉ ngơi, uống thuốc đúng giờ..." value={record.doctorAdvice || ""} onChange={e => setRecord(p => ({ ...p, doctorAdvice: e.target.value }))} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
