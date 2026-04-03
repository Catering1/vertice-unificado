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
}

export default function KpiCard({ label, value, icon: Icon, iconBg, iconColor, valueClassName }: KpiCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardContent className="flex items-start gap-3 p-3 sm:gap-4 sm:p-5">
        <div className={cn("flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
        </div>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn("mt-0.5 sm:mt-1 text-base sm:text-xl font-bold tracking-tight", valueClassName)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
