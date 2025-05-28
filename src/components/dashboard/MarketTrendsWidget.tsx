
"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, MinusSquare, DollarSign, BarChart3, LocateFixed, MapPin, Loader2, Info, Star, Package, SignalHigh, SignalMedium, SignalLow, Zap, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMarketTrends, type GetMarketTrendsInput, type GetMarketTrendsOutput, type MarketCropTrendItem } from "@/ai/flows/getMarketTrendsFlow";
import { useToast } from "@/hooks/use-toast";
import { Badge, type BadgeProps } from "@/components/ui/badge"; // Corrected import for BadgeProps
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTranslation } from 'react-i18next';

import FeedbackSection from "./FeedbackSection";
interface MarketTrendsWidgetProps {
  className?: string;
  initialLatitude?: number;
  initialLongitude?: number;
  onLocationChange?: (lat: number, lon: number) => void;
  onMarketDataFetched?: (marketData: GetMarketTrendsOutput | null) => void;
}

const getTrendIcon = (trend: MarketCropTrendItem['priceTrend'] | undefined) => {
  switch (trend) {
    case 'Rising':
      return <TrendingUp className="h-4 w-4 mr-1 text-green-500" />;
    case 'Stable':
      return <MinusSquare className="h-4 w-4 mr-1 text-yellow-500" />;
    case 'Falling':
      return <TrendingDown className="h-4 w-4 mr-1 text-red-500" />;
    default:
      return <MinusSquare className="h-4 w-4 mr-1 text-muted-foreground" />;
  }
};

const getDemandIcon = (outlook: MarketCropTrendItem['demandOutlook'] | undefined) => {
  switch (outlook) {
    case 'Strong':
      return <SignalHigh className="h-4 w-4 mr-1 text-green-500" />;
    case 'Moderate':
      return <SignalMedium className="h-4 w-4 mr-1 text-yellow-500" />;
    case 'Weak':
      return <SignalLow className="h-4 w-4 mr-1 text-red-500" />;
    default:
      return <MinusSquare className="h-4 w-4 mr-1 text-muted-foreground" />;
  }
};

const getVolatilityIcon = (volatility: MarketCropTrendItem['volatility'] | undefined) => {
  switch (volatility) {
    case 'High':
      return <Zap className="h-4 w-4 mr-1 text-red-500" />;
    case 'Medium':
      return <ShieldAlert className="h-4 w-4 mr-1 text-yellow-500" />;
    case 'Low':
      return <ShieldCheck className="h-4 w-4 mr-1 text-green-500" />;
    default:
      return <ShieldQuestion className="h-4 w-4 mr-1 text-muted-foreground" />;
  }
};

const getDemandOutlookBadgeVariant = (outlook: MarketCropTrendItem['demandOutlook'] | undefined): BadgeProps["variant"] => {
  switch (outlook) {
    case 'Strong': return 'default';
    case 'Moderate': return 'secondary';
    case 'Weak': return 'destructive';
    default: return 'outline';
  }
}

const getVolatilityBadgeVariant = (volatility: MarketCropTrendItem['volatility'] | undefined): BadgeProps["variant"] => {
   switch (volatility) {
    case 'High': return 'destructive';
    case 'Medium': return 'default'; 
    case 'Low': return 'secondary'; 
    default: return 'outline';
  }
}

const generateChartData = (trend: MarketCropTrendItem['priceTrend'] | undefined, t: Function) => {
  const basePoints = [{ x: t('chartPast') }, { x: t('chartPresent') }, { x: t('chartFuture') }];
  switch (trend) {
    case 'Rising':
      return basePoints.map((p, i) => ({ ...p, value: 10 + i * 2 }));
    case 'Falling':
      return basePoints.map((p, i) => ({ ...p, value: 14 - i * 2 }));
    case 'Stable':
      return basePoints.map((p) => ({ ...p, value: 10 }));
    default:
      return basePoints.map((p) => ({ ...p, value: 0 })); // No trend, flat line at 0 or hide chart
  }
};

