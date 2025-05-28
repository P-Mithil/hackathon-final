
'use client';

import React, { useState, useTransition } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const LoginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').min(1, 'Password is required'),
  displayName: z.string().optional(), // Only for signup
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
    },
  });

  const currentEmail = watch("email"); // For dynamic display name input

  const handleAuthAction = async (data: LoginFormValues, action: 'signIn' | 'signUp') => {
    setAuthError(null);
    startTransition(async () => {
      try {
        if (action === 'signUp') {
          if (!data.displayName || data.displayName.trim().length < 2) {
             setAuthError("Display name must be at least 2 characters for sign up.");
             toast({
                title: "Sign Up Error",
                description: "Display name must be at least 2 characters.",
                variant: "destructive",
              });
             return;
          }
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          await updateProfile(userCredential.user, { displayName: data.displayName });
          toast({
            title: 'Account Created!',
            description: 'You have successfully signed up.',
            variant: 'default',
          });
          router.push('/'); // Redirect to dashboard
        } else {
          await signInWithEmailAndPassword(auth, data.email, data.password);
          toast({
            title: 'Signed In!',
            description: 'Welcome back.',
            variant: 'default',
          });
          router.push('/'); // Redirect to dashboard
        }
      } catch (error: any) {
        let friendlyMessage = 'An unknown error occurred. Please try again.';
        if (error.code) {
          switch (error.code) {
            case 'auth/invalid-email':
              friendlyMessage = 'The email address is not valid.';
              break;
            case 'auth/user-disabled':
              friendlyMessage = 'This user account has been disabled.';
              break;
            case 'auth/user-not-found':
              friendlyMessage = 'No user found with this email. Please sign up or check your email.';
              break;
            case 'auth/wrong-password':
              friendlyMessage = 'Incorrect password. Please try again.';
              break;
            case 'auth/email-already-in-use':
              friendlyMessage = 'This email is already in use. Please sign in or use a different email.';
              break;
            case 'auth/weak-password':
              friendlyMessage = 'The password is too weak. Please use a stronger password (at least 6 characters).';
              break;
            default:
              friendlyMessage = `An error occurred: ${error.message}`;
          }
        }
        setAuthError(friendlyMessage);
        toast({
          title: action === 'signUp' ? 'Sign Up Error' : 'Sign In Error',
          description: friendlyMessage,
          variant: 'destructive',
        });
      }
    });
  };

  const onSignInSubmit: SubmitHandler<LoginFormValues> = (data) => handleAuthAction(data, 'signIn');
  const onSignUpSubmit: SubmitHandler<LoginFormValues> = (data) => handleAuthAction(data, 'signUp');
  
  // Basic heuristic to guess if user might want to sign up vs sign in
  // (e.g., if they type a common email domain, they probably have an account)
  const likelyExistingUser = currentEmail.includes('@gmail.com') || currentEmail.includes('@outlook.com') || currentEmail.includes('@yahoo.com');

  return (
    <form className="space-y-6">
      {authError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register('email')}
          className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
          aria-invalid={errors.email ? "true" : "false"}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
          aria-invalid={errors.password ? "true" : "false"}
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      
      {(!likelyExistingUser || (currentEmail && !errors.email)) && ( // Show display name field if email seems new or is valid
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (for new accounts)</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your Name"
              {...register('displayName')}
              className={errors.displayName ? 'border-destructive focus-visible:ring-destructive' : ''}
              aria-invalid={errors.displayName ? "true" : "false"}
            />
            {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
            <p className="text-xs text-muted-foreground">Only needed if you're creating a new account.</p>
          </div>
        )}


      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          type="button"
          onClick={handleSubmit(onSignInSubmit)}
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
          Sign In
        </Button>
        <Button
          type="button"
          onClick={handleSubmit(onSignUpSubmit)}
          disabled={isPending}
          variant="secondary"
          className="w-full"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Sign Up
        </Button>
      </div>
    </form>
  );
}
