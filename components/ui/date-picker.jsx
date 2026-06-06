"use client";

import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export function DatePicker({ value, onChange, disabled, className, placeholder = "Pick a date" }) {
  const selectedDate = (() => {
    if (!value) return null;

    const raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(`${raw}T00:00:00`);
    }

    return new Date(raw);
  })();
  const isValidDate = selectedDate && !Number.isNaN(selectedDate.getTime());

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start border-[color:var(--ui-border)] bg-[color:var(--ui-input)] text-left font-normal text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-accent)]",
            !isValidDate && "text-[color:var(--ui-muted-foreground)]",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {isValidDate ? format(selectedDate, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={isValidDate ? selectedDate : undefined}
          onSelect={(date) => {
            onChange?.(date ? format(date, "yyyy-MM-dd") : "");
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
