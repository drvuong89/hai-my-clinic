"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Clock, ArrowRight, Play, CheckCircle } from "lucide-react";
import Link from "next/link";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { VisitSession } from "@/types/clinic";

export default function DoctorDashboard() {
    const [queue, setQueue] = useState<VisitSession[]>([]);

    useEffect(() => {
        // Query visits with status 'waiting'
        const q = query(
            collection(db, "visits"),
            where("status", "in", ["waiting"]),
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

    const nextPatient = queue[0];
    const waitingCount = queue.length;
    // For demo, we might want to query 'completed' counts too, but let's keep it simple for now or fetch separate count
    const completedCount = 0; // Placeholder

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Khu vực Bác sĩ</h2>
                    <p className="text-muted-foreground">Danh sách bệnh nhân đang chờ khám.</p>
                </div>
                <div className="flex gap-2">
                    <Card className="bg-blue-50 border-blue-100">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="bg-blue-200 p-2 rounded-full">
                                <Clock className="w-4 h-4 text-blue-700" />
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium uppercase">Đang chờ</p>
                                <p className="text-xl font-bold text-blue-900">{waitingCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* UP NEXT SECTION */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Active Patient Card (Highlight) */}
                <div className="col-span-2">
                    {nextPatient ? (
                        <Card className="border-primary/50 shadow-md h-full">
                            <CardHeader className="bg-primary/5 border-b pb-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-xl text-primary">
                                            <Play className="w-5 h-5 fill-current" />
                                            Bệnh nhân tiếp theo
                                        </CardTitle>
                                        <CardDescription>Ưu tiên cao nhất trong hàng chờ</CardDescription>
                                    </div>
                                    <span className="text-4xl font-black text-primary/20">#01</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-bold">{nextPatient.patientName}</h3>
                                        <div className="flex gap-4 text-muted-foreground">
                                            {nextPatient.dateOfBirth && <span className="flex items-center gap-1"><User className="w-4 h-4" /> SN: {nextPatient.dateOfBirth}</span>}
                                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Chờ từ {new Date(nextPatient.checkInTime).toLocaleTimeString('vi-VN')}</span>
                                        </div>
                                    </div>
                                    <Button size="lg" className="w-full md:w-auto" asChild>
                                        <Link href={`/doctor/${nextPatient.id}`}>
                                            Bắt đầu khám <ArrowRight className="ml-2 w-4 h-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="h-full flex items-center justify-center p-10 bg-slate-50 border-dashed">
                            <div className="text-center text-muted-foreground">
                                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Đã khám hết bệnh nhân trong hàng chờ.</p>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Waiting List */}
                <Card className="col-span-1 h-full">
                    <CardHeader>
                        <CardTitle className="text-lg">Danh sách chờ ({Math.max(0, queue.length - 1)})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
                        {queue.length > 1 ? (
                            queue.slice(1).map((patient, index) => (
                                <Link href={`/doctor/${patient.id}`} key={patient.id} className="group block">
                                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors group-hover:border-primary/50">
                                        <div>
                                            <p className="font-medium group-hover:text-primary transition-colors">{patient.patientName}</p>
                                            <p className="text-xs text-muted-foreground">{patient.patientPhone}</p>
                                        </div>
                                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                            {new Date(patient.checkInTime).toLocaleTimeString('vi-VN')}
                                        </span>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground text-center py-4">Không có bệnh nhân nào khác.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
