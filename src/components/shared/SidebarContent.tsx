"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/config/nav';
import { cn } from '@/lib/utils'; // Shadcn util

export function SidebarContent() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full bg-sidebar">
            <div className="p-6 border-b border-sidebar-border flex items-center gap-2 h-16">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">H</span>
                </div>
                <h1 className="text-xl font-bold text-primary">Hải My Clinic</h1>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-sidebar-border">
                <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground">
                        BS
                    </div>
                    <div>
                        <p className="text-sm font-medium">Bác sĩ</p>
                        <p className="text-xs text-muted-foreground">Admin</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
