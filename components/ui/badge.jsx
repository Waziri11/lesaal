import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-slate-600 bg-slate-800 text-slate-100",
        secondary: "border-blue-500/50 bg-blue-500/15 text-blue-200",
        success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
        destructive: "border-red-500/40 bg-red-500/15 text-red-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
