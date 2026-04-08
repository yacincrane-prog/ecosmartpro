import * as React from "react";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerFieldProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

const presets = [
  { label: "اليوم", getDate: () => new Date() },
  { label: "أمس", getDate: () => subDays(new Date(), 1) },
  { label: "بداية الأسبوع", getDate: () => startOfWeek(new Date(), { weekStartsOn: 6 }) },
  { label: "بداية الشهر", getDate: () => startOfMonth(new Date()) },
];

export default function DatePickerField({ value, onChange, placeholder = "اختر تاريخ", className, error }: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Date | undefined>(
    value ? new Date(value + "T00:00:00") : undefined
  );

  React.useEffect(() => {
    setTempDate(value ? new Date(value + "T00:00:00") : undefined);
  }, [value]);

  const handleConfirm = () => {
    if (tempDate) {
      onChange(format(tempDate, "yyyy-MM-dd"));
    }
    setOpen(false);
  };

  const handlePreset = (getDate: () => Date) => {
    const d = getDate();
    setTempDate(d);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-right font-normal h-10",
            !value && "text-muted-foreground",
            error && "border-destructive",
            className
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
          {value
            ? format(new Date(value + "T00:00:00"), "d MMMM yyyy", { locale: ar })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Presets */}
        <div className="flex flex-wrap gap-1.5 p-3 pb-0">
          {presets.map((p) => (
            <Button
              key={p.label}
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => handlePreset(p.getDate)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <Calendar
          mode="single"
          selected={tempDate}
          onSelect={setTempDate}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />

        {/* Confirm button */}
        <div className="p-3 pt-0">
          <Button
            className="w-full font-semibold"
            size="sm"
            onClick={handleConfirm}
          >
            تأكيد
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
