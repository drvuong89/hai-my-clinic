"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { User, Clock, ArrowRight, Play, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { VisitSession, MedicalRecord } from "@/types/clinic";
import { PharmacyService } from "@/lib/services/pharmacy-service";
import { EmrService } from "@/lib/services/emr-service";
import { Banknote } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Helper: Get local Date string YYYY-MM-DD
const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function DoctorDashboard() {
    const [activeTab, setActiveTab] = useState("waiting");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchDate, setSearchDate] = useState(getLocalDateString(new Date())); // Default today local
    const [queue, setQueue] = useState<VisitSession[]>([]);

    // Payment State
    // Payment State
    const [paymentVisit, setPaymentVisit] = useState<VisitSession | null>(null);
    const [fullRecord, setFullRecord] = useState<MedicalRecord | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [isFetchingDetails, setIsFetchingDetails] = useState<string | null>(null); // visitId being fetched

    useEffect(() => {
        // Build query. 
        // Note: Filtering by date in Firestore requires start/end range.
        // We'll simplisticly fetch recent/relevant status and then filter by date client-side 
        // OR add date filter to query if status allows.
        // Given existing code queries status IN [...], adding date range might need compound index.
        // Let's keep existing broad query and filter client side for 'completed' by date, 
        // as waiting/in_progress usually are "today" effectively (or backlog).
        // Actually, user wants "Search patient by date".

        const q = query(
            collection(db, "visits"),
            where("status", "in", ["waiting", "in_progress", "completed", "waiting_payment"])
            // We might want to limit to recent if list gets huge, but for now allow client sort
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const visits: VisitSession[] = [];
            snapshot.forEach((doc) => {
                visits.push({ id: doc.id, ...doc.data() } as VisitSession);
            });

            // Client-side sort: Chronological (ASC) - Earliest check-in first
            visits.sort((a, b) => (a.checkInTime || 0) - (b.checkInTime || 0));
            setQueue(visits);
        });

        return () => unsubscribe();
    }, []);

    // Filter groups
    // Use helper to compare dates
    const isSameDate = (ts: number, dateStr: string) => {
        return getLocalDateString(new Date(ts)) === dateStr;
    }

    const waitingList = queue.filter(v => v.status === 'waiting' && isSameDate(v.checkInTime, searchDate));
    const inProgressList = queue.filter(v => v.status === 'in_progress' && isSameDate(v.checkInTime, searchDate));
    const completedList = queue.filter(v => v.status === 'completed' && isSameDate(v.checkInTime, searchDate));
    const waitingPaymentList = queue.filter(v => v.status === 'waiting_payment' && isSameDate(v.checkInTime, searchDate));
    const allList = queue.filter(v => isSameDate(v.checkInTime, searchDate));

    // Filter by search & Date & Tab
    const filteredQueue = queue.filter(v => {
        // 1. Date Filter (Global)
        if (!isSameDate(v.checkInTime, searchDate)) return false;

        // 2. Tab Filter
        const inTab = activeTab === 'waiting' ? v.status === 'waiting' :
            activeTab === 'in_progress' ? v.status === 'in_progress' :
                activeTab === 'payment' ? v.status === 'waiting_payment' :
                    activeTab === 'history' ? v.status === 'completed' :
                        true;

        if (!inTab) return false;

        // 3. Text Search
        const matchesText = (v.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.patientPhone?.includes(searchQuery));

        return matchesText;
    });

    const nextPatient = waitingList[0];

    // PAYMENT LOGIC
    const openPaymentInfo = async (visit: VisitSession) => {
        setIsFetchingDetails(visit.id);
        setPaymentVisit(null);
        try {
            const record = await EmrService.getVisit(visit.id);
            setFullRecord(record);
            setPaymentVisit(visit);
        } catch (e) {
            console.error("Error fetching record details:", e);
            alert("Không thể tải thông tin thanh toán. Vui lòng kiểm tra lại kết nối.");
        } finally {
            setIsFetchingDetails(null);
        }
    };

    const calculateTotals = () => {
        if (!fullRecord) return { service: 0, medicine: 0, total: 0 };
        const serviceTotal = (fullRecord.services || []).reduce((sum, s) => sum + (s.total || s.price * s.quantity), 0);
        const medicineTotal = (fullRecord.prescription || []).reduce((sum, m) => sum + (m.price * m.quantity), 0);
        return { service: serviceTotal, medicine: medicineTotal, total: serviceTotal + medicineTotal };
    }

    const handleConfirmPayment = async (method: "cash" | "transfer") => {
        if (!fullRecord || !paymentVisit) return;
        if (!confirm(`Xác nhận thanh toán bằng ${method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}?`)) return;

        setIsProcessingPayment(true);
        try {
            const prescriptions = fullRecord.prescription || [];
            if (prescriptions.length > 0) {
                const cartItems = prescriptions.map(p => ({
                    medicineId: p.id,
                    quantity: p.quantity,
                    price: p.price
                }));

                await PharmacyService.createSale({
                    patientName: fullRecord.patientName || "Khách lẻ",
                    patientId: fullRecord.patientId,
                    createdBy: auth.currentUser?.uid || "doctor_checkout",
                    status: 'completed'
                }, cartItems);
            }

            await EmrService.updateRecord(paymentVisit.id, {
                status: 'completed',
                paymentStatus: 'paid',
                paymentMethod: method,
                totalAmount: calculateTotals().total
            });

            alert("Thanh toán thành công!");
            setPaymentVisit(null);
            setFullRecord(null);
        } catch (e: any) {
            console.error("Payment Error:", e);
            alert(`Lỗi thanh toán: ${e.message || "Vui lòng thử lại"}`);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleExportPatients = () => {
        // Always export the full daily list unless user specifically wants filtered?
        // User asked for "danh sách khách khám" (Examination List), implying the register.
        // So exporting 'allList' (filtered by current search query if any) is safest.
        // Let's use filteredQueue if activeTab is 'all', otherwise use allList to ensure full context?
        // Actually, simplest is to just export `allList` (full daily log) but respect search query if provided.
        // Let's just export `allList` to be comprehensive.

        const dataToExport = allList;

        if (dataToExport.length === 0) {
            alert("Không có dữ liệu để xuất");
            return;
        }

        const headers = ["Ngày khám", "Giờ check-in", "Tên bệnh nhân", "SĐT", "Trạng thái"];
        const rows = dataToExport.map(site => [
            getLocalDateString(new Date(site.checkInTime)),
            new Date(site.checkInTime).toLocaleTimeString('vi-VN'),
            site.patientName,
            site.patientPhone,
            site.status === 'completed' ? "Đã khám" :
                site.status === 'waiting' ? "Đang chờ" :
                    site.status === 'in_progress' ? "Đang khám" : site.status
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.map(c => `"${c}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Danh_sach_kham_${searchDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Khu vực Bác sĩ</h2>
                    <p className="text-muted-foreground">Quản lý bệnh nhân và thực hiện khám bệnh.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportPatients}>
                        <ArrowRight className="w-4 h-4 mr-2" /> Xuất Danh Sách Ngày (Excel)
                    </Button>
                    <Card className="bg-blue-50 border-blue-100">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="bg-blue-200 p-2 rounded-full"><Clock className="w-4 h-4 text-blue-700" /></div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium">Đang chờ</p>
                                <p className="text-xl font-bold text-blue-900">{waitingList.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-100">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="bg-green-200 p-2 rounded-full"><Play className="w-4 h-4 text-green-700" /></div>
                            <div>
                                <p className="text-xs text-green-600 font-medium">Đang khám</p>
                                <p className="text-xl font-bold text-green-900">{inProgressList.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-orange-50 border-orange-100 min-w-[200px]">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="bg-orange-200 p-2 rounded-full"><Banknote className="w-4 h-4 text-orange-700" /></div>
                            <div>
                                <p className="text-xs text-orange-600 font-medium">Thanh toán / Doanh thu</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-xl font-bold text-orange-900">{waitingPaymentList.length}</p>
                                    <span className="text-xs text-orange-700 border-l pl-2 border-orange-300">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                            queue
                                                .filter(v => isSameDate(v.checkInTime, searchDate) && v.status === 'completed' && v.paymentStatus === 'paid')
                                                .reduce((sum, v) => sum + (v.totalAmount || 0), 0)
                                        )}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-3 rounded border">
                <div className="flex-1 relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm bệnh nhân (Tên, SĐT)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 border-none shadow-none focus-visible:ring-0 bg-slate-50"
                    />
                </div>
                <div className="flex items-center gap-2 border-l pl-4">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Ngày khám:</span>
                    <Input
                        type="date"
                        value={searchDate}
                        onChange={(e) => {
                            setSearchDate(e.target.value);
                        }}
                        className="w-[160px]"
                    />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="waiting">Danh sách chờ ({waitingList.length})</TabsTrigger>
                    <TabsTrigger value="in_progress">Đang khám ({inProgressList.length})</TabsTrigger>
                    <TabsTrigger value="payment">Chờ thanh toán ({waitingPaymentList.length})</TabsTrigger>
                    <TabsTrigger value="history">Đã khám ({completedList.length})</TabsTrigger>
                    <TabsTrigger value="all">Tất cả ({allList.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="waiting" className="space-y-4">
                    {!searchQuery && nextPatient && (
                        <Card className="border-primary/50 shadow-md">
                            <CardHeader className="bg-primary/5 border-b pb-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-xl text-primary font-bold">
                                        <Play className="w-5 h-5 fill-current" />
                                        Mời khám tiếp theo
                                    </div>
                                    <span className="text-sm font-mono bg-primary/10 px-2 py-1 rounded text-primary">
                                        Check-in: {new Date(nextPatient.checkInTime).toLocaleTimeString('vi-VN')}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 flex flex-col md:flex-row gap-6 justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-bold">{nextPatient.patientName}</h3>
                                    <p className="text-muted-foreground">SĐT: {nextPatient.patientPhone}</p>
                                </div>
                                <Button size="lg" asChild>
                                    <Link href={`/doctor/${nextPatient.id}`}>
                                        Bắt đầu khám <ArrowRight className="ml-2 w-4 h-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                    <div className="space-y-2">
                        {filteredQueue.map((patient) => (
                            <Link href={`/doctor/${patient.id}`} key={patient.id} className="group block">
                                <div className="flex items-center justify-between p-3 bg-white border rounded hover:border-primary/50 transition-colors shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="font-bold text-lg w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                            {queue.indexOf(patient) + 1}
                                        </div>
                                        <div>
                                            <span className="font-bold group-hover:text-primary">{patient.patientName}</span>
                                            <span className="mx-2 text-gray-300">|</span>
                                            <span className="text-sm text-muted-foreground">{patient.patientPhone}</span>
                                        </div>
                                    </div>
                                    <span className="text-sm font-mono text-slate-500">
                                        {new Date(patient.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                    {filteredQueue.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground border-dashed border-2 rounded-lg">Không có bệnh nhân nào trong danh sách chờ.</div>
                    )}
                </TabsContent>

                <TabsContent value="in_progress" className="space-y-4">
                    <div className="space-y-2">
                        {filteredQueue.map((patient) => (
                            <Link href={`/doctor/${patient.id}`} key={patient.id} className="group block">
                                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded hover:border-green-500 transition-colors shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="font-bold text-lg w-8 h-8 rounded-full bg-green-200 text-green-800 flex items-center justify-center">
                                            <Play className="w-3 h-3 fill-current" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-green-900 group-hover:underline">{patient.patientName}</span>
                                                <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-bold text-green-600 border border-green-200 animate-pulse">
                                                    ĐANG KHÁM
                                                </span>
                                            </div>
                                            <div className="text-sm text-green-700">{patient.patientPhone}</div>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-green-700 hover:text-green-800 hover:bg-green-100">
                                        Tiếp tục <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </Link>
                        ))}
                        {filteredQueue.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground border-dashed border-2 rounded-lg">Không có bệnh nhân đang khám.</div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center px-4 py-2 text-xs font-semibold text-muted-foreground bg-slate-50 border rounded-t-md">
                            <div className="w-[80px]">Giờ</div>
                            <div className="flex-1">Bệnh nhân</div>
                            <div className="w-[120px] text-right">Thao tác</div>
                        </div>
                        {filteredQueue.map((patient) => (
                            <div key={patient.id} className="group flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded hover:border-orange-500 transition-colors shadow-sm">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="font-bold text-lg w-8 h-8 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center">
                                        <Banknote className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-orange-900">{patient.patientName}</span>
                                            <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-bold text-orange-600 border border-orange-200">
                                                CHỜ THANH TOÁN
                                            </span>
                                        </div>
                                        <div className="text-sm text-orange-700">{patient.patientPhone}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Button
                                        size="sm"
                                        className="bg-orange-600 hover:bg-orange-700 text-white disabled:bg-orange-400"
                                        onClick={() => openPaymentInfo(patient)}
                                        disabled={isFetchingDetails === patient.id}
                                    >
                                        {isFetchingDetails === patient.id ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Banknote className="w-4 h-4 mr-2" />
                                        )}
                                        {isFetchingDetails === patient.id ? "Đang tải..." : "Xác nhận thu tiền"}
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {filteredQueue.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground border-dashed border-2 rounded-lg">Không có bệnh nhân chờ thanh toán.</div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex items-center px-4 py-2 text-xs font-semibold text-muted-foreground bg-slate-50 border rounded-t-md">
                            <div className="w-[80px]">Giờ khám</div>
                            <div className="flex-1">Bệnh nhân</div>
                            <div className="w-[120px] text-right">Trạng thái</div>
                        </div>

                        {filteredQueue.length > 0 ? filteredQueue.map((patient) => (
                            <Link href={`/doctor/${patient.id}`} key={patient.id} className="group block">
                                <div className="flex items-center px-4 py-3 bg-white border-b border-x last:border-b last:rounded-b-md hover:bg-blue-50 transition-colors">
                                    <div className="w-[80px] text-sm text-slate-500">
                                        {new Date(patient.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-semibold text-slate-800">{patient.patientName}</span>
                                        <span className="text-slate-400 mx-2">-</span>
                                        <span className="text-sm text-slate-500">{patient.patientPhone}</span>
                                    </div>
                                    <div className="w-[120px] text-right flex justify-end">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3 mr-1" /> Đã hoàn thành
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        )) : (
                            <div className="text-center py-8 text-muted-foreground border rounded-b-md bg-white">
                                Không có bệnh nhân đã khám trong ngày {new Date(searchDate).toLocaleDateString('vi-VN')}.
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="all" className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex items-center px-4 py-2 text-xs font-semibold text-muted-foreground bg-slate-50 border rounded-t-md">
                            <div className="w-[80px]">Giờ</div>
                            <div className="flex-1">Bệnh nhân</div>
                            <div className="w-[120px] text-right">Trạng thái</div>
                        </div>
                        {filteredQueue.map((patient) => (
                            <Link href={`/doctor/${patient.id}`} key={patient.id} className="group block">
                                <div className="flex items-center px-4 py-3 bg-white border-b border-x last:border-b last:rounded-b-md hover:bg-blue-50 transition-colors">
                                    <div className="w-[80px] text-sm text-slate-500">
                                        {new Date(patient.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-semibold text-slate-800">{patient.patientName}</span>
                                    </div>
                                    <div className="w-[120px] text-right flex justify-end">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${patient.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            patient.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                patient.status === 'waiting_payment' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-slate-100 text-slate-800'
                                            }`}>
                                            {patient.status === 'completed' ? 'Hoàn thành' :
                                                patient.status === 'in_progress' ? 'Đang khám' :
                                                    patient.status === 'waiting_payment' ? (
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-6 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                                                                disabled={isFetchingDetails === patient.id}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    openPaymentInfo(patient);
                                                                }}
                                                            >
                                                                {isFetchingDetails === patient.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Banknote className="w-3 h-3 mr-1" />}
                                                                Thanh toán
                                                            </Button>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                                Thanh toán
                                                            </span>
                                                        </div>
                                                    ) : 'Chờ khám'}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {filteredQueue.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground border rounded-b-md bg-white">
                                Không có dữ liệu trong ngày.
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* PAYMENT MODAL */}
            {paymentVisit && fullRecord && (
                <Dialog open={!!paymentVisit} onOpenChange={(open) => !open && setPaymentVisit(null)}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-primary">
                                <Banknote className="w-6 h-6" />
                                Xác nhận thanh toán
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-8 py-4">
                            <div className="col-span-2 flex justify-between border-b pb-2">
                                <span className="font-bold text-lg">{fullRecord.patientName}</span>
                                <span className="text-muted-foreground">{fullRecord.patientPhone}</span>
                            </div>

                            <div className="space-y-2 border p-3 rounded bg-slate-50">
                                <h4 className="font-bold text-sm uppercase text-slate-500">Dịch vụ & Cận lâm sàng</h4>
                                {(fullRecord.services || []).length === 0 ? <p className="text-xs text-muted-foreground italic">Không có dịch vụ.</p> : (
                                    <ul className="text-sm space-y-1">
                                        {fullRecord.services?.map(s => (
                                            <li key={s.serviceId} className="flex justify-between">
                                                <span>{s.name} (x{s.quantity})</span>
                                                <span className="font-medium">{new Intl.NumberFormat('vi-VN').format(s.total || 0)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="border-t pt-2 flex justify-between font-bold text-blue-700">
                                    <span>Tổng tiền Dịch vụ:</span>
                                    <span>{new Intl.NumberFormat('vi-VN').format(calculateTotals().service)} đ</span>
                                </div>
                            </div>

                            <div className="space-y-2 border p-3 rounded bg-slate-50">
                                <h4 className="font-bold text-sm uppercase text-slate-500">Đơn thuốc</h4>
                                {(fullRecord.prescription || []).length === 0 ? <p className="text-xs text-muted-foreground italic">Không có thuốc.</p> : (
                                    <ul className="text-sm space-y-1">
                                        {fullRecord.prescription?.map(m => (
                                            <li key={m.id} className="flex justify-between">
                                                <span>{m.name} (x{m.quantity})</span>
                                                <span className="font-medium">{new Intl.NumberFormat('vi-VN').format(m.price * m.quantity)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="border-t pt-2 flex justify-between font-bold text-green-700">
                                    <span>Tổng tiền Thuốc:</span>
                                    <span>{new Intl.NumberFormat('vi-VN').format(calculateTotals().medicine)} đ</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end items-center gap-4 bg-slate-100 p-4 rounded-lg">
                            <span className="text-lg">Tổng cộng cần thanh toán:</span>
                            <span className="text-3xl font-bold text-red-600">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculateTotals().total)}
                            </span>
                        </div>

                        <DialogFooter className="sm:justify-between">
                            <Button variant="outline" onClick={() => setPaymentVisit(null)}>Hủy bỏ</Button>
                            <div className="flex gap-2">
                                <Button size="lg" onClick={() => handleConfirmPayment('transfer')} disabled={isProcessingPayment} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {isProcessingPayment ? "..." : "Đã Chuyển khoản"}
                                </Button>
                                <Button size="lg" onClick={() => handleConfirmPayment('cash')} disabled={isProcessingPayment} className="bg-green-600 hover:bg-green-700 text-white">
                                    {isProcessingPayment ? "..." : "Thu Tiền mặt"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
