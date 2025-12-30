"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Medicine } from "@/types/clinic";
import { PharmacyService } from "@/lib/services/pharmacy-service";

interface MedicineSearchProps {
    onSelect: (medicine: Medicine) => void;
}

export function MedicineSearch({ onSelect }: MedicineSearchProps) {
    const [query, setQuery] = useState("");
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [filtered, setFiltered] = useState<Medicine[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch all medicines on mount (optimize later if list is huge)
        PharmacyService.getMedicines().then(setMedicines);

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
            setFiltered([]);
            return;
        }
        const lower = query.toLowerCase();
        const matches = medicines.filter(m =>
            m.name.toLowerCase().includes(lower) ||
            m.sku?.toLowerCase().includes(lower)
        ).slice(0, 10);
        setFiltered(matches);
        setIsOpen(true);
    }, [query, medicines]);

    const handleSelect = (m: Medicine) => {
        onSelect(m);
        setQuery("");
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm tên thuốc, hoạt chất..."
                    className="pl-8"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => query && setIsOpen(true)}
                />
            </div>
            {isOpen && filtered.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filtered.map(m => (
                        <div
                            key={m.id}
                            className="p-2 hover:bg-slate-100 cursor-pointer text-sm flex justify-between"
                            onClick={() => handleSelect(m)}
                        >
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground text-xs bg-slate-100 px-2 py-0.5 rounded">{m.unit}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
