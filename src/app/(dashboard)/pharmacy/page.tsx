"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MedicineCatalog } from "@/features/pharmacy/components/MedicineCatalog";
import { InventoryManager } from "@/features/pharmacy/components/InventoryManager";
import { PointOfSale } from "@/features/pharmacy/components/PointOfSale";
import { Pill, Box, Store } from "lucide-react";

export default function PharmacyPage() {
    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-3xl font-bold tracking-tight">Quản lý Nhà thuốc</h2>
            </div>

            <Tabs defaultValue="pos" className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full md:w-[600px] grid-cols-3">
                    <TabsTrigger value="pos" className="gap-2">
                        <Store className="w-4 h-4" /> Bán hàng (POS)
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="gap-2">
                        <Box className="w-4 h-4" /> Kho & Nhập hàng
                    </TabsTrigger>
                    <TabsTrigger value="catalog" className="gap-2">
                        <Pill className="w-4 h-4" /> Danh mục thuốc
                    </TabsTrigger>
                </TabsList>

                <div className="flex-1 mt-4 overflow-hidden h-full">
                    <TabsContent value="pos" className="h-full m-0">
                        <PointOfSale />
                    </TabsContent>
                    <TabsContent value="inventory" className="h-full m-0 overflow-auto">
                        <InventoryManager />
                    </TabsContent>
                    <TabsContent value="catalog" className="h-full m-0 overflow-auto">
                        <MedicineCatalog />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
