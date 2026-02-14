import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  changeValue?: string;
  changePositive?: boolean;
}

export default function KpiCard({ label, value, icon: Icon, iconBg, iconColor, changeValue, changePositive }: KpiCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardContent className="flex items-start gap-4 p-5">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
          {changeValue && (
            <div className={cn("mt-1 flex items-center gap-0.5 text-xs font-medium", changePositive ? "text-success" : "text-destructive")}>
              {changePositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              <span>{changeValue} margem</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
