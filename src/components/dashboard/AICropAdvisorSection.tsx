/// <reference lib="dom" />
"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Import SpeechRecognition type (for TypeScript recognition)
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

// Define SpeechRecognition interface if not available
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

import { aiCropAdvisor, type AICropAdvisorInput, type AICropAdvisorOutput } from '@/ai/flows/ai-crop-advisor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, AlertCircle, CheckCircle, Mic, StopCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase'; // Import Supabase client
import { useTranslation } from 'react-i18next';
import { useTranslation as useI18nTranslation } from 'react-i18next';
// Helper function to get language code based on region (moved outside component)
const getLanguageCode = (region: string): string => {
  const lowerRegion = region.toLowerCase();
  if (lowerRegion.includes('india') || lowerRegion.includes('hindi')) return 'hi-IN';
  if (lowerRegion.includes('spain') || lowerRegion.includes('spanish')) return 'es-ES';
  if (lowerRegion.includes('telugu')) return 'te-IN';
  return 'en-US'; // Default to English
};

// Helper function for translations - moved outside component to avoid circular dependency
const getTranslationHelper = (t: any, key: string, fallback: string) => {
  const translation = t(key);
  return translation === key ? fallback : translation;
};

// Fixed schema - removed duplicate soilType field
const AICropAdvisorInputClientSchema = z.object({
  soilType: z.union([
    z.literal(''), // Allow empty string for initial state
    z.literal('Clay'),
    z.literal('Sandy'),
    z.literal('Loam'),
    z.literal('Silt'),
    z.literal('Peat'),
    z.literal('Chalk'),
    z.literal('Shale'),
  ]).refine(val => val !== '', { message: 'Please select a valid soil type' })
    .describe('The type of soil on the farm.'),
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
  const { t, i18n } = useI18nTranslation();
  
  // Moved getTranslation function to use the helper
  const getTranslation = (key: string, fallback: string) => {
    return getTranslationHelper(t, key, fallback);
  };

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AICropAdvisorOutput | null>(null);
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<string>('');

  // State for speech recognition
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);

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

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      const region = form.getValues('region');
      // Set language based on the current i18n resolved language
      recognition.lang = i18n.resolvedLanguage;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        console.log('Speech recognition started');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        form.setValue('cropHistory', transcript, { shouldValidate: true });
        console.log('Recognized text:', transcript);
      };

      recognition.onspeechend = () => {
        setIsListening(false);
        console.log('Speech ended');
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('Speech recognition ended');
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = event.error;
        let errorTitle = t('speechRecognitionErrorTitle') || 'Speech Recognition Error';
        
        // Handle specific error types
        switch (event.error) {
          case 'network':
            errorMessage = 'Network connection failed. Please check your internet connection and try again.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Please check your microphone and try again.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not available. Please try again later.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
      };

      setSpeechRecognition(recognition);

      // Clean up
      return () => {
        if (recognition) {
          recognition.abort();
        }
      };
    } else {
      console.warn('Speech recognition not supported in this browser.');
    }
  }, [form, toast, t]);

  const toggleListening = () => {
    if (speechRecognition) {
      if (isListening) {
        speechRecognition.stop();
      } else {
        // Check if browser supports speech recognition and has network connectivity
        if (!navigator.onLine) {
          toast({
            title: 'Network Error',
            description: 'Please check your internet connection and try again.',
            variant: "destructive",
          });
          return;
        }
        
        try {
          form.setValue('cropHistory', '', { shouldValidate: true }); // Clear before starting
          speechRecognition.start();
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
          toast({
            title: 'Speech Recognition Error',
            description: 'Failed to start speech recognition. Please try again.',
            variant: "destructive",
          });
        }
      }
    }
  };

  const saveCropAdvisorHistory = async (historyData: any) => {
    const { data, error } = await supabase
      .from('crop_advisor_history') // Use the chosen table name
      .insert([historyData]);

    if (error) {
      console.error('Error saving crop advisor history:', JSON.stringify(error, null, 2));
      toast({
        title: 'Save Failed',
        description: 'Could not save AI recommendations and feedback.',
        variant: "destructive",
      });
    } else {
      console.log('Crop advisor history saved successfully:', data);
      toast({
        title: 'Saved',
        description: 'AI recommendations and feedback saved.',
        variant: "default",
      });
    }
  };

  const handleSave = async () => {
    // We need the user ID to associate the history with the logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    const formValues = form.getValues();

    const savedData: any = { // Use \'any\' for now to match Supabase insert type, refine later with proper type
      user_id: user?.id, // Get user ID from Supabase auth
      soiltype: formValues.soilType, // Corrected to lowercase
      region: formValues.region,
      crophistory: formValues.cropHistory,
      weatherdata: formValues.weatherData, // Corrected to lowercase
      marketdata: formValues.marketData, // Corrected to lowercase
      cropsuggestions: result?.cropSuggestions,
      rationale: result?.rationale,
      feedback: feedback,
    };
    await saveCropAdvisorHistory(savedData);
  };


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
          title: getTranslation('aiAdvisorSuccessToastTitle', 'Success'),
          description: getTranslation('aiAdvisorSuccessToastDescription', 'AI recommendations generated successfully'),
          variant: "default",
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(errorMessage);
        toast({
          title: getTranslation('aiAdvisorErrorToastTitle', 'Error'),
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
          <CardTitle className="text-xl font-semibold">{getTranslation('aiCropAdvisorCardTitle', 'AI Crop Advisor')}</CardTitle>
        </div>
        <CardDescription>{getTranslation('aiCropAdvisorCardDescription', 'Get AI-powered crop recommendations based on your farm data')}</CardDescription>
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
                    <FormLabel>{getTranslation('soilTypeLabel', 'Soil Type')}</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={getTranslation('soilTypePlaceholder', 'Select soil type')} />
                        </SelectTrigger>
                        <SelectContent>
                          {['Clay', 'Sandy', 'Loam', 'Silt', 'Peat', 'Chalk', 'Shale'].map((soil) => (
                            <SelectItem key={soil} value={soil}>{soil}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FormLabel>{getTranslation('regionCoordinatesLabel', 'Region/Coordinates')}</FormLabel>
                    <FormControl>
                      <Input placeholder={getTranslation('regionCoordinatesPlaceholder', 'e.g., Central Valley or Lat: 34.05, Lon: -118.24')} {...field} />
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
                  <FormLabel>{getTranslation('cropHistoryLabel', 'Crop History')}</FormLabel>
                  <div className="flex items-center space-x-2">
                    <FormControl className="flex-grow">
                      <Textarea 
                        placeholder={isListening ? getTranslation('listeningPlaceholder', 'Listening...') : getTranslation('cropHistoryPlaceholder', 'Describe the crops grown on your farm in recent years')} 
                        {...field} 
                        rows={3} 
                        disabled={isListening} 
                      />
                    </FormControl>
                    {speechRecognition && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={toggleListening}
                        disabled={isPending}
                        title={isListening ? "Stop recording" : "Start voice input"}
                      >
                        {isListening ? <StopCircle className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weatherData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslation('currentWeatherSummaryLabel', 'Current Weather Summary')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={getTranslation('currentWeatherSummaryPlaceholder', 'Describe current weather conditions, rainfall, temperature')} {...field} rows={3} />
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
                  <FormLabel>{getTranslation('currentMarketDataSummaryLabel', 'Current Market Data Summary')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={getTranslation('currentMarketDataSummaryPlaceholder', 'Describe current market trends, crop prices, demand')} {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {result && (
              <FormField
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslation('feedbackLabel', 'Your Feedback')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={getTranslation('feedbackPlaceholder', 'Provide feedback on the AI recommendations (optional)')} {...field} rows={3} onChange={(e) => setFeedback(e.target.value)} value={feedback} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {getTranslation('getSuggestionsButton', 'Get AI Suggestions')}
            </Button>
            {result && (
              <Button type="button" variant="secondary" onClick={handleSave} className="ml-2">Save</Button>
            )}
          </CardFooter>
        </form>
      </Form>

      {error && (
        <CardContent className="mt-6 border-t pt-6">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive">{getTranslation('aiAdvisorErrorToastTitle', 'Error')}</h3>
          </div>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      )}

      {result && (
        <CardContent className="mt-6 border-t pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">{getTranslation('advisorsRecommendationsTitle', 'AI Recommendations')}</h3>
          </div>
          <ScrollArea className="h-[200px] p-4 border rounded-md bg-secondary/30">
            <h4 className="font-medium text-primary">{getTranslation('suggestedCropsLabel', 'Suggested Crops')}</h4>
            <p className="whitespace-pre-wrap text-sm mb-3">{result.cropSuggestions}</p>
            <h4 className="font-medium text-primary">{getTranslation('rationaleLabel', 'Rationale')}</h4>
            <p className="whitespace-pre-wrap text-sm">{result.rationale}</p>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}