"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { medicalRecordSchema, MedicalRecordFormValues } from "../schema";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { emrService } from "@/services/emrService";
import { useRouter } from "next/navigation";

export function MedicalRecordForm() {
    const router = useRouter();
    const form = useForm<MedicalRecordFormValues>({
        resolver: zodResolver(medicalRecordSchema),
        defaultValues: {
            patientId: "",
            vitalSigns: {
                weight: "",
                bloodPressure: "",
                fetalHeartRate: "",
            },
            clinicalDiagnosis: "",
            doctorNotes: "",
            visitDate: new Date(),
        },
    });

    async function onSubmit(data: MedicalRecordFormValues) {
        try {
            await emrService.saveRecord(data);
            alert("Đã lưu bệnh án thành công!");
            router.push("/emr"); // Redirect or refresh
            form.reset();
        } catch (error) {
            console.error(error);
            alert("Lỗi khi lưu bệnh án. Vui lòng thử lại.");
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="visitDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Ngày khám</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "dd/MM/yyyy")
                                                ) : (
                                                    <span>Chọn ngày</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="patientId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mã Bệnh Nhân / ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="Nhập ID hoặc tìm kiếm..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                    <h3 className="font-semibold text-lg">Chỉ số sinh hiệu</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="vitalSigns.weight"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cân nặng (kg)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="vitalSigns.bloodPressure"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Huyết áp (mmHg)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="120/80" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="vitalSigns.fetalHeartRate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tim thai (lần/phút)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="clinicalDiagnosis"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Chẩn đoán lâm sàng</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Nhập chẩn đoán..."
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="doctorNotes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ghi chú bác sĩ (Hướng xử trí)</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Lời dặn, hẹn tái khám..."
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" size="lg" className="w-full md:w-auto">Lưu Bệnh Án</Button>
            </form>
        </Form>
    );
}
