
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getAuth, applyActionCode, checkActionCode } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function VerificationHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { firebaseApp } = useFirebase();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  useEffect(() => {
    const oobCode = searchParams.get('oobCode');

    if (oobCode && firebaseApp) {
      const auth = getAuth(firebaseApp);
      
      // First, check the code to get user info without applying it
      checkActionCode(auth, oobCode)
        .then((info) => {
          const email = info.data.email;
          if (email) {
            setVerifiedEmail(email); // Store the email
          }
          // Now, apply the action code
          return applyActionCode(auth, oobCode);
        })
        .then(() => {
          setStatus('success');
        })
        .catch((error) => {
          setStatus('error');
          switch (error.code) {
            case 'auth/expired-action-code':
              setErrorMessage('O link de verificação expirou. Por favor, solicite um novo.');
              break;
            case 'auth/invalid-action-code':
              setErrorMessage('O link de verificação é inválido. Pode já ter sido usado.');
              break;
            default:
              setErrorMessage('Ocorreu um erro ao verificar seu e-mail. Tente novamente.');
          }
        });
    } else if (!oobCode) {
      setStatus('error');
      setErrorMessage('Nenhum código de verificação fornecido. Rota inválida.');
    }
  }, [searchParams, firebaseApp]);

  useEffect(() => {
    if (status === 'success') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Redirect with email as a query parameter
        router.push(verifiedEmail ? `/login?email=${encodeURIComponent(verifiedEmail)}` : '/login');
      }
    }
  }, [status, countdown, router, verifiedEmail]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Verificando seu e-mail...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="mt-4 text-2xl">E-mail Verificado com Sucesso!</CardTitle>
            <CardDescription>
                Sua conta foi ativada. Você será redirecionado para a página de login em {countdown} segundos...
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild className="w-full">
                <Link href={verifiedEmail ? `/login?email=${encodeURIComponent(verifiedEmail)}` : '/login'}>Ir para o Login Agora</Link>
            </Button>
        </CardContent>
      </Card>
    );
  }

  return (
     <Card className="w-full max-w-md border-destructive">
        <CardHeader className="text-center">
            <ShieldX className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4 text-2xl">Falha na Verificação</CardTitle>
            <CardDescription>
                {errorMessage}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild className="w-full" variant="secondary">
                <Link href="/login">Voltar para o Login</Link>
            </Button>
        </CardContent>
      </Card>
  );
}


export default function ConfirmVerificationPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                <VerificationHandler />
            </Suspense>
        </div>
    )
}
