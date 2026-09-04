import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange: (startDate?: string, endDate?: string) => void;
  className?: string;
  placeholder?: string;
}

function parseLocalDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return undefined;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = "",
  placeholder = "Pick event date range",
}) => {
  const [open, setOpen] = React.useState(false);

  const selectedRange: DateRange | undefined = React.useMemo(() => {
    const from = parseLocalDate(startDate);
    const to = parseLocalDate(endDate);
    if (!from && !to) return undefined;
    return { from, to };
  }, [startDate, endDate]);

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) {
      onChange(undefined, undefined);
      return;
    }

    const startStr = range.from ? format(range.from, "yyyy-MM-dd") : undefined;
    const endStr = range.to ? format(range.to, "yyyy-MM-dd") : undefined;
    onChange(startStr, endStr);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined, undefined);
  };

  const displayText = React.useMemo(() => {
    const from = parseLocalDate(startDate);
    const to = parseLocalDate(endDate);

    if (from && to) {
      return `${format(from, "MMM d, yyyy")} - ${format(to, "MMM d, yyyy")}`;
    }
    if (from) {
      return `${format(from, "MMM d, yyyy")} (Start)`;
    }
    if (to) {
      return `Until ${format(to, "MMM d, yyyy")}`;
    }
    return placeholder;
  }, [startDate, endDate, placeholder]);

  const hasDate = Boolean(startDate || endDate);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-between text-left text-xs font-normal h-9 bg-background/50",
              !hasDate && "text-muted-foreground",
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{displayText}</span>
            </div>
            {hasDate && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e as any);
                }}
                className="ml-2 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                title="Clear dates"
              >
                <X className="size-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={parseLocalDate(startDate) || new Date()}
            selected={selectedRange}
            onSelect={handleSelect}
            numberOfMonths={1}
            className="rounded-md border"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
