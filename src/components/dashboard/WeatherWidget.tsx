
"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sun, Cloud, Thermometer, Wind, Droplets, Umbrella, Gauge, Loader2, AlertCircle, MapPin, LocateFixed, CloudRain, CloudSnow, CloudFog, CloudLightning, CalendarDays, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeather, type GetWeatherInput, type WeatherAndForecastOutput, type CurrentWeatherData, type DailyForecastItem } from "@/ai/flows/get-weather-flow";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";


interface WeatherWidgetProps {
  className?: string;
  initialLatitude?: number;
  initialLongitude?: number;
  onLocationChange?: (lat: number, lon: number) => void;
  onWeatherFetched?: (weather: CurrentWeatherData | null) => void;
}

const getWeatherIcon = (weatherDescription: string | undefined, weatherCode?: number, isDay: boolean = true, sizeClass = "h-7 w-7") => {
  if (!weatherDescription && !weatherCode) return <Cloud className={cn(sizeClass, "text-accent")} />;
  const desc = weatherDescription?.toLowerCase();
  
  if (desc?.includes("sun") || desc?.includes("clear")) return <Sun className={cn(sizeClass, "text-yellow-400")} />;
  if (desc?.includes("partly cloudy")) return <Cloud className={cn(sizeClass, "text-blue-300")} />;
  if (desc?.includes("mostly cloudy")) return <Cloud className={cn(sizeClass, "text-blue-400")} />;
  if (desc?.includes("cloudy")) return <Cloud className={cn(sizeClass, "text-gray-400")} />;
  if (desc?.includes("rain") || desc?.includes("drizzle")) return <CloudRain className={cn(sizeClass, "text-blue-500")} />;
  if (desc?.includes("snow") || desc?.includes("flurries")) return <CloudSnow className={cn(sizeClass, "text-blue-200")} />;
  if (desc?.includes("fog")) return <CloudFog className={cn(sizeClass, "text-gray-500")} />;
  if (desc?.includes("thunderstorm")) return <CloudLightning className={cn(sizeClass, "text-yellow-500")} />;
  
  // Fallback to code based matching if description is generic or unknown
  // Based on https://docs.tomorrow.io/reference/data-layers-weather-codes
  switch(weatherCode) {
    case 1000: return <Sun className={cn(sizeClass, "text-yellow-400")} />; // Clear
    case 1100: case 1101: return <Cloud className={cn(sizeClass, "text-blue-300")} />; // Mostly Clear, Partly Cloudy
    case 1102: case 1001: return <Cloud className={cn(sizeClass, "text-gray-400")} />; // Mostly Cloudy, Cloudy
    case 2000: case 2100: return <CloudFog className={cn(sizeClass, "text-gray-500")} />; // Fog, Light Fog
    case 4000: case 4001: case 4200: case 4201: return <CloudRain className={cn(sizeClass, "text-blue-500")} />; // Drizzle, Rain
    case 5000: case 5001: case 5100: case 5101: return <CloudSnow className={cn(sizeClass, "text-blue-200")} />; // Snow, Flurries
    case 8000: return <CloudLightning className={cn(sizeClass, "text-yellow-500")} />; // Thunderstorm
  }
  return <Cloud className={cn(sizeClass, "text-gray-400")} />;
};


