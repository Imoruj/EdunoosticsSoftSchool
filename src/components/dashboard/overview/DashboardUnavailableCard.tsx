import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

interface DashboardUnavailableCardProps {
    title: string;
    description: string;
}

export function DashboardUnavailableCard({
    title,
    description,
}: DashboardUnavailableCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    The page is still available, but this section could not load right now. Retry when the database connection is stable.
                </div>
            </CardContent>
        </Card>
    );
}
