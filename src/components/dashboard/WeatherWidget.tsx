
"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sun, Cloud, Thermometer, Wind, Droplets, Umbrella, Gauge, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeather, type GetWeatherInput, type GetWeatherOutput } from "@/ai/flows/get-weather-flow";
import { useToast } from "@/hooks/use-toast";

interface WeatherWidgetProps {
  className?: string;
  latitude?: number;
  longitude?: number;
}

// Helper to get a weather icon based on a simplified code or description
const getWeatherIcon = (weatherDescription: string | undefined, weatherCode?: number) => {
  if (!weatherDescription && !weatherCode) return <Cloud className="h-7 w-7 text-accent" />;
  const desc = weatherDescription?.toLowerCase();
  
  // Prioritize specific codes if available from tomorrow.io in the future
  // For now, using description
  if (desc?.includes("sun") || desc?.includes("clear")) return <Sun className="h-7 w-7 text-accent" />;
  if (desc?.includes("cloud")) return <Cloud className="h-7 w-7 text-blue-400" />;
  if (desc?.includes("rain") || desc?.includes("drizzle")) return <Umbrella className="h-7 w-7 text-blue-500" />;
  // Add more mappings as needed
  return <Cloud className="h-7 w-7 text-gray-400" />;
};


export default function WeatherWidget({ className, latitude = 34.0522, longitude = -118.2437 }: WeatherWidgetProps) { // Default to LA
  const [weatherData, setWeatherData] = useState<GetWeatherOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWeather = () => {
      setError(null);
      startTransition(async () => {
        try {
          const data: GetWeatherInput = { latitude, longitude };
          const response = await getWeather(data);
          setWeatherData(response);
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "Failed to fetch weather data.";
          setError(errorMessage);
          toast({
            title: "Weather Error",
            description: errorMessage,
            variant: "destructive",
          });
          // Fallback to some default display or retain old data if preferred
          setWeatherData({ // Basic mock on error
            temperature: 20,
            humidity: 50,
            windSpeed: 5,
            weatherCode: 0,
            precipitationProbability: 0,
            uvIndex: 0,
            pressure: 1010,
            weatherDescription: "Unavailable",
          });
        }
      });
    };

    fetchWeather();
    // Refresh weather every 30 minutes
    const intervalId = setInterval(fetchWeather, 30 * 60 * 1000); 
    return () => clearInterval(intervalId);
  }, [latitude, longitude, toast]);

  const displayIcon = weatherData ? getWeatherIcon(weatherData.weatherDescription, weatherData.weatherCode) : <Loader2 className="h-7 w-7 text-accent animate-spin" />;

  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-card hover:bg-muted/50 transition-colors">
        <CardTitle className="text-lg font-semibold text-card-foreground">Weather Updates</CardTitle>
        {isPending && !weatherData ? <Loader2 className="h-7 w-7 text-accent animate-spin" /> : displayIcon}
      </CardHeader>
      <CardContent className="p-6">
        {isPending && !weatherData ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">Loading weather data...</p>
          </div>
        ) : error && !weatherData ? (
          <div className="flex flex-col items-center justify-center h-40 text-destructive">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="font-semibold">Error loading weather</p>
            <p className="text-xs">{error}</p>
          </div>
        ) : weatherData ? (
          <>
            <div className="text-4xl font-bold text-foreground">{weatherData.temperature}°C</div>
            <p className="text-sm text-muted-foreground mt-1">{weatherData.weatherDescription}</p>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="flex items-center text-sm">
                <Droplets className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>Humidity: {weatherData.humidity}%</span>
              </div>
              <div className="flex items-center text-sm">
                <Wind className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>Wind: {weatherData.windSpeed} km/h</span>
              </div>
              <div className="flex items-center text-sm">
                <Umbrella className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>Precip: {weatherData.precipitationProbability}%</span>
              </div>
              <div className="flex items-center text-sm">
                <Sun className="h-5 w-5 mr-2 text-muted-foreground" /> {/* Using Sun as generic for UV */}
                <span>UV Index: {weatherData.uvIndex}</span>
              </div>
              <div className="flex items-center text-sm">
                <Gauge className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>Pressure: {weatherData.pressure} hPa</span>
              </div>
            </div>
          </>
        ) : (
           <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Cloud className="h-8 w-8 mb-2" />
            <p>No weather data available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

