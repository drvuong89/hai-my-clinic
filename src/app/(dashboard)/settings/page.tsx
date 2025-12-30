import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Pill, User, FileText, CreditCard } from "lucide-react";

const settingsModules = [
    {
        title: "Danh mục Dịch vụ",
        description: "Quản lý giá khám, thủ thuật, xét nghiệm",
        href: "/settings/services",
        icon: FileText
    },
    {
        title: "Danh mục Thuốc",
        description: "Quản lý kho dược, nhập/xuất tồn",
        href: "/pharmacy", // Redirect to pharmacy module for now
        icon: Pill
    },
    {
        title: "Tài khoản nhân viên",
        description: "Quản lý bác sĩ, y tá, thu ngân",
        href: "/settings/users",
        icon: User
    },
];

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Cấu hình hệ thống</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {settingsModules.map((module) => (
                    <Link key={module.href} href={module.href}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <module.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg">{module.title}</CardTitle>
                                </div>
                                <CardDescription>{module.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
