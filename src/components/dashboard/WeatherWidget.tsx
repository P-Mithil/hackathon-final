
"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sun, Cloud, Thermometer, Wind, Droplets, Umbrella, Gauge, Loader2, AlertCircle, MapPin, LocateFixed, CalendarDays, ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeather, type GetWeatherInput, type WeatherAndForecastOutput, type DailyForecastItem, type CurrentWeatherData } from "@/ai/flows/get-weather-flow";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';

interface WeatherWidgetProps {
  className?: string;
  initialLatitude?: number;
  initialLongitude?: number;
  onLocationChange?: (lat: number, lon: number) => void;
  onWeatherFetched?: (currentWeatherSummary: string | null) => void;
}

const getWeatherIcon = (weatherDescription: string | undefined, weatherCode?: number, isLarge: boolean = false) => {
  const iconSize = isLarge ? "h-10 w-10" : "h-6 w-6";
  if (!weatherDescription && !weatherCode) return <Cloud className={`${iconSize} text-accent`} />;
  const desc = weatherDescription?.toLowerCase();
  
  if (desc?.includes("sun") || desc?.includes("clear")) return <Sun className={`${iconSize} text-yellow-400`} />;
  if (desc?.includes("cloud") || desc?.includes("partly cloudy") || desc?.includes("mostly cloudy")) return <Cloud className={`${iconSize} text-blue-400`} />;
  if (desc?.includes("rain") || desc?.includes("drizzle")) return <Umbrella className={`${iconSize} text-blue-500`} />;
  if (desc?.includes("snow") || desc?.includes("flurries")) return <Cloud className={`${iconSize} text-white`} />; // Assuming dark theme for snow
  if (desc?.includes("fog")) return <Cloud className={`${iconSize} text-gray-400`} />;
  if (desc?.includes("thunderstorm")) return <Cloud className={`${iconSize} text-purple-500`} />;
  return <Cloud className={`${iconSize} text-gray-400`} />;
};

const DEFAULT_LATITUDE = 34.0522; // Los Angeles
const DEFAULT_LONGITUDE = -118.2437;

export default function WeatherWidget({ 
  className, 
  initialLatitude = DEFAULT_LATITUDE, 
  initialLongitude = DEFAULT_LONGITUDE,
  onLocationChange,
  onWeatherFetched,
}: WeatherWidgetProps) {
  const { t } = useTranslation();
  const [weatherData, setWeatherData] = useState<WeatherAndForecastOutput | null>(null);
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
        console.log(`Fetching weather for lat: ${lat}, lon: ${lon}`);
        const data: GetWeatherInput = { latitude: lat, longitude: lon };
        const response = await getWeather(data);
        setWeatherData(response);
        setCurrentLatitude(lat);
        setCurrentLongitude(lon);
        setInputLatitude(lat.toString());
        setInputLongitude(lon.toString());
        onLocationChange?.(lat, lon);
        if (response && response.current && response.current.weatherDescription !== "Unavailable") {
          const summary = `${response.current.weatherDescription}, Temp: ${response.current.temperature}°C, Humidity: ${response.current.humidity}%, Wind: ${response.current.windSpeed} km/h, Precip: ${response.current.precipitationProbability}%`;
          onWeatherFetched?.(summary);
        } else {
          onWeatherFetched?.('Weather data currently unavailable for AI Advisor.');
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Failed to fetch weather data.";
        setError(errorMessage);
        toast({
          title: t('errorLoadingWeatherError'),
          description: errorMessage,
          variant: "destructive",
        });
        setWeatherData(null); // Clear data on error
        onLocationChange?.(lat, lon);
        onWeatherFetched?.(null);
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
        fetchWeatherForLocation(initialLatitude, initialLongitude); // Fallback to default
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  }, [toast, fetchWeatherForLocation, initialLatitude, initialLongitude, t]);

  useEffect(() => {
    if (onLocationChange) { // If used in a controlled way (e.g., dashboard page synchronizing locations)
        fetchWeatherForLocation(initialLatitude, initialLongitude);
    } else { // Standalone behavior
        tryAutoDetectLocation();
    }
    // Removed the interval as it was causing issues with onLocationChange prop updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  useEffect(() => {
     if (currentLatitude !== initialLatitude || currentLongitude !== initialLongitude) {
        setCurrentLatitude(initialLatitude);
        setInputLatitude(initialLatitude.toString());
        setCurrentLongitude(initialLongitude);
        setInputLongitude(initialLongitude.toString());
        // Only fetch if the component is supposed to manage its own location or if initial props changed
        if (onLocationChange || (initialLatitude !== DEFAULT_LATITUDE || initialLongitude !== DEFAULT_LONGITUDE)){
            fetchWeatherForLocation(initialLatitude, initialLongitude);
        }
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  
  const currentWeatherData = weatherData?.current;
  const forecastData = weatherData?.forecast;
  const displayIcon = currentWeatherData ? getWeatherIcon(currentWeatherData.weatherDescription, currentWeatherData.weatherCode, true) : <Loader2 className="h-7 w-7 text-accent animate-spin" />;

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
        ) : error && !currentWeatherData ? (
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
                  <CalendarDays className="h-5 w-5 mr-2" />
                  {t('fiveDayForecastTitle')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {forecastData.slice(0, 5).map((day, index) => ( // Displaying up to 5 days
                    <Card key={index} className="p-3 bg-card/70 shadow-sm rounded-lg text-center">
                      <p className="text-sm font-medium text-muted-foreground">
                        {format(parseISO(day.date), 'EEE')} 
                      </p>
                      <div className="my-2 flex justify-center">
                        {getWeatherIcon(day.weatherDescription, day.weatherCode)}
                      </div>
                       <p className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis" title={day.weatherDescription}>
                        {day.weatherDescription}
                      </p>
                      <div className="flex justify-center items-center gap-2 mt-1">
                        <div className="flex items-center text-sm font-semibold text-foreground" title={t('maxTemp')}>
                           <ArrowUpNarrowWide className="h-3 w-3 mr-1 text-red-500"/> {day.tempMax}°
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground" title={t('minTemp')}>
                           <ArrowDownNarrowWide className="h-3 w-3 mr-1 text-blue-500"/> {day.tempMin}°
                        </div>
                      </div>
                      <div className="flex items-center justify-center text-xs text-blue-600 mt-1">
                        <Umbrella className="h-3 w-3 mr-1" /> {day.precipitationProbability}%
                      </div>
                    </Card>
                  ))}
                </div>
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
