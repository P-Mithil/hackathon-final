
"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { aiCropAdvisor, type AICropAdvisorInput, type AICropAdvisorOutput } from '@/ai/flows/ai-crop-advisor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';

const AICropAdvisorInputClientSchema = z.object({
  soilType: z.string().min(3, 'Soil type must be at least 3 characters').describe('The type of soil on the farm.'),
  region: z.string().min(3, 'Region or Coordinates must be at least 3 characters').describe('The geographical region (e.g., "Central Valley") or coordinates (e.g., "Lat: 34.05, Lon: -118.24") of the farm.'),
  cropHistory: z.string().min(10, 'Crop history must be at least 10 characters').describe('The history of crops grown on the farm.'),
  weatherData: z.string().min(10, 'Weather data summary must be at least 10 characters').describe('Summary of current weather conditions for the farm.'),
  marketData: z.string().min(10, 'Market data summary must be at least 10 characters').describe('Summary of current market data/trends for relevant crops.'),
});

type AICropAdvisorFormValues = z.infer<typeof AICropAdvisorInputClientSchema>;

interface AICropAdvisorSectionProps {
  initialRegion?: string;
  initialWeatherSummary?: string;
  initialMarketSummary?: string;
}

export default function AICropAdvisorSection({
  initialRegion,
  initialWeatherSummary,
  initialMarketSummary,
}: AICropAdvisorSectionProps) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null); // This error state is for AI flow errors, not form validation
  const [result, setResult] = useState<AICropAdvisorOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<AICropAdvisorFormValues>({
    resolver: zodResolver(AICropAdvisorInputClientSchema),
    defaultValues: {
      soilType: '',
      region: initialRegion || '',
      cropHistory: '',
      weatherData: initialWeatherSummary || '',
      marketData: initialMarketSummary || '',
    },
  });

  useEffect(() => {
    if (initialRegion) form.setValue('region', initialRegion, { shouldValidate: true });
  }, [initialRegion, form]);

  useEffect(() => {
    if (initialWeatherSummary) form.setValue('weatherData', initialWeatherSummary, { shouldValidate: true });
  }, [initialWeatherSummary, form]);

  useEffect(() => {
    if (initialMarketSummary) form.setValue('marketData', initialMarketSummary, { shouldValidate: true });
  }, [initialMarketSummary, form]);


  const onSubmit: SubmitHandler<AICropAdvisorFormValues> = (data) => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const flowInput: AICropAdvisorInput = {
            soilType: data.soilType,
            region: data.region,
            cropHistory: data.cropHistory,
            weatherData: data.weatherData,
            marketData: data.marketData,
        };
        const response = await aiCropAdvisor(flowInput);
        setResult(response);
        toast({
          title: t('aiAdvisorSuccessToastTitle'),
          description: t('aiAdvisorSuccessToastDescription'),
          variant: "default",
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(errorMessage);
        toast({
          title: t('aiAdvisorErrorToastTitle'),
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card className="shadow-lg rounded-xl overflow-hidden w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Wand2 className="h-7 w-7 text-primary" />
          <CardTitle className="text-xl font-semibold">{t('aiCropAdvisorCardTitle')}</CardTitle>
        </div>
        <CardDescription>{t('aiCropAdvisorCardDescription')}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="soilType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('soilTypeLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('soilTypePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('regionCoordinatesLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('regionCoordinatesPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="cropHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cropHistoryLabel')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('cropHistoryPlaceholder')} {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weatherData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('currentWeatherSummaryLabel')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('currentWeatherSummaryPlaceholder')} {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="marketData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('currentMarketDataSummaryLabel')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('currentMarketDataSummaryPlaceholder')} {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {t('getSuggestionsButton')}
            </Button>
          </CardFooter>
        </form>
      </Form>

      {error && (
        <CardContent className="mt-6 border-t pt-6">
            <AlertCircle className="h-6 w-6 text-destructive mb-2" />
            <h3 className="text-lg font-semibold text-destructive">{t('aiAdvisorErrorToastTitle')}</h3>
            <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      )}

      {result && (
        <CardContent className="mt-6 border-t pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">{t('advisorsRecommendationsTitle')}</h3>
          </div>
          <ScrollArea className="h-[200px] p-4 border rounded-md bg-secondary/30">
            <h4 className="font-medium text-primary">{t('suggestedCropsLabel')}</h4>
            <p className="whitespace-pre-wrap text-sm mb-3">{result.cropSuggestions}</p>
            <h4 className="font-medium text-primary">{t('rationaleLabel')}</h4>
            <p className="whitespace-pre-wrap text-sm">{result.rationale}</p>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
