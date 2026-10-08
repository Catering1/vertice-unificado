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

export default function KpiCard({ label, value, icon: Icon, iconBg, iconColor }: KpiCardProps) {
  return (
    <Card className="h-full min-h-32 border-border/70 bg-card shadow-sm">
      <CardContent className="flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="max-w-[21ch] text-xs font-medium leading-snug text-muted-foreground sm:text-sm">{label}</p>
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconBg)} aria-hidden="true"><Icon className={cn("h-4 w-4", iconColor)} /></span>
        </div>
        <p className="mt-5 break-words text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}
