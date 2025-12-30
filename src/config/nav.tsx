import { Settings, Stethoscope, UserCheck, Package, Pill, BarChart3, MessageSquare } from 'lucide-react';

export const navItems = [
    { href: '/reception', label: 'Tiếp đón', icon: UserCheck },
    { href: '/doctor', label: 'Khám bệnh', icon: Stethoscope },
    { href: '/pharmacy', label: 'Nhà thuốc', icon: Pill },
    { href: '/reports', label: 'Báo cáo', icon: BarChart3 },
    { href: '/messages', label: 'Tin nhắn', icon: MessageSquare }, // New item
    { href: '/settings', label: 'Cấu hình', icon: Settings },
];