export default function WeatherWidget({ 
  className, 
  initialLatitude = 34.0522, 
  initialLongitude = -118.2437,
  onLocationChange,
  onWeatherFetched,
}: WeatherWidgetProps) {
  const { t } = useTranslation();
  const [weatherAndForecast, setWeatherAndForecast] = useState<WeatherAndForecastOutput | null>(null);
  const [currentLatitude, setCurrentLatitude] = useState<number>(initialLatitude);
  const [currentLongitude, setCurrentLongitude] = useState<number>(initialLongitude);
  const [inputLatitude, setInputLatitude] = useState<string>(initialLatitude.toString());
  const [inputLongitude, setInputLongitude] = useState<string>(initialLongitude.toString());
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWeatherForLocation = useCallback((lat: number, lon: number) => {
    setError(null);
    startTransition(async () => {
      try {
        const data: GetWeatherInput = { latitude: lat, longitude: lon };
        const response = await getWeather(data);
        setWeatherAndForecast(response);
        setCurrentLatitude(lat);
        setCurrentLongitude(lon);
        setInputLatitude(lat.toString());
        setInputLongitude(lon.toString());
        onLocationChange?.(lat, lon);
        onWeatherFetched?.(response.current); // Pass only current weather for compatibility
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Failed to fetch weather data.";
        setError(errorMessage);
        toast({
          title: t('errorLoadingWeatherError'),
          description: errorMessage,
          variant: "destructive",
        });
        const fallbackCurrentData: CurrentWeatherData = { 
          temperature: 0, humidity: 0, windSpeed: 0, weatherCode: 0,
          precipitationProbability: 0, uvIndex: 0, pressure: 0, weatherDescription: t('weatherUnavailable'),
        };
        setWeatherAndForecast({ // Set a fallback structure
            current: fallbackCurrentData,
            forecast: Array(5).fill(null).map((_, i) => ({
                date: format(addDays(new Date(), i + 1), 'yyyy-MM-dd'),
                tempMax: 0, tempMin: 0, weatherCode: 0, weatherDescription: "N/A", precipitationProbability: 0,
            }))
        });
        onLocationChange?.(lat, lon);
        onWeatherFetched?.(fallbackCurrentData);
      }
    });
  }, [toast, startTransition, onLocationChange, onWeatherFetched, t]);

  const tryAutoDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: t('geolocationNotSupportedToastTitle'),
        description: t('geolocationNotSupportedToastDescription'),
        variant: "default",
      });
      fetchWeatherForLocation(initialLatitude, initialLongitude);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        toast({
          title: t('locationDetectedToastTitle'),
          description: t('fetchingWeatherForCurrentLocationToast'),
          variant: "default",
        });
        fetchWeatherForLocation(latitude, longitude);
        setIsLocating(false);
      },
      (geoError) => {
        let message = "Could not get current location. ";
        switch(geoError.code) {
          case geoError.PERMISSION_DENIED: message += "Permission denied."; break;
          case geoError.POSITION_UNAVAILABLE: message += "Position unavailable."; break;
          case geoError.TIMEOUT: message += "Request timed out."; break;
          default: message += "An unknown error occurred."; break;
        }
        toast({
          title: t('geolocationErrorToastTitle'),
          description: t('geolocationErrorToastDescription', { message }),
          variant: "destructive",
        });
        fetchWeatherForLocation(initialLatitude, initialLongitude);
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  }, [toast, fetchWeatherForLocation, initialLatitude, initialLongitude, t]);

  useEffect(() => {
    tryAutoDetectLocation();
    const intervalId = setInterval(() => {
      if (currentLatitude && currentLongitude) { // Check if lat/lon are set before refreshing
         fetchWeatherForLocation(currentLatitude, currentLongitude);
      }
    }, 30 * 60 * 1000); 
    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  useEffect(() => {
    // Sync with initial props if they change from parent
    if (initialLatitude !== currentLatitude || initialLongitude !== currentLongitude) {
        setCurrentLatitude(initialLatitude);
        setInputLatitude(initialLatitude.toString());
        setCurrentLongitude(initialLongitude);
        setInputLongitude(initialLongitude.toString());
        // Optionally fetch new data if parent drives location changes post-mount
        // fetchWeatherForLocation(initialLatitude, initialLongitude); 
    }
  }, [initialLatitude, initialLongitude]);


  const handleFetchManualWeather = () => {
    const lat = parseFloat(inputLatitude);
    const lon = parseFloat(inputLongitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast({
        title: t('invalidInputToastTitle'),
        description: t('invalidLatLonToastDescription'),
        variant: "destructive",
      });
      return;
    }
    fetchWeatherForLocation(lat, lon);
  };
  
  const currentWeatherData = weatherAndForecast?.current;
  const forecastData = weatherAndForecast?.forecast;

  const displayIcon = currentWeatherData ? getWeatherIcon(currentWeatherData.weatherDescription, currentWeatherData.weatherCode) : <Loader2 className="h-7 w-7 text-accent animate-spin" />;

  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-card hover:bg-muted/50 transition-colors">
        <CardTitle className="text-lg font-semibold text-card-foreground">{t('weatherWidgetTitle')}</CardTitle>
        {(isPending || isLocating) && !currentWeatherData ? <Loader2 className="h-7 w-7 text-accent animate-spin" /> : displayIcon}
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <div className="mb-4 space-y-2">
          <Button onClick={tryAutoDetectLocation} disabled={isPending || isLocating} className="w-full bg-primary hover:bg-primary/90">
            {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
            {t('useCurrentLocationButton')}
          </Button>
          <div className="flex items-center my-2">
            <hr className="flex-grow border-t border-border" />
            <span className="mx-2 text-xs text-muted-foreground">{t('orSeparator')}</span>
            <hr className="flex-grow border-t border-border" />
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={t('latitudePlaceholder')}
              value={inputLatitude}
              onChange={(e) => setInputLatitude(e.target.value)}
              className="flex-1"
              aria-label={t('latitudePlaceholder')}
              disabled={isPending || isLocating}
            />
            <Input
              type="text"
              placeholder={t('longitudePlaceholder')}
              value={inputLongitude}
              onChange={(e) => setInputLongitude(e.target.value)}
              className="flex-1"
              aria-label={t('longitudePlaceholder')}
              disabled={isPending || isLocating}
            />
          </div>
          <Button onClick={handleFetchManualWeather} disabled={isPending || isLocating} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            {(isPending && !isLocating) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            {t('getWeatherForLocationButton')}
          </Button>
        </div>

        {(isPending || isLocating) && !currentWeatherData ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">{isLocating ? t('gettingLocationLoading') : t('loadingWeatherDataLoading')}</p>
          </div>
        ) : error && !currentWeatherData?.weatherDescription ? (
          <div className="flex flex-col items-center justify-center h-40 text-destructive">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="font-semibold">{t('errorLoadingWeatherError')}</p>
            <p className="text-xs text-center">{error}</p>
          </div>
        ) : currentWeatherData ? (
          <>
            <div className="text-4xl font-bold text-foreground">{currentWeatherData.temperature}°C</div>
            <p className="text-sm text-muted-foreground mt-1">{currentWeatherData.weatherDescription === "Unavailable" ? t('weatherUnavailable') : currentWeatherData.weatherDescription}</p>
            <p className="text-xs text-muted-foreground">Lat: {currentLatitude.toFixed(2)}, Lon: {currentLongitude.toFixed(2)}</p>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="flex items-center text-sm">
                <Droplets className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>{t('humidityLabel')} {currentWeatherData.humidity}%</span>
              </div>
              <div className="flex items-center text-sm">
                <Wind className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>{t('windLabel')} {currentWeatherData.windSpeed} km/h</span>
              </div>
              <div className="flex items-center text-sm">
                <Umbrella className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>{t('precipLabel')} {currentWeatherData.precipitationProbability}%</span>
              </div>
              <div className="flex items-center text-sm">
                <Sun className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>{t('uvIndexLabel')} {currentWeatherData.uvIndex}</span>
              </div>
              <div className="flex items-center text-sm">
                <Gauge className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>{t('pressureLabel')} {currentWeatherData.pressure} hPa</span>
              </div>
            </div>

            {forecastData && forecastData.length > 0 && (
              <div className="mt-8">
                <h3 className="text-md font-semibold mb-3 text-primary flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2"/>
                  {t('fiveDayForecastTitle')}
                </h3>
                <ScrollArea className="w-full whitespace-nowrap rounded-md">
                  <div className="flex w-max space-x-3 pb-3">
                    {forecastData.map((day, index) => (
                      <Card key={index} className="p-3 w-[110px] flex-shrink-0 bg-secondary/30 border rounded-lg shadow-sm text-center">
                        <p className="text-sm font-medium">
                          {format(parseISO(day.date), 'EEE')}
                        </p>
                        <div className="my-1 flex justify-center">
                          {getWeatherIcon(day.weatherDescription, day.weatherCode, true, "h-6 w-6")}
                        </div>
                        <p className="text-xs text-muted-foreground">{day.weatherDescription}</p>
                        <p className="text-sm font-semibold mt-1">
                          {day.tempMax}° <span className="text-muted-foreground">/ {day.tempMin}°</span>
                        </p>
                        <p className="text-xs text-blue-500 mt-0.5">
                          <Droplets className="inline h-3 w-3 mr-0.5"/> {day.precipitationProbability}%
                        </p>
                      </Card>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
          </>
        ) : (
           <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Cloud className="h-8 w-8 mb-2" />
            <p>{t('noWeatherData')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


    