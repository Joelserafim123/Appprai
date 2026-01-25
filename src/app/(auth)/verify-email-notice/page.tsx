'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { signOut, sendEmailVerification } from 'firebase/auth';
import { Loader2, MailCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from '@/i18n';

export default function VerifyEmailNoticePage() {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const t = useTranslations('VerifyEmailNoticePage');

  const handleResendVerification = async () => {
    if (auth.currentUser) {
      setIsSending(true);
      try {
        await sendEmailVerification(auth.currentUser);
        toast({
          title: t('resendSuccessTitle'),
          description: t('resendSuccessDescription'),
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: t('resendErrorTitle'),
          description: t('resendErrorDescription'),
        });
      } finally {
        setIsSending(false);
      }
    } else {
         toast({
          variant: 'destructive',
          title: t('notAuthenticatedTitle'),
          description: t('notAuthenticatedDescription'),
        });
        router.push('/login');
    }
  };

  const handleLogout = async () => {
      await signOut(auth);
      router.push('/login');
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <MailCheck className="mx-auto h-12 w-12 text-primary" />
        <CardTitle className="mt-4 text-2xl">{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
         <p className="px-8 text-center text-sm text-muted-foreground">
           {t('afterVerification', {
             loginLink: <Link href="/login" className="underline text-primary font-medium">{t('loginLink')}</Link>
           })}
        </p>
        <Button onClick={handleResendVerification} disabled={isSending} variant="outline">
          {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('resendButton')}
        </Button>
         <Button onClick={handleLogout} variant="link">
          {t('logoutButton')}
        </Button>
      </CardContent>
    </Card>
  );
}
