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
    // Fix timezone issue by using local date
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split("T")[0];
    });
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

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
                                <span className="text-muted-foreground font-bold">∑</span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {revenueData ? revenueData.totalRevenue.toLocaleString('vi-VN') : "..."} ₫
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tiền Dịch vụ</CardTitle>
                                <span className="text-muted-foreground font-bold">D</span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">
                                    {revenueData ? revenueData.serviceRevenue.toLocaleString('vi-VN') : "..."} ₫
                                </div>
                                <p className="text-xs text-muted-foreground">Khám, Siêu âm, Thủ thuật</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tiền Thuốc</CardTitle>
                                <span className="text-muted-foreground font-bold">T</span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600">
                                    {revenueData ? revenueData.medicineRevenue.toLocaleString('vi-VN') : "..."} ₫
                                </div>
                                <p className="text-xs text-muted-foreground">Bán thuốc rẽ & theo đơn</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Hoạt động</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium">
                                    {revenueData ? revenueData.totalVisits : "..."} Ca khám
                                </div>
                                <div className="text-sm font-medium text-muted-foreground">
                                    {revenueData ? revenueData.totalOrders : "..."} Đơn thuốc
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* BREAKDOWN TABLES */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* SERVICE BREAKDOWN */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Chi tiết Dịch vụ</CardTitle>
                                <CardDescription>Doanh thu theo loại dịch vụ</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-h-[400px] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-muted-foreground">
                                                <th className="text-left font-medium py-2">Tên Dịch vụ</th>
                                                <th className="text-right font-medium py-2">Số lượng</th>
                                                <th className="text-right font-medium py-2">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {revenueData && revenueData.revenueByServiceItem ? (
                                                Object.entries(revenueData.revenueByServiceItem)
                                                    .sort(([, a], [, b]) => b.amount - a.amount)
                                                    .map(([name, data]) => (
                                                        <tr key={name} className="border-b last:border-0 hover:bg-slate-50">
                                                            <td className="py-2 text-slate-700">{name}</td>
                                                            <td className="py-2 text-right font-mono">{data.quantity}</td>
                                                            <td className="py-2 text-right font-bold text-blue-600">
                                                                {data.amount.toLocaleString('vi-VN')}
                                                            </td>
                                                        </tr>
                                                    ))
                                            ) : (
                                                <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Chưa có dữ liệu.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* MEDICINE BREAKDOWN */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Chi tiết Thuốc</CardTitle>
                                <CardDescription>Doanh thu theo mặt hàng thuốc</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-h-[400px] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-muted-foreground">
                                                <th className="text-left font-medium py-2">Tên Thuốc (Mã)</th>
                                                <th className="text-right font-medium py-2">Số lượng</th>
                                                <th className="text-right font-medium py-2">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {revenueData && revenueData.revenueByMedicineItem ? (
                                                Object.entries(revenueData.revenueByMedicineItem)
                                                    .sort(([, a], [, b]) => b.amount - a.amount)
                                                    .map(([name, data]) => (
                                                        <tr key={name} className="border-b last:border-0 hover:bg-slate-50">
                                                            <td className="py-2 text-slate-700 max-w-[150px] truncate" title={name}>{name}</td>
                                                            <td className="py-2 text-right font-mono">{data.quantity}</td>
                                                            <td className="py-2 text-right font-bold text-orange-600">
                                                                {data.amount.toLocaleString('vi-VN')}
                                                            </td>
                                                        </tr>
                                                    ))
                                            ) : (
                                                <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Chưa có dữ liệu.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* TRANSACTIONS TAB */}
                    <Tabs defaultValue="hide" className="w-full mt-6">
                        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                            <TabsTrigger
                                value="details"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                            >
                                Chi tiết giao dịch (Logs)
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="pt-4">
                            <Card>
                                <CardContent className="p-0">
                                    <div className="relative w-full overflow-auto max-h-[500px]">
                                        <table className="w-full caption-bottom text-sm text-left">
                                            <thead className="[&_tr]:border-b sticky top-0 bg-white">
                                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Giờ</th>
                                                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Bệnh nhân</th>
                                                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Hạng mục</th>
                                                    <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody className="[&_tr:last-child]:border-0">
                                                {loadingRevenue ? (
                                                    <tr><td colSpan={4} className="p-4 text-center">Đang tải...</td></tr>
                                                ) : revenueData?.visits.length === 0 ? (
                                                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Không có dữ liệu giao dịch cho ngày này.</td></tr>
                                                ) : (
                                                    revenueData?.visits.map((visit) => (
                                                        <tr key={visit.id} className="border-b transition-colors hover:bg-muted/50">
                                                            <td className="p-4 align-middle">{visit.time}</td>
                                                            <td className="p-4 align-middle font-medium">
                                                                {visit.patientName}<br />
                                                                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${visit.type === 'service' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                                                                    }`}>{visit.type === 'service' ? 'Dịch vụ' : 'Thuốc'}</span>
                                                            </td>
                                                            <td className="p-4 align-middle text-muted-foreground text-xs max-w-[300px]">
                                                                {visit.items.join(", ")}
                                                            </td>
                                                            <td className="p-4 align-middle text-right font-bold">
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
                    </Tabs>
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
