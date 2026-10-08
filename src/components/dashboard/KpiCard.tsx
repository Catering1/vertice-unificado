import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  valueClassName?: string;
  accentClassName?: string;
}

export default function KpiCard({ label, value, icon: Icon, iconBg, iconColor, valueClassName, accentClassName }: KpiCardProps) {
  return (
    <Card className={cn("relative h-full overflow-hidden border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg", accentClassName)}>
      <div className={cn("absolute inset-x-0 top-0 h-1", iconBg)} aria-hidden="true" />
      <CardContent className="flex items-start gap-3 p-3 sm:gap-4 sm:p-5">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 sm:h-11 sm:w-11", iconBg)} aria-hidden="true">
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</p>
          <p className={cn("mt-1 break-words text-base font-extrabold tabular-nums tracking-tight sm:text-2xl", valueClassName)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
