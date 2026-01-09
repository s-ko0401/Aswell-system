import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HomePage() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formattedTime = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(time);

    return (
        <div className="flex h-full items-center justify-center p-4">
            <Card className="w-full max-w-xl text-center shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl text-muted-foreground">現在時刻 (日本時間)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold tracking-tight md:text-5xl">
                        {formattedTime}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
