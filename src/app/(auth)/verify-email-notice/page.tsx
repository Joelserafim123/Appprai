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

export default function VerifyEmailNoticePage() {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  const handleResendVerification = async () => {
    if (auth.currentUser) {
      setIsSending(true);
      try {
        await sendEmailVerification(auth.currentUser);
        toast({
          title: 'Email de verificação reenviado',
          description: 'Por favor, verifique a sua caixa de entrada (e a pasta de spam).',
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Erro ao reenviar',
          description: 'Ocorreu um erro ao reenviar o email. Tente novamente mais tarde.',
        });
      } finally {
        setIsSending(false);
      }
    } else {
         toast({
          variant: 'destructive',
          title: 'Não está autenticado',
          description: 'Faça login novamente para reenviar o email de verificação.',
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
        <CardTitle className="mt-4 text-2xl">Verifique o seu E-mail</CardTitle>
        <CardDescription>
          Enviámos um link de verificação para o seu endereço de e-mail. Por favor,
          clique no link para ativar a sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
         <p className="px-8 text-center text-sm text-muted-foreground">
          Depois de verificar seu e-mail, <Link href="/login" className="underline text-primary font-medium">faça login</Link> para continuar.
        </p>
        <Button onClick={handleResendVerification} disabled={isSending} variant="outline">
          {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reenviar email de verificação
        </Button>
         <Button onClick={handleLogout} variant="link">
          Fazer logout
        </Button>
      </CardContent>
    </Card>
  );
}
