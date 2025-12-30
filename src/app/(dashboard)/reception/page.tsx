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
import { db } from "@/lib/firebase"; // Using direct db for listener
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

export default function ReceptionPage() {
    // State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [queue, setQueue] = useState<VisitSession[]>([]);

    // New Patient Form
    const [newPatient, setNewPatient] = useState({
        fullName: "",
        phone: "",
        dateOfBirth: "",
        gender: "female" as const,
        address: ""
    });

    // Load queue real-time
    useEffect(() => {
        // Query visits with status 'waiting' or 'in_progress' today 
        // For simplicity, just showing all 'waiting'
        const q = query(
            collection(db, "visits"),
            where("status", "in", ["waiting", "in_progress"]),
            orderBy("checkInTime", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const visits: VisitSession[] = [];
            snapshot.forEach((doc) => {
                visits.push({ id: doc.id, ...doc.data() } as VisitSession);
            });
            setQueue(visits);
        });

        return () => unsubscribe();
    }, []);

    // Search Handler
    const handleSearch = async () => {
        if (!searchTerm) return;
        const results = await PatientService.search(searchTerm);
        setSearchResults(results);
    };

    // Add Patient & Check In
    const handleCreatePatient = async () => {
        try {
            const created = await PatientService.create(newPatient);
            setIsAddPatientOpen(false);
            // Automatically queue them? Or select them first.
            // Let's select them first or just alert.
            alert(`Đã thêm bệnh nhân: ${created.fullName}`);
            setSearchResults([created]); // Show them in search result to click check-in
        } catch (e) {
            alert("Lỗi thêm bệnh nhân");
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
                                        <Label>Họ và tên</Label>
                                        <Input onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Số điện thoại</Label>
                                            <Input onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Năm sinh (YYYY)</Label>
                                            <Input placeholder="1995" onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Địa chỉ</Label>
                                        <Input onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreatePatient}>Lưu & Tiếp đón</Button>
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
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Hàng chờ khám (Live)
                        </CardTitle>
                        <div className="flex gap-2">
                            <span className="flex items-center gap-1 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                Đang chờ: {queue.filter(q => q.status === "waiting").length}
                            </span>
                            <span className="flex items-center gap-1 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                Đang khám: {queue.filter(q => q.status === "in_progress").length}
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

                            {queue.length === 0 && (
                                <div className="py-8 text-center text-muted-foreground">Chưa có bệnh nhân nào trong hàng chờ.</div>
                            )}

                            {queue.map((visit, index) => (
                                <div key={visit.id} className="grid grid-cols-12 gap-4 py-4 items-center border-b hover:bg-muted/50 transition-colors">
                                    <div className="col-span-1 font-bold text-sm text-primary">{index + 1}</div>
                                    <div className="col-span-4">
                                        <p className="font-medium truncate">{visit.patientName || visit.patientId}</p>
                                        <p className="text-xs text-muted-foreground">{visit.patientPhone}</p>
                                    </div>
                                    <div className="col-span-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${visit.status === 'in_progress' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {visit.status === 'in_progress' ? 'Đang khám' : 'Đang chờ'}
                                        </span>
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
