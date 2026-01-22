'use client';

import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { getAuth, signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// A simple SVG for Google icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.62-4.55 1.62-3.83 0-6.94-2.97-6.94-6.93s3.11-6.93 6.94-6.93c2.2 0 3.59.86 4.45 1.73l2.66-2.54C18.45 3.39 15.95 2.5 12.48 2.5c-5.48 0-9.94 4.45-9.94 9.93s4.46 9.93 9.94 9.93c5.19 0 9.59-3.44 9.59-9.82 0-.73-.07-1.33-.19-1.92H12.48z" />
  </svg>
);


export function SocialLogins({ role }: { role?: 'customer' | 'owner' }) {
  const { firebaseApp, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!firebaseApp || !firestore) return;
    setIsLoading(true);

    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);

      if (additionalUserInfo?.isNewUser) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
             const userProfileData: Omit<UserProfile, 'cpf' | 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state'> = {
                uid: user.uid,
                email: user.email!,
                displayName: user.displayName!,
                photoURL: user.photoURL || undefined,
                role: role || 'customer',
                profileComplete: false,
            };

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

    } catch (error: any) {
      if (error.code !== 'permission-denied') {
        toast({
            variant: "destructive",
            title: "Erro de Autenticação",
            description: "Não foi possível fazer login com o Google. Por favor, tente novamente.",
        });
      }
      console.error("Google Sign-In Error: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
            {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            Continuar com Google
        </Button>
    </div>
  );
}
