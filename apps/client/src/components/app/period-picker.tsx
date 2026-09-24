import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { PRESETS, usePeriod } from "@/lib/period";
import { cn } from "@/lib/utils";

export function PeriodPicker({ className }: { className?: string }) {
  const { period, setPreset, setCustom } = usePeriod();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(
    period.key === "custom"
      ? { from: period.start, to: period.end }
      : undefined,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-2 font-normal", className)}>
          <CalendarRange className="size-4 text-muted-foreground" />
          <span className="max-w-44 truncate">{period.label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col gap-0.5 p-2 sm:w-44">
            <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">
              Period
            </p>
            {PRESETS.map((preset) => (
              <Button
                key={preset.key}
                variant="ghost"
                size="sm"
                className="justify-between font-normal"
                onClick={() => {
                  setPreset(preset.key);
                  setRange(undefined);
                  setOpen(false);
                }}>
                {preset.label}
                {period.key === preset.key && (
                  <Check className="size-4 text-primary" />
                )}
              </Button>
            ))}
          </div>
          <Separator
            orientation="vertical"
            className="hidden h-auto sm:block"
          />
          <Separator className="sm:hidden" />
          <div className="p-2">
            <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">
              Custom range
            </p>
            <Calendar
              mode="range"
              numberOfMonths={1}
              selected={range}
              onSelect={setRange}
              disabled={{ after: new Date() }}
              defaultMonth={range?.from ?? period.start}
            />
            <div className="flex justify-end px-2 pb-1">
              <Button
                size="sm"
                disabled={!range?.from || !range.to}
                onClick={() => {
                  if (range?.from && range.to) {
                    setCustom(range.from, range.to);
                    setOpen(false);
                  }
                }}>
                Apply range
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
