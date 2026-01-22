'use client';

import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { getAuth, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

// A simple SVG for Google icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.62-4.55 1.62-3.83 0-6.94-2.97-6.94-6.93s3.11-6.93 6.94-6.93c2.2 0 3.59.86 4.45 1.73l2.66-2.54C18.45 3.39 15.95 2.5 12.48 2.5c-5.48 0-9.94 4.45-9.94 9.93s4.46 9.93 9.94 9.93c5.19 0 9.59-3.44 9.59-9.82 0-.73-.07-1.33-.19-1.92H12.48z" />
  </svg>
);


export function SocialLogins({ role }: { role?: 'customer' | 'owner' }) {
  const { firebaseApp } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    if (!firebaseApp) return;
    setIsLoading(true);

    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();

    if (role) {
      sessionStorage.setItem('signup_role', role);
    } else {
      sessionStorage.removeItem('signup_role');
    }

    signInWithRedirect(auth, provider).catch((error: any) => {
      console.error("Google Sign-In Error: ", error);
      toast({
            variant: "destructive",
            title: "Erro de Autenticação",
            description: "Não foi possível iniciar o login com o Google. Verifique a sua ligação ou tente novamente.",
        });
      setIsLoading(false);
    });
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
