"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash, UserCog, Shield } from "lucide-react";
import { UserService } from "@/lib/services/user-service";
import { AppUser, UserRole } from "@/types/clinic";

export default function UserSettingsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [currentId, setCurrentId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<AppUser>>({
        displayName: "",
        username: "",
        password: "",
        role: "doctor",
        email: "",
        phone: "",
        isActive: true
    });

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await UserService.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filteredUsers = users.filter(u =>
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenAdd = () => {
        setCurrentId(null);
        setFormData({
            displayName: "",
            username: "",
            password: "",
            role: "doctor",
            email: "",
            phone: "",
            isActive: true
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (user: AppUser) => {
        setCurrentId(user.id);
        setFormData({ ...user, password: "" }); // Don't show existing password
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.username || !formData.displayName) {
            alert("Vui lòng nhập đầy đủ thông tin bắt buộc");
            return;
        }

        try {
            if (currentId) {
                await UserService.updateUser(currentId, formData);
            } else {
                await UserService.addUser(formData as AppUser);
            }
            setIsDialogOpen(false);
            loadUsers();
        } catch (e) {
            console.error(e);
            alert("Lỗi lưu dữ liệu");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Chắc chắn xóa tài khoản này?")) {
            await UserService.deleteUser(id);
            loadUsers();
        }
    };

    const getRoleLabel = (role: UserRole) => {
        switch (role) {
            case 'admin': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Admin</span>;
            case 'doctor': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Bác sĩ</span>;
            case 'pharmacist': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Dược sĩ</span>;
            case 'receptionist': return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">Tiếp đón</span>;
            default: return role;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Quản lý Nhân sự</h2>
                    <p className="text-muted-foreground">Tài khoản, phân quyền và thông tin nhân viên.</p>
                </div>
                <Button onClick={handleOpenAdd} className="gap-2">
                    <Plus className="w-4 h-4" /> Thêm nhân viên
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Danh sách nhân viên</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm theo tên hoặc username..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nhân viên</TableHead>
                                <TableHead>Tên đăng nhập</TableHead>
                                <TableHead>Vai trò</TableHead>
                                <TableHead>Liên hệ</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Đang tải...</TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có nhân viên nào.</TableCell>
                                </TableRow>
                            ) : filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <UserCog className="w-4 h-4 text-slate-500" />
                                            </div>
                                            {user.displayName}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{user.username}</TableCell>
                                    <TableCell>{getRoleLabel(user.role)}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {user.phone || "---"}<br />{user.email}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(user)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(user.id)}>
                                                <Trash className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{currentId ? "Cập nhật nhân viên" : "Thêm nhân viên mới"}</DialogTitle>
                        <DialogDescription>Tạo tài khoản và phân quyền truy cập.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Họ và tên <span className="text-red-500">*</span></Label>
                                <Input value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} placeholder="VD: Nguyễn Văn A" />
                            </div>
                            <div className="space-y-2">
                                <Label>Tên đăng nhập <span className="text-red-500">*</span></Label>
                                <Input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="username" disabled={!!currentId} />
                            </div>
                            <div className="space-y-2">
                                <Label>Mật khẩu {currentId && "(Để trống nếu không đổi)"}</Label>
                                <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="******" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Phân quyền (Role) <span className="text-red-500">*</span></Label>
                                <Select value={formData.role} onValueChange={(v: UserRole) => setFormData({ ...formData, role: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn vai trò" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="doctor">Bác sĩ (Khám bệnh, Kê đơn)</SelectItem>
                                        <SelectItem value="receptionist">Tiếp đón (Đăng ký, Thu ngân)</SelectItem>
                                        <SelectItem value="pharmacist">Dược sĩ (Kho thuốc, Bán thuốc)</SelectItem>
                                        <SelectItem value="admin">Quản trị viên (Full quyền)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Số điện thoại</Label>
                                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSave}>Lưu thông tin</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
