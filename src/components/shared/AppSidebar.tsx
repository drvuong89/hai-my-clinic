import { SidebarContent } from "./SidebarContent";

export function AppSidebar() {
    return (
        <aside className="fixed left-0 top-0 h-screen w-64 border-r border-sidebar-border hidden md:flex flex-col z-30">
            <SidebarContent />
        </aside>
    );
}
