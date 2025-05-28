
'use client';

import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { getCropAdvisorHistoryForUser } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface HistoryEntry {
  id: string;
  user_id: string;
  created_at: string;
  soiltype: string; // Ensure these match your table column names
  region: string;
  crophistory: string;
  weatherdata: string;
  marketdata: string;
  cropsuggestions: string;
  rationale: string;
  feedback: string | null;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (user) {
        setLoadingHistory(true);
        setError(null);
        const { data, error: fetchError } = await getCropAdvisorHistoryForUser(user.id);
        if (fetchError) {
          setError(fetchError.message);
          setHistory(null);
        } else {
          setHistory(data as HistoryEntry[] || []);
        }
        setLoadingHistory(false);
      } else if (!authLoading) { // Only set to no history if auth is done loading and there's no user
        setLoadingHistory(false);
        setHistory([]); 
      }
    };

    // Only fetch history if auth is not loading and user exists, or if auth is done loading and no user
    if (!authLoading) {
      fetchHistory();
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>{t('profileNotSignedInTitle', 'Access Denied')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{t('profileNotSignedIn', 'Please sign in to view your profile and history.')}</p>
            <Button asChild>
              <Link href="/auth/login">{t('signInButton', 'Sign In')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* You might want to add your Header component here if it's not part of a global layout for profile */}
      {/* <Header /> */}
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary mb-6">{t('profileTitle', 'User Profile')}</h1>
          <Button variant="outline" asChild>
            <Link href="/">{t('backToDashboardButton', 'Back to Dashboard')}</Link>
          </Button>
        </div>
        
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>{t('profileHistoryTitle', 'Crop Advisor History')}</CardTitle>
            <CardDescription>{t('profileHistoryDescription', 'Review your past AI crop recommendations and inputs.')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory && (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-muted-foreground">{t('loadingHistory', 'Loading history...')}</p>
              </div>
            )}

            {error && (
              <div className="text-destructive bg-destructive/10 p-4 rounded-md">
                <p className="font-semibold">{t('errorLoadingHistoryTitle', 'Error Loading History')}</p>
                <p>{t('errorLoadingHistoryDetails', 'Could not retrieve your history at this time:')} {error}</p>
              </div>
              
            )}

            {!loadingHistory && !error && history && history.length === 0 && (
              <p className="text-center text-muted-foreground py-10">{t('noHistoryFound', 'No crop advisor history found.')}</p>
            )}

            {!loadingHistory && !error && history && history.length > 0 && (
              <ScrollArea className="h-[500px] pr-4 border rounded-lg">
                <div className="space-y-6 p-4">
                  {history.map((entry) => (
                    <Card key={entry.id} className="bg-card/50 shadow-md overflow-hidden">
                      <CardHeader className="bg-muted/30 p-4">
                        <CardTitle className="text-lg text-primary">{t('historyEntryTitle', 'Recommendation from:')} {new Date(entry.created_at).toLocaleString()}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h4 className="font-semibold text-secondary-foreground mb-1">{t('inputData', 'Input Data')}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <p><strong>{t('soilTypeLabel', 'Soil Type')}:</strong> {entry.soiltype}</p>
                            <p><strong>{t('regionCoordinatesLabel', 'Region/Coordinates')}:</strong> {entry.region}</p>
                            <p className="md:col-span-2"><strong>{t('cropHistoryLabel', 'Crop History')}:</strong> {entry.crophistory}</p>
                            <p className="md:col-span-2"><strong>{t('currentWeatherSummaryLabel', 'Weather Summary')}:</strong> {entry.weatherdata}</p>
                            <p className="md:col-span-2"><strong>{t('currentMarketDataSummaryLabel', 'Market Summary')}:</strong> {entry.marketdata}</p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div>
                          <h4 className="font-semibold text-secondary-foreground mb-1">{t('advisorsRecommendationsTitle', 'AI Recommendations')}</h4>
                          <div className="bg-primary/5 p-3 rounded-md">
                            <p className="whitespace-pre-wrap text-sm mb-2"><strong className="text-primary">{t('suggestedCropsLabel', 'Crops')}:</strong> {entry.cropsuggestions}</p>
                            <p className="whitespace-pre-wrap text-sm"><strong className="text-primary">{t('rationaleLabel', 'Rationale')}:</strong> {entry.rationale}</p>
                          </div>
                        </div>

                        {entry.feedback && (
                          <>
                            <Separator className="my-3" />
                            <div>
                              <h4 className="font-semibold text-secondary-foreground mb-1">{t('feedbackLabel', 'Your Feedback')}</h4>
                              <p className="whitespace-pre-wrap text-sm text-muted-foreground italic p-3 bg-secondary/20 rounded-md">{entry.feedback}</p>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="text-center p-6 text-muted-foreground text-sm border-t mt-auto">
        {t('footerText', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
