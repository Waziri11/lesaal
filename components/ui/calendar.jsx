import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  const navButtonClassName = cn(
    buttonVariants({ variant: "outline", size: "icon" }),
    "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months:
          "flex flex-col gap-4 sm:flex-row sm:gap-6 sm:[&>*:not(:first-child)]:border-l sm:[&>*:not(:first-child)]:border-[color:var(--ui-border)] sm:[&>*:not(:first-child)]:pl-6",
        month: "space-y-4",
        month_caption: "relative flex items-center justify-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "pointer-events-none absolute inset-x-0 top-1 flex items-center justify-between px-1",
        button_previous: cn(navButtonClassName, "pointer-events-auto"),
        button_next: cn(navButtonClassName, "pointer-events-auto"),
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7",
        weekday:
          "h-9 w-9 text-center text-[0.8rem] font-medium text-[color:var(--ui-muted-foreground)]",
        weeks: "grid gap-1",
        week: "grid grid-cols-7",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 aria-selected:bg-[color:var(--ui-primary)] aria-selected:text-[color:var(--ui-primary-foreground)]"
        ),
        selected:
          "bg-[color:var(--ui-primary-soft)] text-[color:var(--ui-foreground)]",
        today: "text-[color:var(--ui-foreground)] [&>button]:border [&>button]:border-[color:var(--ui-ring)]",
        outside: "text-[color:var(--ui-muted-foreground)] opacity-45",
        disabled: "text-[color:var(--ui-muted-foreground)] opacity-45",
        range_middle:
          "aria-selected:bg-[color:var(--ui-accent)] aria-selected:text-[color:var(--ui-accent-foreground)]",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...iconProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...iconProps} />
          ),
      }}
      {...props}
    />
  );
}
