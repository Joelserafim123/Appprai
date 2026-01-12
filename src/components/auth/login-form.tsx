
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { KeyRound, Mail, Loader2, User } from "lucide-react"
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { useFirebase } from "@/firebase/provider"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { collection, query, where, getDocs, Firestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { Separator } from "../ui/separator"
import { Logo } from "../icons"

const formSchema = z.object({
  identifier: z.string().min(1, { message: "Email ou CPF é obrigatório." }),
  password: z.string().min(1, { message: "A senha é obrigatória." }),
})

async function getEmailForCpf(db: Firestore, cpf: string): Promise<string | null> {
    const usersRef = collection(db, 'users');
    const numericCpf = cpf.replace(/\D/g, "");
    const q = query(usersRef, where('cpf', '==', numericCpf));
    
    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log(`Nenhum usuário encontrado com o CPF: ${numericCpf}`);
            return null;
        }
        const userDoc = querySnapshot.docs[0];
        return userDoc.data().email;
    } catch (error) {
        console.error("Erro ao buscar usuário por CPF:", error);
        return null;
    }
}


export function LoginForm() {
  const { toast } = useToast()
  const { firebaseApp, firestore } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  })
  
  const isCpf = (identifier: string) => {
    return /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(identifier) || /^\d{11}$/.test(identifier);
  }

  const handleAuthSuccess = (redirectUrl?: string) => {
      toast({
        title: "Login bem-sucedido",
        description: "Redirecionando...",
      })
      const finalRedirect = redirectUrl || searchParams.get('redirect') || '/dashboard';
      router.push(finalRedirect);
      router.refresh(); // Refresh the page to ensure user state is updated
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firebaseApp || !firestore) return;
    setIsSubmitting(true);
    const auth = getAuth(firebaseApp);
    let emailToLogin = values.identifier;

    try {
        if (isCpf(values.identifier)) {
            const foundEmail = await getEmailForCpf(firestore, values.identifier);
            if (!foundEmail) {
                throw new Error("auth/user-not-found");
            }
            emailToLogin = foundEmail;
        }
        
      await signInWithEmailAndPassword(auth, emailToLogin, values.password);
      handleAuthSuccess();
    } catch (error: any) {
      console.error(error);
      let description = "Ocorreu um erro inesperado ao tentar fazer login.";
      
      const errorCode = error.code || error.message;

      switch (errorCode) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          description = "Credenciais inválidas. Verifique seus dados e tente novamente.";
          break;
        case 'auth/too-many-requests':
          description = "Acesso bloqueado temporariamente devido a muitas tentativas. Tente novamente mais tarde.";
          break;
        default:
          description = "Não foi possível fazer login. Verifique sua conexão e tente novamente.";
          break;
      }
      toast({
        variant: "destructive",
        title: "Falha no login",
        description,
      })
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleGoogleSignIn = async () => {
    if (!firebaseApp || !firestore) return;
    setIsGoogleSubmitting(true);
    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          createdAt: serverTimestamp(),
          role: 'customer',
          cpf: '',
          address: '',
        };
        await setDoc(userDocRef, newUserProfile);
        handleAuthSuccess('/dashboard/settings'); 
      } else {
        const userData = userDoc.data();
        if (!userData.cpf || !userData.address) {
            handleAuthSuccess('/dashboard/settings');
        } else {
            handleAuthSuccess();
        }
      }

    } catch (error: any) {
      console.error("Google sign in error", error);
      let description = "Não foi possível fazer login com o Google.";
      if (error.code === 'auth/popup-closed-by-user') {
        description = "A janela de login do Google foi fechada.";
      }
      toast({
        variant: "destructive",
        title: "Falha no login com Google",
        description,
      })
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email ou CPF</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="email@exemplo.com ou CPF" {...field} className="pl-10" disabled={isSubmitting || isGoogleSubmitting} />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <FormLabel>Senha</FormLabel>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isSubmitting || isGoogleSubmitting}/>
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting || isGoogleSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Entrar'}
        </Button>
      </form>
       <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou continue com
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting || isGoogleSubmitting}>
           {isGoogleSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           ) : (
            <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.62-3.8 1.62-2.97 0-5.4-2.44-5.4-5.4s2.43-5.4 5.4-5.4c1.35 0 2.64.52 3.58 1.44l2.15-2.15C17.2.73 15.23 0 12.48 0 5.88 0 .5 5.38.5 12s5.38 12 11.98 12c3.13 0 5.64-1.04 7.52-2.9s2.96-4.5 2.96-8.08c0-.6-.05-1.18-.15-1.72H12.48z"></path></svg>
           )}
          Google
        </Button>
    </Form>
  )
}
