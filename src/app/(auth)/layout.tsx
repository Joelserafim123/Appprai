'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuth, getRedirectResult, getAdditionalUserInfo } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/icons';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { authImageUrl } from '@/lib/placeholder-images';
import type { UserProfile } from '@/lib/types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseApp, firestore, auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) return;

    // Only run this once on initial load.
    if (isProcessingRedirect) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result) {
            const user = result.user;
            const additionalUserInfo = getAdditionalUserInfo(result);

            if (additionalUserInfo?.isNewUser) {
              const userDocRef = doc(firestore, 'users', user.uid);
              const docSnap = await getDoc(userDocRef);

              if (!docSnap.exists()) {
                const role = sessionStorage.getItem('signup_role') || 'customer';
                sessionStorage.removeItem('signup_role'); // Clean up

                const userProfileData: Omit<UserProfile, 'cpf' | 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state'> = {
                    uid: user.uid,
                    email: user.email!,
                    displayName: user.displayName!,
                    photoURL: user.photoURL || null,
                    role: role as 'customer' | 'owner',
                    profileComplete: false,
                };
                
                try {
                   await setDoc(userDocRef, userProfileData);
                   toast({
                        title: "Bem-vindo(a)!",
                        description: "Sua conta foi criada com sucesso.",
                    });
                } catch (e: any) {
                    const permissionError = new FirestorePermissionError({
                        path: userDocRef.path,
                        operation: 'create',
                        requestResourceData: userProfileData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    // No need to rethrow, error is handled globally
                }
              }
            } else {
              toast({
                  title: "Login bem-sucedido!",
                  description: "Bem-vindo(a) de volta!",
              });
            }
            
            const redirectUrl = searchParams.get('redirect') || '/dashboard';
            router.push(redirectUrl);
          }
          setIsProcessingRedirect(false);
        })
        .catch((error) => {
          console.error("Redirect Result Error:", error);
          if (error.code !== 'auth/no-redirect-results') {
            toast({
                variant: "destructive",
                title: "Erro de Autenticação",
                description: "Não foi possível fazer login com o Google. Por favor, tente novamente.",
            });
          }
          setIsProcessingRedirect(false);
        });
    }
  }, [auth, firestore, isProcessingRedirect, router, searchParams, toast]);

  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-sm gap-6">
          <Link href="/" className="mx-auto">
             <Logo />
             <span className="sr-only">BeachPal Home</span>
          </Link>
          {isProcessingRedirect ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Finalizando autenticação...</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        <Image
          src={authImageUrl}
          data-ai-hint="sunny beach"
          alt="A beautiful sunny beach"
          fill
          priority
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-background/10" />
      </div>
    </main>
  );
}
