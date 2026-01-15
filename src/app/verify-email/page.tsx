
'use client';

import { useFirebase, useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { getAuth, sendEmailVerification, User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MailWarning, Send, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';

export default function VerifyEmailPage() {
  const { user, isUserLoading, refresh } = useUser();
  const { firebaseApp } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  // This effect will automatically redirect the user if their email becomes verified.
  useEffect(() => {
    if (!isUserLoading && user?.emailVerified) {
      toast({
        title: "E-mail verificado!",
        description: "A sua conta foi ativada com sucesso.",
      });
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, toast]);

  // This effect periodically reloads the user data to check for verification status change.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (user) {
        // user.reload() is a client-side only method to get the latest user data from Firebase Auth
        await user.reload(); 
        const auth = getAuth(firebaseApp);
        // After reload, onAuthStateChanged in the provider will trigger with the fresh user state.
        // We can also force a refresh of our user context if needed.
        if (auth.currentUser?.emailVerified) {
            refresh();
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [user, firebaseApp, refresh]);

  const handleResendVerification = async () => {
    const auth = getAuth(firebaseApp);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsSending(true);
    try {
      await sendEmailVerification(currentUser);
      toast({
        title: 'E-mail de verificação reenviado!',
        description: 'Por favor, verifique sua caixa de entrada.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reenviar e-mail',
        description: 'Aguarde alguns minutos antes de tentar novamente.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleManualCheck = () => {
    // The refresh function from useUser will reload user data from Firestore
    // and re-check the auth state.
    refresh();
  };

  if (isUserLoading || user?.emailVerified) {
    // Show a loading spinner while the initial user state is loading or while redirecting.
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    // If there is no user and we are not loading, redirect to login.
    router.push('/login');
    return null; // Return null to prevent rendering anything on this path
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <MailWarning className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="mt-4 text-2xl">Verifique seu Endereço de E-mail</CardTitle>
          <CardDescription>
            Sua conta ainda não foi ativada. Enviamos um link de verificação para{' '}
            <span className="font-bold text-foreground">{user.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Clique no link no seu e-mail para continuar. A página será atualizada automaticamente assim que a verificação for concluída.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleManualCheck} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar agora
            </Button>
            <Button onClick={handleResendVerification} className="w-full" variant="outline" disabled={isSending}>
                {isSending ? (
                <Loader2 className="animate-spin" />
                ) : (
                <>
                    <Send className="mr-2 h-4 w-4" />
                    Reenviar E-mail
                </>
                )}
            </Button>
          </div>
           <Button variant="link" onClick={() => router.push('/login')} className="mt-4">
             Voltar para o Login
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}