const chartConfig = {
  value: {
    label: 'Trend', // This label might not be directly visible depending on ChartTooltipContent settings
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;


export default function MarketTrendsWidget({ 
  className,
  initialLatitude = 34.0522, 
  initialLongitude = -118.2437,
  onLocationChange,
  onMarketDataFetched,
}: MarketTrendsWidgetProps) {
  const { t } = useTranslation();
  const [marketData, setMarketData] = useState<GetMarketTrendsOutput | null>(null);
  const [currentLatitude, setCurrentLatitude] = useState<number>(initialLatitude);
  const [currentLongitude, setCurrentLongitude] = useState<number>(initialLongitude);
  const [inputLatitude, setInputLatitude] = useState<string>(initialLatitude.toString());
  const [inputLongitude, setInputLongitude] = useState<string>(initialLongitude.toString());
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMarketDataForLocation = useCallback((lat: number, lon: number) => {
    setError(null);
    startTransition(async () => {
      try {
        const data: GetMarketTrendsInput = { latitude: lat, longitude: lon };
        const response = await getMarketTrends(data);
        setMarketData(response);
        setCurrentLatitude(lat);
        setCurrentLongitude(lon);
        setInputLatitude(lat.toString());
        setInputLongitude(lon.toString());
        onLocationChange?.(lat, lon);
        onMarketDataFetched?.(response);
        toast({
          title: t('marketTrendsUpdatedToastTitle'),
          description: t('fetchedMarketInsightsForLocationToast', { lat: lat.toFixed(2), lon: lon.toFixed(2) }),
          variant: "default"
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Failed to fetch market trends.";
        setError(errorMessage);
        toast({
          title: t('marketTrendsErrorToastTitle'),
          description: errorMessage,
          variant: "destructive",
        });
        setMarketData(null);
        onLocationChange?.(lat, lon);
        onMarketDataFetched?.(null);
      }
    });
  }, [toast, startTransition, onLocationChange, onMarketDataFetched, t]);

  const tryAutoDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: t('geolocationNotSupportedToastTitle'),
        description: t('geolocationNotSupportedToastDescription'),
        variant: "default",
      });
      fetchMarketDataForLocation(initialLatitude, initialLongitude);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        toast({
          title: t('locationDetectedToastTitle'),
          description: t('fetchedMarketInsightsForLocationToast', { lat: latitude.toFixed(2), lon: longitude.toFixed(2) }),
          variant: "default",
        });
        fetchMarketDataForLocation(latitude, longitude);
        setIsLocating(false);
      },
      (geoError) => {
        toast({
          title: t('geolocationErrorToastTitle'),
          description: t('geolocationErrorToastDescription', { message: geoError.message }),
          variant: "destructive",
        });
        fetchMarketDataForLocation(initialLatitude, initialLongitude);
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  }, [toast, fetchMarketDataForLocation, initialLatitude, initialLongitude, t]);

  useEffect(() => {
    tryAutoDetectLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentLatitude(initialLatitude);
    setInputLatitude(initialLatitude.toString());
    setCurrentLongitude(initialLongitude);
    setInputLongitude(initialLongitude.toString());
  }, [initialLatitude, initialLongitude]);

  const handleFetchManualTrends = () => {
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
    fetchMarketDataForLocation(lat, lon);
  };

  const translatePriceTrend = (trend: MarketCropTrendItem['priceTrend'] | undefined) => {
    if (!trend) return '';
    switch(trend) {
      case 'Rising': return t('priceTrendRising');
      case 'Stable': return t('priceTrendStable');
      case 'Falling': return t('priceTrendFalling');
      default: return trend;
    }
  };

  const translateDemandOutlook = (outlook: MarketCropTrendItem['demandOutlook'] | undefined) => {
    if (!outlook) return '';
    switch(outlook) {
      case 'Strong': return t('demandOutlookStrong');
      case 'Moderate': return t('demandOutlookModerate');
      case 'Weak': return t('demandOutlookWeak');
      default: return outlook;
    }
  };

  const translateVolatility = (volatility: MarketCropTrendItem['volatility'] | undefined) => {
    if (!volatility) return '';
    switch(volatility) {
      case 'High': return t('volatilityHigh');
      case 'Medium': return t('volatilityMedium');
      case 'Low': return t('volatilityLow');
      default: return volatility;
    }
  };

  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          <CardTitle className="text-xl font-semibold">{t('marketTrendsWidgetTitle')}</CardTitle>
        </div>
        <CardDescription>{t('marketTrendsWidgetDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 flex-grow space-y-6">
        <div className="space-y-2">
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
          <Button onClick={handleFetchManualTrends} disabled={isPending || isLocating} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            {(isPending && !isLocating) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            {t('getMarketTrendsForLocationButton')}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">{t('locationPrefix')} Lat: {currentLatitude.toFixed(2)}, Lon: {currentLongitude.toFixed(2)}</p>

        {isPending && !marketData ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">{isLocating ? t('gettingLocationLoading') : t('loadingMarketInsightsLoading')}</p>
          </div>
        ) : error && !marketData ? (
          <div className="flex flex-col items-center justify-center h-40 text-destructive">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-semibold">{t('errorLoadingMarketTrendsError')}</p>
            <p className="text-xs text-center">{error}</p>
          </div>
        ) : marketData ? (
          <>
            {marketData.recommendedCrop && marketData.recommendationRationale && (
              <Card className="mb-6 p-4 bg-primary/10 border-primary/30 rounded-lg shadow-md">
                <CardHeader className="p-0 pb-2">
                   <CardTitle className="text-lg flex items-center text-primary">
                     <Star className="h-5 w-5 mr-2 text-accent fill-accent" />
                     {t('topRecommendationPrefix')} {marketData.recommendedCrop}
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-sm text-foreground">{marketData.recommendationRationale}</p>
                </CardContent>
              </Card>
            )}

            {marketData.regionalCrops.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-primary mb-2">{t('detailedCropInsightsTitle')}</h3>
                {marketData.regionalCrops.map((crop, index) => {
                  const trendChartData = generateChartData(crop.priceTrend, t);
                  return (
                    <Card key={index} className="p-4 bg-card border rounded-lg shadow-sm">
                      <CardHeader className="p-0 pb-2 flex flex-row justify-between items-start">
                         <CardTitle className="text-lg flex items-center">
                           <Package className="h-5 w-5 mr-2 text-primary"/>
                           {crop.cropName}
                         </CardTitle>
                         <Badge variant={crop.priceTrend === 'Rising' ? 'default' : crop.priceTrend === 'Falling' ? 'destructive' : 'secondary'} className="ml-1 shrink-0">
                           {getTrendIcon(crop.priceTrend)}
                           {translatePriceTrend(crop.priceTrend)}
                         </Badge>
                      </CardHeader>
                      <CardContent className="p-0 space-y-2 text-sm">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" /> 
                          {t('priceLabel')} <span className="font-semibold ml-1">{crop.estimatedPrice}</span>
                        </div>
                        
                        {trendChartData.some(d => d.value !== 0) && ( 
                          <div className="my-2 h-[50px]">
                            <ChartContainer config={chartConfig} className="w-full h-full aspect-auto">
                              <LineChart
                                accessibilityLayer
                                data={trendChartData}
                                margin={{ top: 5, right: 5, left: -30, bottom: 0 }}
                              >
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted-foreground/30" />
                                <XAxis
                                  dataKey="x"
                                  tickLine={false}
                                  axisLine={false}
                                  tickMargin={8}
                                  tickFormatter={(value) => value.slice(0,3)} // Keep this short for small charts
                                  className="text-xs fill-muted-foreground"
                                />
                                <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                                <ChartTooltip
                                  cursor={false}
                                  content={<ChartTooltipContent hideLabel indicator="line" />}
                                />
                                <Line
                                  dataKey="value"
                                  type="monotone"
                                  stroke="var(--color-value)"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ChartContainer>
                          </div>
                        )}

                        <div className="flex items-center">
                           {getDemandIcon(crop.demandOutlook)}
                           {t('demandLabel')} <Badge variant={getDemandOutlookBadgeVariant(crop.demandOutlook)} className="ml-1">{translateDemandOutlook(crop.demandOutlook)}</Badge>
                        </div>
                        <div className="flex items-center">
                           {getVolatilityIcon(crop.volatility)}
                           {t('volatilityLabel')} <Badge variant={getVolatilityBadgeVariant(crop.volatility)} className="ml-1">{translateVolatility(crop.volatility)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground pt-1"><span className="font-medium text-foreground">{t('rationaleLabel')}</span> {crop.rationale}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
               !marketData.recommendedCrop && ( 
                <div className="text-center py-6">
                    <Info className="h-12 w-12 text-primary mx-auto mb-3" />
                    <p className="font-medium text-lg">{t('noSpecificCropTrendsAvailableTitle')}</p>
                    <p className="text-sm text-muted-foreground">
                        {t('noSpecificCropTrendsAvailableDescription')}
                    </p>
                </div>
               )
            )}
            
            {marketData.marketSummary && (
                 <Card className="mt-6 p-4 bg-secondary/30 rounded-lg border">
                    <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-md font-semibold text-secondary-foreground flex items-center">
                            <Info className="h-5 w-5 mr-2 text-primary"/>
                            {t('regionalMarketSummaryTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <p className="text-sm text-muted-foreground">{marketData.marketSummary}</p>
                    </CardContent>
                 </Card>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mb-2" />
            <p>{t('noMarketTrendData')}</p>
          </div>
        )}
        <FeedbackSection />
      </CardContent>
       <CardFooter className="p-4 border-t">
         <p className="text-xs text-muted-foreground">{t('marketTrendsFooterDisclaimer')}</p>
       </CardFooter>
    </Card>
  );
}
