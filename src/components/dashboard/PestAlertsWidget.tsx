
"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bug, CheckCircle2, Info, Loader2, LocateFixed, MapPin, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPestAlerts, type GetPestAlertsInput, type GetPestAlertsOutput, type PestAlertItem } from "@/ai/flows/getPestAlertsFlow";
import { useToast } from "@/hooks/use-toast";
import { Badge, type BadgeProps } from "@/components/ui/badge"; // Corrected import for BadgeProps
import { useTranslation } from 'react-i18next';

interface PestAlertsWidgetProps {
  className?: string;
  initialLatitude?: number;
  initialLongitude?: number;
  onLocationChange?: (lat: number, lon: number) => void;
}

const getRiskIcon = (riskLevel: PestAlertItem['riskLevel'] | undefined) => {
  switch (riskLevel) {
    case 'High':
      return <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 text-destructive flex-shrink-0" />;
    case 'Medium':
      return <ShieldAlert className="h-5 w-5 mr-3 mt-0.5 text-yellow-600 flex-shrink-0" />;
    case 'Low':
      return <ShieldCheck className="h-5 w-5 mr-3 mt-0.5 text-primary flex-shrink-0" />;
    case 'Info':
      return <Info className="h-5 w-5 mr-3 mt-0.5 text-blue-500 flex-shrink-0" />;
    default:
      return <ShieldQuestion className="h-5 w-5 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />;
  }
};

const getRiskBadgeVariant = (riskLevel: PestAlertItem['riskLevel'] | undefined): BadgeProps["variant"] => {
  switch (riskLevel) {
    case 'High': return "destructive";
    case 'Medium': return "default"; 
    case 'Low': return "secondary";
    case 'Info': return "outline";
    default: return "outline";
  }
};

const DEFAULT_LATITUDE = 34.0522;
const DEFAULT_LONGITUDE = -118.2437;

