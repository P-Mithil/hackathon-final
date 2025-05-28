import Header from '@/components/dashboard/Header';
import WeatherWidget from '@/components/dashboard/WeatherWidget';
import PestAlertsWidget from '@/components/dashboard/PestAlertsWidget';
import AICropAdvisorSection from '@/components/dashboard/AICropAdvisorSection';
import MarketTrendsWidget from '@/components/dashboard/MarketTrendsWidget';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        
        <section aria-labelledby="environmental-overview">
          <h2 id="environmental-overview" className="text-2xl font-semibold mb-4 text-primary tracking-tight">Environmental Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WeatherWidget className="md:col-span-1" />
            <PestAlertsWidget className="md:col-span-1" />
          </div>
        </section>

        <Separator className="my-8" />

        <section aria-labelledby="decision-support" className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3">
            <h2 id="decision-support-ai" className="text-2xl font-semibold mb-4 text-primary tracking-tight">AI Decision Support</h2>
            <AICropAdvisorSection />
          </div>
          <div className="lg:col-span-2">
            <h2 id="decision-support-market" className="text-2xl font-semibold mb-4 text-primary tracking-tight">Market Insights</h2>
            <MarketTrendsWidget />
          </div>
        </section>
        
      </main>
      <footer className="text-center p-6 text-muted-foreground text-sm border-t mt-auto">
        AgriVision Dashboard &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
