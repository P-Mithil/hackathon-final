"use client";

import React, { useState, useTransition } from 'react';
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

const AICropAdvisorInputSchema = z.object({
  soilType: z.string().min(3, 'Soil type must be at least 3 characters').describe('The type of soil on the farm.'),
  region: z.string().min(3, 'Region must be at least 3 characters').describe('The geographical region of the farm.'),
  cropHistory: z.string().min(10, 'Crop history must be at least 10 characters').describe('The history of crops grown on the farm.'),
  weatherData: z.string().min(10, 'Weather data summary must be at least 10 characters').describe('Real-time weather data for the farm.'),
  marketData: z.string().min(10, 'Market data summary must be at least 10 characters').describe('Real-time market data for crops.'),
});

export default function AICropAdvisorSection() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AICropAdvisorOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<AICropAdvisorInput>({
    resolver: zodResolver(AICropAdvisorInputSchema),
    defaultValues: {
      soilType: '',
      region: '',
      cropHistory: '',
      weatherData: '',
      marketData: '',
    },
  });

  const onSubmit: SubmitHandler<AICropAdvisorInput> = (data) => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const response = await aiCropAdvisor(data);
        setResult(response);
        toast({
          title: "AI Advisor Success",
          description: "Crop suggestions generated successfully.",
          variant: "default",
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(errorMessage);
        toast({
          title: "AI Advisor Error",
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
          <CardTitle className="text-xl font-semibold">AI Crop Advisor</CardTitle>
        </div>
        <CardDescription>Get personalized crop suggestions based on your farm's data.</CardDescription>
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
                    <FormLabel>Soil Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Loamy, Sandy, Clay" {...field} />
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
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Central Valley, Midwest" {...field} />
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
                  <FormLabel>Crop History</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe past crops, yields, and any issues (e.g., Corn (2 years ago) - good yield, Soybeans (last year) - pest problems)" {...field} rows={3} />
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
                  <FormLabel>Current Weather Summary</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Summarize recent/expected weather (e.g., Mild spring, average rainfall, upcoming heatwave)" {...field} rows={3} />
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
                  <FormLabel>Current Market Data Summary</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Summarize relevant market trends (e.g., High demand for organic produce, corn prices stable, soybean prices volatile)" {...field} rows={3} />
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
              Get Suggestions
            </Button>
          </CardFooter>
        </form>
      </Form>

      {result && (
        <CardContent className="mt-6 border-t pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">Advisor's Recommendations</h3>
          </div>
          <ScrollArea className="h-[200px] p-4 border rounded-md bg-secondary/30">
            <h4 className="font-medium text-primary">Suggested Crops:</h4>
            <p className="whitespace-pre-wrap text-sm mb-3">{result.cropSuggestions}</p>
            <h4 className="font-medium text-primary">Rationale:</h4>
            <p className="whitespace-pre-wrap text-sm">{result.rationale}</p>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
