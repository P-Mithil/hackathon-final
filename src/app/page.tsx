
"use client";
import React, { useState, useCallback, useEffect } from 'react';
import Header from '@/components/dashboard/Header';
import WeatherWidget from '@/components/dashboard/WeatherWidget';
import PestAlertsWidget from '@/components/dashboard/PestAlertsWidget';
import AICropAdvisorSection from '@/components/dashboard/AICropAdvisorSection';
import MarketTrendsWidget from '@/components/dashboard/MarketTrendsWidget';
import { Separator } from '@/components/ui/separator';
import type { GetWeatherOutput } from '@/ai/flows/get-weather-flow';
import type { GetMarketTrendsOutput } from '@/ai/flows/getMarketTrendsFlow';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DEFAULT_LATITUDE = 34.0522; // Los Angeles
const DEFAULT_LONGITUDE = -118.2437;

export default function DashboardPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const { t } = useTranslation();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number }>({
    lat: DEFAULT_LATITUDE,
    lon: DEFAULT_LONGITUDE,
  });
  const [weatherSummaryForAdvisor, setWeatherSummaryForAdvisor] = useState<string>('');
  const [marketSummaryForAdvisor, setMarketSummaryForAdvisor] = useState<string>('');
  const [regionForAdvisor, setRegionForAdvisor] = useState<string>(`Lat: ${DEFAULT_LATITUDE.toFixed(4)}, Lon: ${DEFAULT_LONGITUDE.toFixed(4)}`);
  const currentYear = new Date().getFullYear();

  const handleLocationChange = useCallback((lat: number, lon: number) => {
    setCurrentLocation({ lat, lon });
    setRegionForAdvisor(`Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
  }, []);

  const handleWeatherFetched = useCallback((weather: GetWeatherOutput | null) => {
    if (weather && weather.weatherDescription !== "Unavailable") {
      setWeatherSummaryForAdvisor(
        `${weather.weatherDescription}, Temp: ${weather.temperature}°C, Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed} km/h, Precip: ${weather.precipitationProbability}%`
      );
    } else {
      setWeatherSummaryForAdvisor('Weather data currently unavailable for AI Advisor.');
    }
  }, []);

  const handleMarketDataFetched = useCallback((marketData: GetMarketTrendsOutput | null) => {
    if (marketData && marketData.marketSummary) {
      setMarketSummaryForAdvisor(marketData.marketSummary);
    } else if (marketData && marketData.regionalCrops && marketData.regionalCrops.length > 0) {
        setMarketSummaryForAdvisor('General market summary unavailable, but crop-specific trends were found.');
    }
     else {
      setMarketSummaryForAdvisor('Market data currently unavailable for AI Advisor.');
    }
  }, []);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        
        <section aria-labelledby="environmental-overview">
          <h2 id="environmental-overview" className="text-2xl font-semibold mb-4 text-primary tracking-tight">{t('environmentalOverviewTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WeatherWidget 
              className="md:col-span-1" 
              initialLatitude={currentLocation.lat}
              initialLongitude={currentLocation.lon}
              onLocationChange={handleLocationChange}
              onWeatherFetched={handleWeatherFetched}
            />
            <PestAlertsWidget 
              className="md:col-span-1" 
              initialLatitude={currentLocation.lat}
              initialLongitude={currentLocation.lon}
              onLocationChange={handleLocationChange} 
            />
          </div>
        </section>

        <Separator className="my-8" />

        <section aria-labelledby="decision-support" className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3">
            <h2 id="decision-support-ai" className="text-2xl font-semibold mb-4 text-primary tracking-tight">{t('aiDecisionSupportTitle')}</h2>
            <AICropAdvisorSection 
              initialRegion={regionForAdvisor}
              initialWeatherSummary={weatherSummaryForAdvisor}
              initialMarketSummary={marketSummaryForAdvisor}
            />
          </div>
          <div className="lg:col-span-2">
            <h2 id="decision-support-market" className="text-2xl font-semibold mb-4 text-primary tracking-tight">{t('marketInsightsTitle')}</h2>
            <MarketTrendsWidget 
              initialLatitude={currentLocation.lat}
              initialLongitude={currentLocation.lon}
              onLocationChange={handleLocationChange} 
              onMarketDataFetched={handleMarketDataFetched}
            />
          </div>
        </section>
        
      </main>
      <footer className="text-center p-6 text-muted-foreground text-sm border-t mt-auto">
        {t('footerText', { year: currentYear })}
      </footer>
    </div>
  );
}
