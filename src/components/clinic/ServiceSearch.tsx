"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ServiceItem } from "@/types/clinic";
import { ServiceCatalogService } from "@/lib/services/service-catalog";

interface ServiceSearchProps {
    onSelect: (service: ServiceItem) => void;
}

export function ServiceSearch({ onSelect }: ServiceSearchProps) {
    const [query, setQuery] = useState("");
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [filtered, setFiltered] = useState<ServiceItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch all services on mount
        ServiceCatalogService.getAll().then(setServices);

        // Click outside listener
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!query) {
            setFiltered(services.slice(0, 10)); // Show some default options if empty query? Or nothing. Let's show nothing until type. 
            // Actually users might want to see list. Let's show all if query empty and focused?
            // For now adhere to MedicineSearch pattern: empty -> empty.
            setFiltered([]);
            return;
        }
        const lower = query.toLowerCase();
        const matches = services.filter(s =>
            s.name.toLowerCase().includes(lower) && s.isActive
        ).slice(0, 10);
        setFiltered(matches);
        setIsOpen(true);
    }, [query, services]);

    const handleSelect = (s: ServiceItem) => {
        onSelect(s);
        setQuery("");
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm dịch vụ (Siêu âm, xét nghiệm...)"
                    className="pl-8"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => {
                        if (!query) setFiltered(services.filter(s => s.isActive).slice(0, 10)); // Show recent/top 10 on click
                        setIsOpen(true)
                    }}
                />
            </div>
            {isOpen && filtered.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filtered.map(s => (
                        <div
                            key={s.id}
                            className="p-2 hover:bg-slate-100 cursor-pointer text-sm flex justify-between"
                            onClick={() => handleSelect(s)}
                        >
                            <span className="font-medium">{s.name}</span>
                            <span className="text-blue-600 font-bold text-xs">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(s.price)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
