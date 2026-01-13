
'use client';

import { useFirebase, useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MailWarning, Send, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

export default function VerifyEmailPage() {
  const { user, isUserLoading, refresh } = useUser();
  const { firebaseApp } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user?.emailVerified) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleResendVerification = async () => {
    if (!user || !firebaseApp) return;
    const auth = getAuth(firebaseApp);
    if (!auth.currentUser) return;

    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast({
        title: 'Verification email resent!',
        description: 'Please check your inbox.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error resending email',
        description: 'Please try again in a few minutes.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleAlreadyVerified = () => {
    refresh(); // This will re-fetch user data and trigger the useEffect above
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // User is not logged in, they shouldn't be here.
    router.push('/login');
    return null;
  }

  if (user.emailVerified) {
    // This will be briefly visible while the redirect happens via useEffect
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <MailWarning className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="mt-4 text-2xl">Verify Your Email Address</CardTitle>
          <CardDescription>
            Your account has not been activated yet. We've sent a verification link to{' '}
            <span className="font-bold text-foreground">{user.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Please click the link in your email to continue. After verifying, click the button below to proceed.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleAlreadyVerified} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                I've verified, continue
            </Button>
            <Button onClick={handleResendVerification} className="w-full" variant="outline" disabled={isSending}>
                {isSending ? (
                <Loader2 className="animate-spin" />
                ) : (
                <>
                    <Send className="mr-2 h-4 w-4" />
                    Resend Email
                </>
                )}
            </Button>
          </div>
           <Button variant="link" onClick={() => router.push('/login')} className="mt-4">
             Back to Login
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}
