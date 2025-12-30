"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Download, FileSpreadsheet, Calendar } from "lucide-react";
import { ReportService, DailyRevenue } from "@/lib/services/report-service";
import { Patient } from "@/types/clinic";

export default function ReportsPage() {
    // State for Revenue
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [revenueData, setRevenueData] = useState<DailyRevenue | null>(null);
    const [loadingRevenue, setLoadingRevenue] = useState(false);

    // State for Export
    const [exporting, setExporting] = useState(false);

    // Fetch Revenue when date changes
    useEffect(() => {
        fetchRevenue();
    }, [selectedDate]);

    const fetchRevenue = async () => {
        setLoadingRevenue(true);
        try {
            const data = await ReportService.getDailyRevenue(selectedDate);
            setRevenueData(data);
        } catch (error) {
            console.error(error);
            // Optionally toast error
        } finally {
            setLoadingRevenue(false);
        }
    };

    const handleExportPatients = async () => {
        setExporting(true);
        try {
            const patients = await ReportService.getAllPatients();

            // Convert to CSV
            const headers = ["ID", "Họ tên", "Số điện thoại", "Ngày sinh", "Giới tính", "Địa chỉ", "Email", "Ngày tạo"];
            const csvRows = [
                headers.join(","), // Header row
                ...patients.map(p => {
                    const dob = p.dateOfBirth ? `"${p.dateOfBirth}"` : "";
                    const created = p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : "";
                    return [
                        `"${p.id}"`,
                        `"${p.fullName}"`,
                        `"${p.phone}"`,
                        dob,
                        `"${p.gender}"`,
                        `"${p.address || ""}"`,
                        `"${p.email || ""}"`,
                        `"${created}"`
                    ].join(",");
                })
            ];

            const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `danh_sach_benh_nhan_${new Date().toISOString().split("T")[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert(`Đã xuất ${patients.length} bệnh nhân thành công!`);

        } catch (error) {
            console.error("Export error:", error);
            alert("Lỗi khi xuất dữ liệu.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                Báo cáo & Thống kê
            </h1>

            <Tabs defaultValue="revenue" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="revenue">Doanh thu ngày</TabsTrigger>
                    <TabsTrigger value="export">Xuất dữ liệu</TabsTrigger>
                </TabsList>

                {/* REVENUE TAB */}
                <TabsContent value="revenue" className="space-y-4 pt-4">
                    <div className="flex items-center gap-4">
                        <Label>Chọn ngày xem:</Label>
                        <div className="relative">
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-[180px]"
                            />
                            {/* <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" /> */}
                        </div>
                        <Button variant="outline" onClick={fetchRevenue} disabled={loadingRevenue}>
                            Làm mới
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
                                <span className="text-muted-foreground font-bold">₫</span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {revenueData ? revenueData.totalRevenue.toLocaleString('vi-VN') : "..."} ₫
                                </div>
                                <p className="text-xs text-muted-foreground">Trong ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tổng lượt khám</CardTitle>
                                <span className="text-muted-foreground font-bold">#</span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">
                                    {revenueData ? revenueData.totalVisits : "..."}
                                </div>
                                <p className="text-xs text-muted-foreground">Ca khám có phát sinh dịch vụ</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Chi tiết giao dịch</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Giờ</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Bệnh nhân</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Dịch vụ</th>
                                            <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {loadingRevenue ? (
                                            <tr><td colSpan={4} className="p-4 text-center">Đang tải...</td></tr>
                                        ) : revenueData?.visits.length === 0 ? (
                                            <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Không có dữ liệu doanh thu cho ngày này.</td></tr>
                                        ) : (
                                            revenueData?.visits.map((visit) => (
                                                <tr key={visit.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-2 align-middle">{visit.time}</td>
                                                    <td className="p-2 align-middle font-medium">{visit.patientName}</td>
                                                    <td className="p-2 align-middle text-muted-foreground text-xs max-w-[200px] truncate">
                                                        {visit.services.join(", ")}
                                                    </td>
                                                    <td className="p-2 align-middle text-right font-bold">
                                                        {visit.amount.toLocaleString('vi-VN')}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* EXPORT TAB */}
                <TabsContent value="export" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Xuất dữ liệu Bệnh nhân</CardTitle>
                            <CardDescription>
                                Tải xuống toàn bộ danh sách bệnh nhân dưới dạng file CSV để sử dụng trong Excel hoặc Google Sheets.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded border flex items-center gap-4">
                                <FileSpreadsheet className="w-10 h-10 text-green-600" />
                                <div>
                                    <p className="font-medium">File CSV (Excel/Sheets)</p>
                                    <p className="text-sm text-muted-foreground">Bao gồm: Họ tên, SĐT, Ngày sinh, Địa chỉ, Lịch sử khám...</p>
                                </div>
                            </div>
                            <Button onClick={handleExportPatients} disabled={exporting} className="w-full md:w-auto">
                                {exporting ? "Đang xử lý..." : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Tải xuống trọn bộ
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
