'use client';

import { GoogleAuthProvider, getAuth, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" {...props} role="img" aria-label="Google logo">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 12.66C34.976 9.205 29.82 7 24 7c-9.4 0-17 7.6-17 17s7.6 17 17 17c9.4 0 17-7.6 17-17c0-1.092-.116-2.15-.319-3.168z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691c-1.831 3.453-1.831 7.825 0 11.278l-5.399 4.239C-1.84 25.82 2.296 11.26 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-4.821c-2.007 1.3-4.402 2.013-6.91 2.013c-5.222 0-9.643-3.339-11.303-7.962L5.992 32.74C8.981 39.205 15.938 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083L43.594 20H24v8h11.303c-.792 2.237-2.231 4.16-4.087 5.571l6.19 4.821c3.41-3.131 5.594-7.697 5.594-12.671c0-1.092-.116-2.15-.319-3.168z"
      />
    </svg>
  );
}

export function SocialLogins() {
  const { firebaseApp, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!firebaseApp || !firestore) return;
    setIsGoogleLoading(true);
    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      
      if (additionalInfo?.isNewUser) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userProfileData: Omit<UserProfile, 'cpf' | 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state'> = {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName!,
            photoURL: user.photoURL || '',
            role: 'customer',
            profileComplete: false,
        };

        await setDoc(userDocRef, userProfileData).catch(e => {
            const permissionError = new FirestorePermissionError({
                path: `users/${'user.uid'}`,
                operation: 'create',
                requestResourceData: userProfileData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw e;
        });
        
        toast({
          title: 'Conta criada com sucesso!',
          description: 'Bem-vindo ao BeachPal!',
        });
      } else {
        toast({
          title: 'Login bem-sucedido!',
          description: 'Bem-vindo de volta!',
        });
      }
      
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      router.push(redirectUrl);

    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: 'destructive',
          title: 'Falha no Login com Google',
          description: error.message || 'Ocorreu um erro. Por favor, tente novamente.',
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleGoogleSignIn}
      disabled={isGoogleLoading}
    >
      {isGoogleLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="mr-2 h-4 w-4" />
      )}
      Continuar com Google
    </Button>
  );
}
