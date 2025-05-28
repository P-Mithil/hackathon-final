import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sun, Cloud, Thermometer, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeatherWidgetProps {
  className?: string;
}

export default function WeatherWidget({ className }: WeatherWidgetProps) {
  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-card hover:bg-muted/50 transition-colors">
        <CardTitle className="text-lg font-semibold text-card-foreground">Weather Updates</CardTitle>
        <Sun className="h-7 w-7 text-accent" />
      </CardHeader>
      <CardContent className="p-6">
        <div className="text-4xl font-bold text-foreground">28°C</div>
        <p className="text-sm text-muted-foreground mt-1">Sunny with occasional clouds</p>
        <div className="mt-6 space-y-3">
          <div className="flex items-center text-sm">
            <Thermometer className="h-5 w-5 mr-2 text-muted-foreground" />
            <span>Humidity: 60%</span>
          </div>
          <div className="flex items-center text-sm">
            <Wind className="h-5 w-5 mr-2 text-muted-foreground" />
            <span>Wind: 10 km/h E</span>
          </div>
           <div className="flex items-center text-sm">
            <Cloud className="h-5 w-5 mr-2 text-muted-foreground" />
            <span>Pressure: 1012 hPa</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
