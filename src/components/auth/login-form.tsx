
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
import { KeyRound, Loader2, User, Mail } from "lucide-react"
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { useFirebase } from "@/firebase/provider"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
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


const formSchema = z.object({
  email: z.string().email({ message: "Email inválido." }),
  password: z.string().min(1, { message: "A senha é obrigatória." }),
})


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
      let description = "Ocorreu um erro. Tente novamente.";
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
          Digite seu endereço de e-mail cadastrado e enviaremos um link para você redefinir sua senha.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })
  
  const handleAuthSuccess = () => {
      toast({
        title: "Login bem-sucedido",
        description: "Redirecionando...",
      })
      const redirectUrl = searchParams.get('redirect');
      router.push(redirectUrl || '/dashboard');
      router.refresh(); 
  }

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
          description = "Credenciais inválidas. Verifique seu e-mail e senha e tente novamente.";
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
                    <Input placeholder="email@exemplo.com" {...field} className="pl-10" disabled={isSubmitting} />
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
                    <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isSubmitting}/>
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Entrar'}
          </Button>
        </form>
      </Form>
      <ForgotPasswordDialog />
    </Dialog>
  )
}
