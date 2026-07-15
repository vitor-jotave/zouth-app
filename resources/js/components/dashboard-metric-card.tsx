import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DashboardMetricCardProps = {
    title: string;
    value: string | number;
    description: string;
    icon: LucideIcon;
};

export function DashboardMetricCard({
    title,
    value,
    description,
    icon: Icon,
}: DashboardMetricCardProps) {
    return (
        <Card className="gap-4 rounded-lg py-5 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-3 px-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4" aria-hidden="true" />
                </span>
            </CardHeader>
            <CardContent className="px-5">
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}
