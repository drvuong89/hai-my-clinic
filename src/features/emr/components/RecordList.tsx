"use client";

import { useEffect, useState } from "react";
import { emrService } from "@/services/emrService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export function RecordList() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Hardcoded patientId for demo, in real app this comes from URL or Context
    const DEMO_PATIENT_ID = "DEMO_PATIENT_001";

    useEffect(() => {
        async function fetchRecords() {
            try {
                // In a real scenario, we might list all recent records or filter by patient
                // For now, let's just query by a demo patient ID or show empty state if none
                const data = await emrService.getRecordsByPatient(DEMO_PATIENT_ID);
                setRecords(data);
            } catch (error) {
                console.error("Failed to fetch records", error);
            } finally {
                setLoading(false);
            }
        }

        fetchRecords();
    }, []);

    if (loading) return <div>Đang tải dữ liệu...</div>;
    if (records.length === 0) return <div className="text-muted-foreground text-sm mt-4">Chưa có lịch sử khám bệnh (demo patient).</div>;

    return (
        <div className="space-y-4 mt-8">
            <h3 className="font-semibold text-lg">Lịch sử khám bệnh</h3>
            {records.map((record) => (
                <Card key={record.id}>
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">
                            {record.visitDate?.seconds ? format(new Date(record.visitDate.seconds * 1000), "dd/MM/yyyy") : "N/A"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 text-sm">
                        <p><strong>Chẩn đoán:</strong> {record.clinicalDiagnosis}</p>
                        {record.doctorNotes && <p className="mt-1 text-muted-foreground">Note: {record.doctorNotes}</p>}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
