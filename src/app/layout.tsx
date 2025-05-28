import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
// Remove Firebase AuthProvider import
// import { AuthProvider } from '@/contexts/AuthContext'; 
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext'; // Add Supabase AuthProvider import

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AgriVision Dashboard',
  description: 'Personalized crop advisory and market trends for farmers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        {/* Replace AuthProvider with SupabaseAuthProvider */}
        <SupabaseAuthProvider>
          {children}
        </SupabaseAuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
