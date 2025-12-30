import { Settings, Stethoscope, UserCheck, Package, Pill, BarChart3, MessageSquare } from 'lucide-react';
import { UserRole } from '@/types/clinic';

export interface NavItem {
    href: string;
    label: string;
    icon: any;
    roles?: UserRole[];
}

export const navItems: NavItem[] = [
    { href: '/reception', label: 'Tiếp đón', icon: UserCheck, roles: ['receptionist', 'admin'] },
    { href: '/doctor', label: 'Khám bệnh', icon: Stethoscope, roles: ['doctor', 'admin'] },
    { href: '/pharmacy', label: 'Nhà thuốc', icon: Pill, roles: ['pharmacist', 'admin', 'doctor'] },
    { href: '/reports', label: 'Báo cáo', icon: BarChart3, roles: ['admin'] },
    { href: '/messages', label: 'Tin nhắn', icon: MessageSquare, roles: ['receptionist', 'doctor', 'pharmacist', 'admin'] },
    { href: '/settings', label: 'Cấu hình', icon: Settings, roles: ['admin'] },
];
