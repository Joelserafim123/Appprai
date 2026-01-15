
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getAuth, isSignInWithEmailLink, signInWithEmailLink, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { UserProfile } from '@/lib/types';


function FinishLoginHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseApp, firestore } = useFirebase();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || !firebaseApp || !firestore) return;

    const auth = getAuth(firebaseApp);
    const emailLink = window.location.href;

    if (isSignInWithEmailLink(auth, emailLink)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        setStatus('error');
        setErrorMessage('O e-mail para login não foi encontrado. Por favor, tente fazer login novamente no mesmo dispositivo em que iniciou.');
        return;
      }

      signInWithEmailLink(auth, email, emailLink)
        .then(async (result) => {
          window.localStorage.removeItem('emailForSignIn');
          const user = result.user;

          // Verificar se é um novo utilizador (primeiro login)
          if (result.operationType === 'signIn' && user.metadata.creationTime === user.metadata.lastSignInTime) {
              const displayName = searchParams.get('displayName');
              const role = searchParams.get('role');
              const cpf = searchParams.get('cpf');

              if (displayName && role && cpf) {
                // Atualizar o perfil do Auth
                await updateProfile(user, { displayName });

                // Criar o documento no Firestore
                const userProfileData: UserProfile = {
                    uid: user.uid,
                    email: user.email!,
                    displayName: displayName,
                    role: role as 'customer' | 'owner',
                    cpf: cpf,
                };
                
                const userDocRef = doc(firestore, "users", user.uid);
                await setDoc(userDocRef, userProfileData).catch(e => {
                    const permissionError = new FirestorePermissionError({
                    path: `users/${user.uid}`,
                    operation: 'create',
                    requestResourceData: userProfileData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw e;
                });
                toast({
                  title: "Conta criada com sucesso!",
                  description: "Bem-vindo ao BeachPal!",
                });
              }
          }

          setStatus('success');
          toast({
            title: "Login bem-sucedido!",
            description: "Bem-vindo de volta!",
          });
          router.push('/dashboard');
        })
        .catch((error) => {
          setStatus('error');
          switch (error.code) {
            case 'auth/expired-action-code':
              setErrorMessage('O link de login expirou. Por favor, solicite um novo.');
              break;
            case 'auth/invalid-action-code':
              setErrorMessage('O link de login é inválido. Pode já ter sido usado.');
              break;
            default:
              setErrorMessage('Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.');
          }
        });
    } else {
        setStatus('error');
        setErrorMessage('Este não é um link de login válido.');
    }
  }, [firebaseApp, firestore, router, toast, searchParams]);


  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">A finalizar o seu login...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="mt-4 text-2xl">Login Concluído!</CardTitle>
            <CardDescription>
                Você foi autenticado com sucesso. A redirecioná-lo para o seu painel...
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
     <Card className="w-full max-w-md border-destructive">
        <CardHeader className="text-center">
            <ShieldX className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4 text-2xl">Falha no Login</CardTitle>
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


export default function FinishLoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                <FinishLoginHandler />
            </Suspense>
        </div>
    )
}
