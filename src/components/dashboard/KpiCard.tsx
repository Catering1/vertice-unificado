import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  shortLabel: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  valueClassName?: string;
  accentClassName?: string;
}

export default function KpiCard({ label, shortLabel, value, icon: Icon, iconBg, iconColor, valueClassName, accentClassName }: KpiCardProps) {
  return (
    <Card title={label} className={cn("relative h-28 min-w-0 overflow-hidden border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg", accentClassName)}>
      <div className={cn("absolute inset-x-0 top-0 h-1", iconBg)} aria-hidden="true" />
      <CardContent className="flex h-full min-w-0 flex-col p-3 sm:p-4">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/5 sm:h-8 sm:w-8", iconBg)} aria-hidden="true">
          <Icon className={cn("h-4 w-4", iconColor)} />
        </span>
        <p className="mt-1.5 w-full truncate whitespace-nowrap text-[13px] font-medium leading-5 text-muted-foreground sm:text-sm" aria-label={label}>{shortLabel}</p>
        <p className={cn("mt-auto w-full truncate whitespace-nowrap text-lg font-extrabold tabular-nums leading-tight tracking-tight sm:text-xl", valueClassName)}>{value}</p>
      </CardContent>
    </Card>
  );
}
