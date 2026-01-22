'use client';

import Link from 'next/link';
import { Logo } from '@/components/icons';
import Image from 'next/image';
import { authImageUrl } from '@/lib/placeholder-images';
import { useUser, useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, getRedirectResult, getAdditionalUserInfo } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';


export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const { firebaseApp, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Add a state to prevent re-running the effect multiple times.
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);


  const firstName = user?.displayName?.split(' ')[0];

  useEffect(() => {
    if (!firebaseApp || !firestore || !isProcessingRedirect) return;

    const auth = getAuth(firebaseApp);
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User has successfully signed in.
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
                    photoURL: user.photoURL || undefined,
                    role: role as 'customer' | 'owner',
                    profileComplete: false,
                };

                setDoc(userDocRef, userProfileData).catch(e => {
                    const permissionError = new FirestorePermissionError({
                        path: `users/${user.uid}`,
                        operation: 'create',
                        requestResourceData: userProfileData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw e; // rethrow to be caught by outer catch
                });
                toast({
                    title: "Bem-vindo(a)!",
                    description: "Sua conta foi criada com sucesso.",
                });
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
        setIsProcessingRedirect(false); // Done processing
      })
      .catch((error) => {
        console.error("Redirect Result Error:", error);
        // Don't show toast for "no-redirect-results" which happens on normal page load
        if (error.code !== 'auth/no-redirect-results') {
           toast({
              variant: "destructive",
              title: "Erro de Autenticação",
              description: "Não foi possível fazer login com o Google. Por favor, tente novamente.",
          });
        }
        setIsProcessingRedirect(false); // Done processing
      });
  }, [firebaseApp, firestore, toast, router, searchParams, isProcessingRedirect]);


  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-sm gap-6">
          <Link href="/" className="mx-auto">
             <Logo userName={isUserLoading ? undefined : firstName} />
             <span className="sr-only">BeachPal Home</span>
          </Link>
          {(isUserLoading || isProcessingRedirect) && !firstName && (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          )}
          {children}
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        <Image
          src={authImageUrl}
          data-ai-hint="sunny beach"
          alt="A beautiful sunny beach"
          fill
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-background/10" />
      </div>
    </main>
  );
}
