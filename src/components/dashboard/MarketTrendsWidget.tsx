
"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, MinusSquare, DollarSign, BarChart3, LocateFixed, MapPin, Loader2, Info, Star, Package, SignalHigh, SignalMedium, SignalLow, Zap, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMarketTrends, type GetMarketTrendsInput, type GetMarketTrendsOutput, type MarketCropTrendItem } from "@/ai/flows/getMarketTrendsFlow";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface MarketTrendsWidgetProps {
  className?: string;
  initialLatitude?: number;
  initialLongitude?: number;
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

const getDemandOutlookBadgeVariant = (outlook: MarketCropTrendItem['demandOutlook'] | undefined) => {
  switch (outlook) {
    case 'Strong': return 'default'; // often primary color, can be styled to be green
    case 'Moderate': return 'secondary'; // can be styled to be yellow
    case 'Weak': return 'destructive'; // can be styled to be red
    default: return 'outline';
  }
}

const getVolatilityBadgeVariant = (volatility: MarketCropTrendItem['volatility'] | undefined) => {
   switch (volatility) {
    case 'High': return 'destructive';
    case 'Medium': return 'default'; // using 'default' for medium, typically primary color
    case 'Low': return 'secondary'; // using 'secondary' for low, often a lighter/muted color
    default: return 'outline';
  }
}

export default function MarketTrendsWidget({ 
  className,
  initialLatitude = 34.0522, // Default to LA
  initialLongitude = -118.2437 
}: MarketTrendsWidgetProps) {
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
        toast({
          title: "Market Trends Updated",
          description: `Fetched insights for Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`,
          variant: "default"
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Failed to fetch market trends.";
        setError(errorMessage);
        toast({
          title: "Market Trends Error",
          description: errorMessage,
          variant: "destructive",
        });
        setMarketData(null);
      }
    });
  }, [toast]);

  const tryAutoDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Browser doesn't support geolocation. Enter location manually.",
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
          title: "Location Detected",
          description: `Fetching market trends for your current location.`,
          variant: "default",
        });
        fetchMarketDataForLocation(latitude, longitude);
        setIsLocating(false);
      },
      (geoError) => {
        toast({
          title: "Geolocation Error",
          description: `Could not get current location: ${geoError.message}. Using default.`,
          variant: "destructive",
        });
        fetchMarketDataForLocation(initialLatitude, initialLongitude);
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  }, [toast, fetchMarketDataForLocation, initialLatitude, initialLongitude]);

  useEffect(() => {
    tryAutoDetectLocation();
  }, [tryAutoDetectLocation]);

  const handleFetchManualTrends = () => {
    const lat = parseFloat(inputLatitude);
    const lon = parseFloat(inputLongitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid numbers for latitude (-90 to 90) and longitude (-180 to 180).",
        variant: "destructive",
      });
      return;
    }
    fetchMarketDataForLocation(lat, lon);
  };

  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          <CardTitle className="text-xl font-semibold">Market Trends & Recommendation</CardTitle>
        </div>
        <CardDescription>AI-generated market insights and top crop recommendation for the selected region.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 flex-grow space-y-6">
        <div className="space-y-2">
           <Button onClick={tryAutoDetectLocation} disabled={isPending || isLocating} className="w-full bg-primary hover:bg-primary/90">
            {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
            Use My Current Location
          </Button>
          <div className="flex items-center my-2">
            <hr className="flex-grow border-t border-border" />
            <span className="mx-2 text-xs text-muted-foreground">OR</span>
            <hr className="flex-grow border-t border-border" />
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Latitude"
              value={inputLatitude}
              onChange={(e) => setInputLatitude(e.target.value)}
              className="flex-1"
              aria-label="Latitude"
              disabled={isPending || isLocating}
            />
            <Input
              type="text"
              placeholder="Longitude"
              value={inputLongitude}
              onChange={(e) => setInputLongitude(e.target.value)}
              className="flex-1"
              aria-label="Longitude"
              disabled={isPending || isLocating}
            />
          </div>
          <Button onClick={handleFetchManualTrends} disabled={isPending || isLocating} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            {(isPending && !isLocating) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            Get Market Trends for Entered Location
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">Location: Lat: {currentLatitude.toFixed(2)}, Lon: {currentLongitude.toFixed(2)}</p>

        {isPending && !marketData ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">{isLocating ? "Getting your location..." : "Loading market insights..."}</p>
          </div>
        ) : error && !marketData ? (
          <div className="flex flex-col items-center justify-center h-40 text-destructive">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-semibold">Error loading market trends</p>
            <p className="text-xs text-center">{error}</p>
          </div>
        ) : marketData ? (
          <>
            {marketData.recommendedCrop && marketData.recommendationRationale && (
              <Card className="mb-6 p-4 bg-primary/10 border-primary/30 rounded-lg shadow-md">
                <CardHeader className="p-0 pb-2">
                   <CardTitle className="text-lg flex items-center text-primary">
                     <Star className="h-5 w-5 mr-2 text-accent fill-accent" />
                     Top Recommendation: {marketData.recommendedCrop}
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-sm text-foreground">{marketData.recommendationRationale}</p>
                </CardContent>
              </Card>
            )}

            {marketData.regionalCrops.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-primary mb-2">Detailed Crop Insights:</h3>
                {marketData.regionalCrops.map((crop, index) => (
                  <Card key={index} className="p-4 bg-card border rounded-lg shadow-sm">
                    <CardHeader className="p-0 pb-2">
                       <CardTitle className="text-lg flex items-center">
                         <Package className="h-5 w-5 mr-2 text-primary"/>
                         {crop.cropName}
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-2 text-sm">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" /> 
                        Price: <span className="font-semibold ml-1">{crop.estimatedPrice}</span>
                      </div>
                      <div className="flex items-center">
                        {getTrendIcon(crop.priceTrend)}
                        Trend: <Badge variant={crop.priceTrend === 'Rising' ? 'default' : crop.priceTrend === 'Falling' ? 'destructive' : 'secondary'} className="ml-1">{crop.priceTrend}</Badge>
                      </div>
                      <div className="flex items-center">
                         {getDemandIcon(crop.demandOutlook)}
                         Demand: <Badge variant={getDemandOutlookBadgeVariant(crop.demandOutlook)} className="ml-1">{crop.demandOutlook}</Badge>
                      </div>
                      <div className="flex items-center">
                         {getVolatilityIcon(crop.volatility)}
                         Volatility: <Badge variant={getVolatilityBadgeVariant(crop.volatility)} className="ml-1">{crop.volatility}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1"><span className="font-medium text-foreground">Rationale:</span> {crop.rationale}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
               !marketData.recommendedCrop && ( // Show this only if no crops and no recommendation either
                <div className="text-center py-6">
                    <Info className="h-12 w-12 text-primary mx-auto mb-3" />
                    <p className="font-medium text-lg">No Specific Crop Trends Available</p>
                    <p className="text-sm text-muted-foreground">
                        The AI could not identify specific crop trends for this location.
                    </p>
                </div>
               )
            )}
            
            {marketData.marketSummary && (
                 <Card className="mt-6 p-4 bg-secondary/30 rounded-lg border">
                    <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-md font-semibold text-secondary-foreground flex items-center">
                            <Info className="h-5 w-5 mr-2 text-primary"/>
                            Regional Market Summary
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
            <p>No market trend data available. Try fetching for your location.</p>
          </div>
        )}
      </CardContent>
       <CardFooter className="p-4 border-t">
         <p className="text-xs text-muted-foreground">Market insights and recommendations are AI-generated and for informational purposes only. Not financial advice.</p>
       </CardFooter>
    </Card>
  );
}