export default function PestAlertsWidget({ 
  className,
  initialLatitude = DEFAULT_LATITUDE, 
  initialLongitude = DEFAULT_LONGITUDE,
  onLocationChange,
}: PestAlertsWidgetProps) {
  const { t } = useTranslation();
  const [pestData, setPestData] = useState<GetPestAlertsOutput | null>(null);
  const [currentLatitude, setCurrentLatitude] = useState<number>(initialLatitude);
  const [currentLongitude, setCurrentLongitude] = useState<number>(initialLongitude);
  const [inputLatitude, setInputLatitude] = useState<string>(initialLatitude.toString());
  const [inputLongitude, setInputLongitude] = useState<string>(initialLongitude.toString());
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPestAlertsForLocation = useCallback((lat: number, lon: number) => {
    setError(null);
    startTransition(async () => {
      try {
        const data: GetPestAlertsInput = { latitude: lat, longitude: lon };
        const response = await getPestAlerts(data);
        setPestData(response);
        setCurrentLatitude(lat);
        setCurrentLongitude(lon);
        setInputLatitude(lat.toString());
        setInputLongitude(lon.toString());
        onLocationChange?.(lat, lon);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Failed to fetch pest alerts.";
        setError(errorMessage);
        toast({
          title: t('pestAlertErrorToastTitle'),
          description: errorMessage,
          variant: "destructive",
        });
        setPestData(null); 
        onLocationChange?.(lat, lon);
      }
    });
  }, [toast, startTransition, onLocationChange, t]);

  const tryAutoDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: t('geolocationNotSupportedToastTitle'),
        description: t('geolocationNotSupportedToastDescription'),
        variant: "default",
      });
      fetchPestAlertsForLocation(initialLatitude, initialLongitude);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        toast({
          title: t('locationDetectedToastTitle'),
          description: t('fetchingPestAlertsForLocationToast', { lat: latitude.toFixed(2), lon: longitude.toFixed(2) }),
          variant: "default",
        });
        fetchPestAlertsForLocation(latitude, longitude);
        setIsLocating(false);
      },
      (geoError) => {
        toast({
          title: t('geolocationErrorToastTitle'),
          description: t('geolocationErrorToastDescription', { message: geoError.message }),
          variant: "destructive",
        });
        fetchPestAlertsForLocation(initialLatitude, initialLongitude);
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  }, [toast, fetchPestAlertsForLocation, initialLatitude, initialLongitude, t]);

  useEffect(() => {
    if (onLocationChange) {
        fetchPestAlertsForLocation(initialLatitude, initialLongitude);
    } else {
        tryAutoDetectLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLatitude, initialLongitude]);


  useEffect(() => {
    if (!isLocating && !isPending) {
        if (currentLatitude !== initialLatitude || currentLongitude !== initialLongitude) {
            setCurrentLatitude(initialLatitude);
            setInputLatitude(initialLatitude.toString());
            setCurrentLongitude(initialLongitude);
            setInputLongitude(initialLongitude.toString());
            if (onLocationChange || (!onLocationChange && (initialLatitude !== DEFAULT_LATITUDE || initialLongitude !== DEFAULT_LONGITUDE))) {
               fetchPestAlertsForLocation(initialLatitude, initialLongitude);
            }
        }
    }
  }, [initialLatitude, initialLongitude, isLocating, isPending, currentLatitude, currentLongitude, fetchPestAlertsForLocation, onLocationChange]);


  const handleFetchManualAlerts = () => {
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
    toast({
      title: t('pestAlertsRequestedToastTitle'),
      description: t('fetchingPestAlertsForLocationToast', { lat: lat.toFixed(2), lon: lon.toFixed(2) }),
      variant: "default"
    });
    fetchPestAlertsForLocation(lat, lon);
  };

  const translateRiskLevel = (level: PestAlertItem['riskLevel'] | undefined) => {
    if (!level) return '';
    switch(level) {
      case 'High': return t('riskLevelHigh');
      case 'Medium': return t('riskLevelMedium');
      case 'Low': return t('riskLevelLow');
      case 'Info': return t('riskLevelInfo');
      default: return level;
    }
  };

  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-card-foreground flex items-center">
                <Bug className="h-6 w-6 mr-2 text-destructive" /> {t('pestAlertsWidgetTitle')}
            </CardTitle>
        </div>
        <CardDescription>{t('pestAlertsWidgetDescription')}</CardDescription>
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
          <Button onClick={handleFetchManualAlerts} disabled={isPending || isLocating} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            {(isPending && !isLocating) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            {t('getPestAlertsForLocationButton')}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mb-4">{t('displayingAlertsForPrefix')} Lat: {currentLatitude.toFixed(2)}, Lon: {currentLongitude.toFixed(2)}</p>


        {isPending && !pestData ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">{isLocating ? t('gettingLocationLoading') : t('loadingPestAlertsLoading')}</p>
          </div>
        ) : error && !pestData ? (
          <div className="flex flex-col items-center justify-center h-40 text-destructive">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-semibold">{t('errorLoadingPestAlertsError')}</p>
            <p className="text-xs text-center">{error}</p>
          </div>
        ) : pestData && pestData.alerts.length > 0 ? (
          <div className="space-y-4">
            {pestData.alerts.map((alert, index) => (
              <div key={index} className="flex items-start p-3 rounded-lg bg-card border shadow-sm">
                {getRiskIcon(alert.riskLevel)}
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium">{alert.pestName}</p>
                    <Badge variant={getRiskBadgeVariant(alert.riskLevel)}>{translateRiskLevel(alert.riskLevel)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{alert.description}</p>
                  <p className="text-xs font-semibold text-primary">{t('pestRecommendationPrefix')}</p>
                  <p className="text-xs text-muted-foreground">{alert.recommendation}</p>
                </div>
              </div>
            ))}
            {pestData.generalAdvice && (
                 <div className="mt-4 p-3 bg-secondary/30 rounded-lg border">
                    <h4 className="font-semibold text-sm text-secondary-foreground mb-1 flex items-center">
                        <Info className="h-4 w-4 mr-2 text-primary"/>
                        {t('generalPestPreventionAdviceTitle')}
                    </h4>
                    <p className="text-xs text-muted-foreground">{pestData.generalAdvice}</p>
                 </div>
            )}
          </div>
        ) : pestData && pestData.alerts.length === 0 ? (
            <div className="text-center py-6">
                 <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
                <p className="font-medium text-lg">{t('noSpecificPestAlertsTitle')}</p>
                <p className="text-sm text-muted-foreground mb-3">
                    {t('noSpecificPestAlertsDescription')}
                </p>
                {pestData.generalAdvice && (
                     <div className="mt-4 p-3 bg-secondary/30 rounded-lg border text-left">
                        <h4 className="font-semibold text-sm text-secondary-foreground mb-1 flex items-center">
                            <Info className="h-4 w-4 mr-2 text-primary"/>
                            {t('generalPestPreventionAdviceTitle')}
                        </h4>
                        <p className="text-xs text-muted-foreground">{pestData.generalAdvice}</p>
                     </div>
                )}
            </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Bug className="h-8 w-8 mb-2" />
            <p>{t('noPestAlertData')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
