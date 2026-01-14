
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
import { KeyRound, Loader2, User, Mail, Smartphone } from "lucide-react"
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { useFirebase } from "@/firebase/provider"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "../ui/separator"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { PhoneSignIn } from "./phone-signin"


const formSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }),
  password: z.string().min(1, { message: "A senha é obrigatória." }),
})

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-8H6.306C9.656,39.663,16.318,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,35.816,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );
}


function ForgotPasswordDialog() {
  const { firebaseApp } = useFirebase();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handlePasswordReset = async () => {
    if (!firebaseApp || !email) return;
    setIsSending(true);
    const auth = getAuth(firebaseApp);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "E-mail de recuperação enviado!",
        description: "Verifique sua caixa de entrada para o link de redefinição de senha.",
      });
      setIsSent(true);
    } catch (error: any) {
      let description = "Ocorreu um erro. Por favor, tente novamente.";
      if (error.code === 'auth/user-not-found') {
        description = "Nenhum usuário encontrado com este e-mail.";
      }
       toast({
        variant: "destructive",
        title: "Falha ao enviar e-mail",
        description,
      });
    } finally {
      setIsSending(false);
    }
  }

  if (isSent) {
    return (
       <DialogContent>
        <DialogHeader>
          <DialogTitle>Verifique seu E-mail</DialogTitle>
          <DialogDescription>
            Um link para redefinir sua senha foi enviado para <span className="font-semibold">{email}</span>. Siga as instruções no e-mail para continuar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    )
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Recuperar Senha</DialogTitle>
        <DialogDescription>
          Digite seu endereço de e-mail cadastrado e enviaremos um link para redefinir sua senha.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
             <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
                className="pl-10"
              />
          </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" disabled={isSending}>Cancelar</Button>
        </DialogClose>
        <Button onClick={handlePasswordReset} disabled={isSending || !email}>
          {isSending ? <Loader2 className="animate-spin" /> : "Enviar Link de Recuperação"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}


export function LoginForm() {
  const { toast } = useToast()
  const { firebaseApp, firestore } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isPhoneSignInOpen, setIsPhoneSignInOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })
  
  useEffect(() => {
    const emailFromParams = searchParams.get('email');
    if (emailFromParams) {
        form.setValue('email', decodeURIComponent(emailFromParams));
    }
  }, [searchParams, form]);


  const handleAuthSuccess = () => {
      toast({
        title: "Login bem-sucedido",
        description: "Redirecionando...",
      })
      const redirectUrl = searchParams.get('redirect');
      router.push(redirectUrl || '/dashboard');
      router.refresh(); 
  }

  const handleGoogleSignIn = async () => {
    if (!firebaseApp || !firestore) return;
    setIsGoogleSubmitting(true);
    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          role: 'customer',
        });
      }
      
      handleAuthSuccess();

    } catch (error: any) {
      console.error("Google Sign-In Error", error);
      toast({
        variant: "destructive",
        title: "Falha no Login com Google",
        description: "Não foi possível autenticar com o Google. Tente novamente."
      });
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firebaseApp) return;
    setIsSubmitting(true);
    const auth = getAuth(firebaseApp);
    
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      handleAuthSuccess();
    } catch (error: any) {
      console.error(error);
      let description = "Ocorreu um erro inesperado ao tentar fazer login.";
      
      const errorCode = error.code || error.message;

      switch (errorCode) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          description = "Credenciais inválidas. Por favor, verifique seu e-mail e senha e tente novamente.";
          break;
        case 'auth/too-many-requests':
          description = "Acesso bloqueado temporariamente devido a muitas tentativas. Por favor, tente novamente mais tarde.";
          break;
        default:
          description = "Não foi possível fazer login. Verifique sua conexão e tente novamente.";
          break;
      }
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description,
      })
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input placeholder="email@exemplo.com" {...field} className="pl-10" disabled={isSubmitting || isGoogleSubmitting} />
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
                <div className="flex items-center justify-between">
                  <FormLabel>Senha</FormLabel>
                  <DialogTrigger asChild>
                    <Button variant="link" size="sm" type="button" className="text-xs h-auto p-0">Esqueceu a senha?</Button>
                  </DialogTrigger>
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
      </Form>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
            OU
            </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting || isGoogleSubmitting}>
          {isGoogleSubmitting ? <Loader2 className="animate-spin" /> : <><GoogleIcon className="mr-2" /> Google</>}
        </Button>
        <Dialog open={isPhoneSignInOpen} onOpenChange={setIsPhoneSignInOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" disabled={isSubmitting || isGoogleSubmitting}>
              <Smartphone className="mr-2" /> Telefone
            </Button>
          </DialogTrigger>
          <PhoneSignIn onAuthSuccess={() => { setIsPhoneSignInOpen(false); handleAuthSuccess(); }} />
        </Dialog>
      </div>
      <ForgotPasswordDialog />
    </Dialog>
  )
}
