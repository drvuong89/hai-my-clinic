"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { User, Clock, ArrowRight, Play, CheckCircle } from "lucide-react";
import Link from "next/link";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { VisitSession } from "@/types/clinic";

export default function DoctorDashboard() {
    const [activeTab, setActiveTab] = useState("waiting");
    const [searchQuery, setSearchQuery] = useState("");
    const [queue, setQueue] = useState<VisitSession[]>([]);

    useEffect(() => {
        // Query visits with status 'waiting', 'in_progress', or 'completed'
        const q = query(
            collection(db, "visits"),
            where("status", "in", ["waiting", "in_progress", "completed"])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const visits: VisitSession[] = [];
            snapshot.forEach((doc) => {
                visits.push({ id: doc.id, ...doc.data() } as VisitSession);
            });

            // Client-side sort: In Progress -> Waiting -> Completed (newest first)
            visits.sort((a, b) => {
                if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
                if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;

                if (a.status === 'waiting' && b.status === 'completed') return -1;
                if (a.status === 'completed' && b.status === 'waiting') return 1;

                // If both completed, show newest first
                if (a.status === 'completed' && b.status === 'completed') return (b.checkInTime || 0) - (a.checkInTime || 0);

                return (a.checkInTime || 0) - (b.checkInTime || 0);
            });
            setQueue(visits);
        });

        return () => unsubscribe();
    }, []);

    // Filter groups
    const waitingList = queue.filter(v => v.status === 'waiting');
    const inProgressList = queue.filter(v => v.status === 'in_progress');
    // Include everything else as history (completed, or any weird status)
    const completedList = queue.filter(v => v.status === 'completed' || (v.status !== 'waiting' && v.status !== 'in_progress'));

    // Filter by search
    const filteredQueue = queue.filter(v =>
        (activeTab === 'waiting' ? v.status === 'waiting' :
            activeTab === 'in_progress' ? v.status === 'in_progress' :
                v.status === 'completed') &&
        (v.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.patientPhone?.includes(searchQuery))
    );

    const nextPatient = waitingList[0];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Khu vực Bác sĩ</h2>
                    <p className="text-muted-foreground">Quản lý bệnh nhân và thực hiện khám bệnh.</p>
                </div>
                <div className="flex gap-2">
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
                </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded border">
                <Input
                    placeholder="Tìm kiếm bệnh nhân (Tên, SĐT)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm border-none shadow-none focus-visible:ring-0"
                />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="waiting">Danh sách chờ ({waitingList.length})</TabsTrigger>
                    <TabsTrigger value="in_progress">Đang khám ({inProgressList.length})</TabsTrigger>
                    <TabsTrigger value="history">Lịch sử ({completedList.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="waiting" className="space-y-4">
                    {/* Active Patient Card (Next in line) */}
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

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredQueue.map((patient) => (
                            <Link href={`/doctor/${patient.id}`} key={patient.id} className="group block h-full">
                                <Card className="hover:border-primary/50 transition-colors h-full">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold group-hover:text-primary mb-1">{patient.patientName}</div>
                                            <div className="text-xs text-muted-foreground">{patient.patientPhone}</div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                                                {new Date(patient.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                        {filteredQueue.length === 0 && (
                            <div className="col-span-full text-center py-10 text-muted-foreground border-dashed border-2 rounded-lg">
                                Không có bệnh nhân nào trong danh sách chờ.
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="in_progress" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredQueue.map((patient) => (
                            <Link href={`/doctor/${patient.id}`} key={patient.id} className="group block h-full">
                                <Card className="border-green-200 bg-green-50/50 hover:border-green-500 transition-colors h-full">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-green-900 mb-1">{patient.patientName}</div>
                                            <div className="text-xs text-green-700">{patient.patientPhone}</div>
                                            <div className="text-xs text-green-600 mt-1 italic">Đang khám...</div>
                                        </div>
                                        <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-100">
                                            Tiếp tục
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                        {filteredQueue.length === 0 && (
                            <div className="col-span-full text-center py-10 text-muted-foreground border-dashed border-2 rounded-lg">
                                Không có bệnh nhân nào đang khám.
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredQueue.map((patient) => (
                            <Link href={`/doctor/${patient.id}`} key={patient.id} className="group block h-full">
                                <Card className="bg-slate-50 hover:border-slate-400 transition-colors h-full">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-slate-700 mb-1">{patient.patientName}</div>
                                            <div className="text-xs text-slate-500">{patient.patientPhone}</div>
                                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Đã khám
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs bg-white px-2 py-1 rounded border">
                                                {new Date(patient.checkInTime).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                        {filteredQueue.length === 0 && (
                            <div className="col-span-full text-center py-10 text-muted-foreground border-dashed border-2 rounded-lg">
                                Không có lịch sử khám nào.
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
