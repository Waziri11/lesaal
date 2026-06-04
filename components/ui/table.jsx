import { cn } from "../../lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-slate-700", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("border-b border-slate-700 transition-colors hover:bg-slate-800/30", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn("h-11 px-3 text-left align-middle font-medium text-slate-200", className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn("p-3 align-middle text-slate-100", className)} {...props} />;
}
