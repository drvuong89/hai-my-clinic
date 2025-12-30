import { MedicalRecord } from "@/types/clinic";
import React from "react";

interface PrescriptionTemplateProps {
    record: MedicalRecord;
    clinicInfo?: {
        name: string;
        address: string;
        phone: string;
    };
}

export const PrescriptionTemplate = React.forwardRef<HTMLDivElement, PrescriptionTemplateProps>(({ record, clinicInfo }, ref) => {
    const defaultClinic = {
        name: "PHÒNG KHÁM SẢN PHỤ KHOA HẢI MY",
        address: "123 Nguyễn Văn Cừ, TP. Buôn Ma Thuột",
        phone: "0912.345.678"
    };

    const info = clinicInfo || defaultClinic;
    const date = record.checkInTime ? new Date(record.checkInTime) : new Date();

    return (
        <div ref={ref} className="p-8 max-w-[210mm] mx-auto bg-white text-black font-serif text-sm leading-relaxed hidden print:block print:w-full print:max-w-none">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 border-b pb-4">
                <div>
                    <h1 className="text-xl font-bold uppercase text-blue-900">{info.name}</h1>
                    <p>{info.address}</p>
                    <p>SĐT: {info.phone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold uppercase">Đơn Thuốc</h2>
                    <p className="italic text-sm">Mã HS: {record.id.slice(0, 8)}</p>
                </div>
            </div>

            {/* Patient Info */}
            <div className="space-y-2 mb-6">
                <div className="flex gap-4">
                    <span className="font-bold min-w-[80px]">Họ tên:</span>
                    <span className="uppercase font-bold text-lg">{record.patientName}</span>
                    <span className="ml-8 font-bold">Năm sinh:</span>
                    <span>{record.dateOfBirth || "...."}</span>
                    <span className="ml-8 font-bold">Giới tính:</span>
                    <span>Nữ</span>
                </div>
                <div className="flex gap-4">
                    <span className="font-bold min-w-[80px]">Địa chỉ:</span>
                    <span>{record.patientAddress || ".................................................................."}</span>
                </div>
                <div className="flex gap-4">
                    <span className="font-bold min-w-[80px]">Chẩn đoán:</span>
                    <span className="font-medium">{record.diagnosis || "Khám bệnh"}</span>
                </div>
            </div>

            {/* Prescription List */}
            <div className="mb-6">
                <h3 className="font-bold text-lg underline mb-2">Chỉ định thuốc:</h3>
                <div className="space-y-4">
                    {record.prescription && record.prescription.length > 0 ? (
                        record.prescription.map((item, index) => (
                            <div key={index} className="pl-2">
                                <div className="flex justify-between items-baseline">
                                    <div className="font-bold text-base">
                                        {index + 1}. {item.name}
                                    </div>
                                    <div className="font-bold">
                                        Số lượng: {item.quantity} {item.unit}
                                    </div>
                                </div>
                                <div className="italic text-slate-700 pl-4 mt-1">
                                    - Cách dùng: {item.usage || "Theo chỉ dẫn bác sĩ"}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="italic text-muted-foreground">Không có thuốc được kê.</p>
                    )}
                </div>
            </div>

            {/* Advice */}
            <div className="mb-8">
                <h3 className="font-bold underline mb-1">Lời dặn:</h3>
                <p className="whitespace-pre-wrap">{record.doctorAdvice || "Tái khám khi có dấu hiệu bất thường."}</p>
            </div>

            {/* Footer */}
            <div className="flex justify-end text-center">
                <div className="space-y-1">
                    <p className="italic">Ngày {date.getDate()} tháng {date.getMonth() + 1} năm {date.getFullYear()}</p>
                    <p className="font-bold uppercase">Bác sĩ khám bệnh</p>
                    <div className="h-24"></div>
                    <p className="font-bold">{record.doctorName || "BS. Chuyên Khoa"}</p>
                </div>
            </div>

            <div className="text-center text-xs text-slate-400 mt-12 print:fixed print:bottom-4 print:left-0 print:w-full">
                Phiếu khám được tạo tự động bởi Hệ thống Quản lý Phòng khám Hải My
            </div>
        </div>
    );
});

PrescriptionTemplate.displayName = "PrescriptionTemplate";
