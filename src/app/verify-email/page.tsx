
'use client';

import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MailWarning, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function VerifyEmailPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleResendVerification = async () => {
    if (!user) return;
    const auth = getAuth();
    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser!);
      toast({
        title: 'E-mail de verificação reenviado!',
        description: 'Verifique sua caixa de entrada.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reenviar e-mail',
        description: 'Por favor, tente novamente em alguns minutos.',
      });
    } finally {
      setIsSending(false);
    }
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
    // User is already verified, send them to the dashboard.
    router.push('/dashboard');
    return null;
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
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Por favor, clique no link em seu e-mail para continuar. Se você não recebeu o e-mail, verifique sua pasta de spam ou clique abaixo para reenviar.
          </p>
          <Button onClick={handleResendVerification} className="mt-6 w-full" disabled={isSending}>
            {isSending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Reenviar E-mail de Verificação
              </>
            )}
          </Button>
           <Button variant="link" onClick={() => router.push('/login')} className="mt-4">
             Voltar para o Login
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}
