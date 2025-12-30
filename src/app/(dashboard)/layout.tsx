import { AppSidebar } from "@/components/shared/AppSidebar";
import { MobileNav } from "@/components/shared/MobileNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background flex">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-h-screen md:ml-64 transition-all duration-300">
                <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background px-6 md:hidden">
                    <MobileNav />
                    <h1 className="ml-4 text-lg font-semibold md:hidden">Hải My Clinic</h1>
                </header>
                <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
