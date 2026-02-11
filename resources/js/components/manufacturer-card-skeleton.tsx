import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export function ManufacturerCardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                </div>
            </CardContent>
            <CardFooter>
                <div className="h-9 w-full animate-pulse rounded bg-muted" />
            </CardFooter>
        </Card>
    );
}
