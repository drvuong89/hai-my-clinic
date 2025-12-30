import { MedicalRecordForm } from "@/features/emr/components/MedicalRecordForm";
import { RecordList } from "@/features/emr/components/RecordList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EMRPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Bệnh Án Điện Tử</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Khám Sản / Phụ Khoa</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MedicalRecordForm />
                    </CardContent>
                </Card>

                <div>
                    <RecordList />
                </div>
            </div>
        </div>
    );
}
