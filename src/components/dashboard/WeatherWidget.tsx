
"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sun, Cloud, Thermometer, Wind, Droplets, Umbrella, Gauge, Loader2, AlertCircle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeather, type GetWeatherInput, type GetWeatherOutput } from "@/ai/flows/get-weather-flow";
import { useToast } from "@/hooks/use-toast";

interface WeatherWidgetProps {
  className?: string;
  initialLatitude?: number;
  initialLongitude?: number;
}

// Helper to get a weather icon based on a simplified code or description
const getWeatherIcon = (weatherDescription: string | undefined, weatherCode?: number) => {
  if (!weatherDescription && !weatherCode) return <Cloud className="h-7 w-7 text-accent" />;
  const desc = weatherDescription?.toLowerCase();
  
  if (desc?.includes("sun") || desc?.includes("clear")) return <Sun className="h-7 w-7 text-yellow-400" />;
  if (desc?.includes("cloud") || desc?.includes("partly cloudy") || desc?.includes("mostly cloudy")) return <Cloud className="h-7 w-7 text-blue-400" />;
  if (desc?.includes("rain") || desc?.includes("drizzle")) return <Umbrella className="h-7 w-7 text-blue-500" />;
  if (desc?.includes("snow") || desc?.includes("flurries")) return <Cloud className="h-7 w-7 text-white" />; // Placeholder for snow
  if (desc?.includes("fog")) return <Cloud className="h-7 w-7 text-gray-400" />; // Placeholder for fog
  if (desc?.includes("thunderstorm")) return <Cloud className="h-7 w-7 text-purple-500" />; // Placeholder for thunderstorm
  return <Cloud className="h-7 w-7 text-gray-400" />;
};


export default function WeatherWidget({ 
  className, 
  initialLatitude = 34.0522, // Default to LA
  initialLongitude = -118.2437 
}: WeatherWidgetProps) {
  const [weatherData, setWeatherData] = useState<GetWeatherOutput | null>(null);
  const [currentLatitude, setCurrentLatitude] = useState<number>(initialLatitude);
  const [currentLongitude, setCurrentLongitude] = useState<number>(initialLongitude);
  const [inputLatitude, setInputLatitude] = useState<string>(initialLatitude.toString());
  const [inputLongitude, setInputLongitude] = useState<string>(initialLongitude.toString());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWeatherForLocation = useCallback((lat: number, lon: number) => {
    setError(null);
    setWeatherData(null); // Clear previous data while loading new
    startTransition(async () => {
      try {
        const data: GetWeatherInput = { latitude: lat, longitude: lon };
        const response = await getWeather(data);
        setWeatherData(response);
        setCurrentLatitude(lat);
        setCurrentLongitude(lon);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Failed to fetch weather data.";
        setError(errorMessage);
        toast({
          title: "Weather Error",
          description: errorMessage,
          variant: "destructive",
        });
        setWeatherData({ // Basic mock on error
          temperature: 0,
          humidity: 0,
          windSpeed: 0,
          weatherCode: 0,
          precipitationProbability: 0,
          uvIndex: 0,
          pressure: 0,
          weatherDescription: "Unavailable",
        });
      }
    });
  }, [toast]);

  useEffect(() => {
    fetchWeatherForLocation(initialLatitude, initialLongitude);
    // Refresh weather every 30 minutes for the current location
    const intervalId = setInterval(() => {
      // Refetch for currentLatitude and currentLongitude, not initial ones
      fetchWeatherForLocation(currentLatitude, currentLongitude);
    }, 30 * 60 * 1000); 
    return () => clearInterval(intervalId);
  }, [initialLatitude, initialLongitude, fetchWeatherForLocation, currentLatitude, currentLongitude]); // Added currentLat/Lon to ensure interval uses updated values if they change by other means (though not currently implemented)

  const handleFetchWeather = () => {
    const lat = parseFloat(inputLatitude);
    const lon = parseFloat(inputLongitude);

    if (isNaN(lat) || isNaN(lon)) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid numbers for latitude and longitude.",
        variant: "destructive",
      });
      return;
    }
    fetchWeatherForLocation(lat, lon);
  };
  
  const displayIcon = weatherData ? getWeatherIcon(weatherData.weatherDescription, weatherData.weatherCode) : <Loader2 className="h-7 w-7 text-accent animate-spin" />;

  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-card hover:bg-muted/50 transition-colors">
        <CardTitle className="text-lg font-semibold text-card-foreground">Weather Updates</CardTitle>
        {isPending && !weatherData ? <Loader2 className="h-7 w-7 text-accent animate-spin" /> : displayIcon}
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Latitude"
              value={inputLatitude}
              onChange={(e) => setInputLatitude(e.target.value)}
              className="flex-1"
              aria-label="Latitude"
            />
            <Input
              type="text"
              placeholder="Longitude"
              value={inputLongitude}
              onChange={(e) => setInputLongitude(e.target.value)}
              className="flex-1"
              aria-label="Longitude"
            />
          </div>
          <Button onClick={handleFetchWeather} disabled={isPending} className="w-full bg-primary hover:bg-primary/90">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            Get Weather for Location
          </Button>
        </div>

        {isPending && !weatherData ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">Loading weather data...</p>
          </div>
        ) : error && !weatherData ? (
          <div className="flex flex-col items-center justify-center h-40 text-destructive">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="font-semibold">Error loading weather</p>
            <p className="text-xs text-center">{error}</p>
          </div>
        ) : weatherData ? (
          <>
            <div className="text-4xl font-bold text-foreground">{weatherData.temperature}°C</div>
            <p className="text-sm text-muted-foreground mt-1">{weatherData.weatherDescription}</p>
            <p className="text-xs text-muted-foreground">Lat: {currentLatitude.toFixed(4)}, Lon: {currentLongitude.toFixed(4)}</p>
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
                <Sun className="h-5 w-5 mr-2 text-muted-foreground" />
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
            <p>No weather data available. Enter coordinates and click "Get Weather".</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

