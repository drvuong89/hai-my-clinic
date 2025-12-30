"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, UserCheck, Clock, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientService } from "@/lib/services/patient-service";
import { EmrService } from "@/lib/services/emr-service";
import { Patient, VisitSession } from "@/types/clinic";
import { db, auth } from "@/lib/firebase"; // Using direct db for listener
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { AlertTriangle } from "lucide-react"; // Icons for payment
import { MedicalRecord } from "@/types/clinic"; // Ensure MedicalRecord is imported for casting if needed

export default function ReceptionPage() {
    // State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    // Helper: Get local Date string YYYY-MM-DD
    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [queue, setQueue] = useState<VisitSession[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date())); // Default today local

    // New Patient Form
    const [newPatient, setNewPatient] = useState({
        fullName: "",
        phone: "",
        dateOfBirth: "",
        gender: "female" as const,
        address: "",
        email: "" // Added email
    });

    // Load queue real-time
    useEffect(() => {
        // Query visits with status 'waiting' or 'in_progress' or 'completed' 
        const q = query(
            collection(db, "visits"),
            where("status", "in", ["waiting", "in_progress", "completed", "waiting_payment"])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const visits: VisitSession[] = [];
            snapshot.forEach((doc) => {
                visits.push({ id: doc.id, ...doc.data() } as VisitSession);
            });
            // Client-side sort
            visits.sort((a, b) => a.checkInTime - b.checkInTime);
            setQueue(visits);
        }, (error) => {
            console.error("Queue listener error:", error);
            alert(`Lỗi kết nối danh sách chờ: ${error.message}`);
        });

        return () => unsubscribe();
    }, []);

    // Filter queue by selected date
    const filteredQueue = queue.filter(v => {
        return getLocalDateString(new Date(v.checkInTime)) === selectedDate;
    });

    // Search Handler
    const handleSearch = async () => {
        if (!searchTerm) return;
        const results = await PatientService.search(searchTerm);
        setSearchResults(results);
    };

    // Add Patient & Check In
    const handleCreatePatient = async () => {
        if (!newPatient.fullName || !newPatient.phone) {
            alert("Vui lòng nhập Họ tên và Số điện thoại!");
            return;
        }

        setIsSaving(true);
        console.log("Starting create patient...", newPatient);
        if (!auth.currentUser) {
            alert("Lỗi: Bạn chưa đăng nhập hoặc phiên đăng nhập hết hạn. Vui lòng tải lại trang!");
            setIsSaving(false);
            return;
        }

        try {
            // Helper for timeout
            const withTimeout = <T,>(promise: Promise<T>, ms: number = 10000): Promise<T> => {
                return Promise.race([
                    promise,
                    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Quá thời gian chờ (timeout). Vui lòng kiểm tra mạng!")), ms))
                ]);
            };

            // 1. Create Patient with Timeout
            const created = await withTimeout(PatientService.create(newPatient));

            // 2. Auto Check-in (Add to Queue)
            await withTimeout(EmrService.createVisit({
                patientId: created.id,
                patientName: created.fullName,
                patientPhone: created.phone,
                dateOfBirth: created.dateOfBirth,
                status: "waiting",
                checkInTime: Date.now()
            }));

            setIsAddPatientOpen(false);
            alert(`Đã thêm bệnh nhân "${created.fullName}" và xếp vào hàng chờ thành công!`);

            // 3. Update Search & Reset Form
            setSearchResults([created]);
            setNewPatient({
                fullName: "",
                phone: "",
                dateOfBirth: "",
                gender: "female",
                address: "",
                email: ""
            });
        } catch (e: any) {
            console.error("Error creating patient:", e);
            alert(`Lỗi: ${e.message || "Vui lòng kiểm tra lại kết nối"}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Check-in (Add to Queue)
    const handleCheckIn = async (patient: Patient) => {
        try {
            await EmrService.createVisit({
                patientId: patient.id,
                patientName: patient.fullName,
                patientPhone: patient.phone,
                dateOfBirth: patient.dateOfBirth,
                status: "waiting",
                checkInTime: Date.now()
            });
            alert("Đã thêm vào hàng chờ!");
        } catch (e) {
            console.error(e);
            alert("Lỗi xếp hàng");
        }
    };



    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
            {/* LEFT COLUMN: Check-in & Patient Search */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-primary" />
                            Tiếp đón bệnh nhân
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Tìm SDT hoặc Tên..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Button size="icon" onClick={handleSearch}>
                                <Search className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="space-y-2 border rounded p-2 bg-slate-50">
                                <p className="text-xs font-medium text-muted-foreground">Kết quả tìm kiếm:</p>
                                {searchResults.map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                        <div>
                                            <p className="font-bold">{p.fullName}</p>
                                            <p className="text-xs">{p.phone}</p>
                                            <div className="flex gap-1 mt-1">
                                                {/* Zalo Button */}
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-6 text-[10px] px-2 bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`https://zalo.me/${p.phone}`, '_blank');
                                                    }}
                                                >
                                                    Zalo
                                                </Button>
                                                {/* Facebook Button (Placeholder for now) */}
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-6 text-[10px] px-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Fallback to search if no username provided
                                                        window.open(`https://www.facebook.com/search/top?q=${p.fullName}`, '_blank');
                                                    }}
                                                >
                                                    FB
                                                </Button>
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={() => handleCheckIn(p)}>Tiếp nhận</Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Hoặc
                                </span>
                            </div>
                        </div>

                        <Dialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full" variant="outline">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Đăng ký bệnh nhân mới
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Hồ sơ bệnh nhân mới</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Họ và tên <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={newPatient.fullName}
                                            onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })}
                                            placeholder="Nguyễn Văn A"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Số điện thoại <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={newPatient.phone}
                                                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                                                placeholder="09..."
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Ngày sinh</Label>
                                            <Input
                                                type="date"
                                                value={newPatient.dateOfBirth}
                                                onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    {/* Updated Gender and Email */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Giới tính</Label>
                                            <Select
                                                value={newPatient.gender}
                                                onValueChange={(val: any) => setNewPatient({ ...newPatient, gender: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn giới tính" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="female">Nữ</SelectItem>
                                                    <SelectItem value="male">Nam</SelectItem>
                                                    <SelectItem value="other">Khác</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Email (Tùy chọn)</Label>
                                            <Input
                                                type="email"
                                                value={newPatient.email || ""}
                                                onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Địa chỉ</Label>
                                        <Input
                                            value={newPatient.address}
                                            onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreatePatient} disabled={isSaving}>
                                        {isSaving ? "Đang lưu..." : "Lưu & Tiếp đón"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>


                    </CardContent>
                </Card>
            </div>

            {/* RIGHT COLUMN: Live Queue */}
            <div className="lg:col-span-2">
                <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" />
                                Danh sách khám
                            </CardTitle>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-[140px] h-8 text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <span className="flex items-center gap-1 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                Đang chờ: {filteredQueue.filter(q => q.status === "waiting").length}
                            </span>
                            <span className="flex items-center gap-1 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                Đang khám: {filteredQueue.filter(q => q.status === "in_progress").length}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 py-3 border-b text-sm font-medium text-muted-foreground">
                                <div className="col-span-1">ID</div>
                                <div className="col-span-4">Mã Bệnh nhân</div>
                                <div className="col-span-3">Trạng thái</div>
                                <div className="col-span-4 text-right">Giờ đến</div>
                            </div>

                            {filteredQueue.length === 0 && (
                                <div className="py-8 text-center text-muted-foreground">
                                    Không có bệnh nhân nào trong danh sách ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}.
                                </div>
                            )}

                            {filteredQueue.map((visit, index) => (
                                <div key={visit.id} className="grid grid-cols-12 gap-4 py-4 items-center border-b hover:bg-muted/50 transition-colors">
                                    <div className="col-span-1 font-bold text-sm text-primary">{index + 1}</div>
                                    <div className="col-span-4">
                                        <p className="font-medium truncate">{visit.patientName || visit.patientId}</p>
                                        <p className="text-xs text-muted-foreground">{visit.patientPhone}</p>
                                    </div>
                                    <div className="col-span-3">
                                        {visit.status === 'in_progress' ? (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Đang khám</span>
                                        ) : visit.status === 'waiting' ? (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">Đang chờ</span>
                                        ) : visit.status === 'waiting_payment' ? (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">Chờ thanh toán (BS)</span>
                                        ) : (
                                            <span className={`px-2 py-1 rounded text-xs font-medium transition-colors ${visit.status === 'completed'
                                                ? (visit.paymentMethod === 'transfer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')
                                                : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {visit.status === 'completed'
                                                    ? (visit.paymentMethod === 'transfer' ? 'Đã Chuyển khoản' : visit.paymentMethod === 'cash' ? 'Đã thu tiền' : 'Hoàn thành')
                                                    : visit.status}
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-span-4 text-right text-xs text-muted-foreground">
                                        {new Date(visit.checkInTime).toLocaleTimeString('vi-VN')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
