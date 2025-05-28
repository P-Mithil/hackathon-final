import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertTriangle, Bug, CheckCircle2 } from "lucide-react"; // BugAnt is a better fit if available, else Bug. Bug is fine.
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PestAlertsWidgetProps {
    className?: string;
}

export default function PestAlertsWidget({ className }: PestAlertsWidgetProps) {
  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-card hover:bg-muted/50 transition-colors">
        <CardTitle className="text-lg font-semibold text-card-foreground">Pest Alerts</CardTitle>
        <Bug className="h-7 w-7 text-destructive" />
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start p-3 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive-foreground_disabled">Aphid Outbreak Detected</p> {/* Assuming destructive has enough contrast, or use specific text color */}
              <p className="text-xs text-muted-foreground">Region: North Valley - Reported 2 hours ago. Action recommended.</p>
            </div>
          </div>
          <div className="flex items-start p-3 bg-accent/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 text-accent-foreground flex-shrink-0" />
            <div>
              <p className="font-medium text-accent-foreground">Locust Swarm Warning</p>
              <p className="text-xs text-muted-foreground">Region: East Plains - Monitor conditions closely.</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-secondary rounded-lg">
             <CheckCircle2 className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
             <div>
                <p className="font-medium text-secondary-foreground">No critical threats in your immediate area.</p>
                <p className="text-xs text-muted-foreground">Last checked: Just now</p>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
