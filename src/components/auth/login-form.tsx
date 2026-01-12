
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
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { useFirebase } from "@/firebase/provider"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { collection, query, where, getDocs, Firestore } from "firebase/firestore"

const formSchema = z.object({
  identifier: z.string().min(1, { message: "Email ou CPF é obrigatório." }),
  password: z.string().min(1, { message: "A senha é obrigatória." }),
})

async function getEmailForCpf(db: Firestore, cpf: string): Promise<string | null> {
    const usersRef = collection(db, 'users');
    // Remove formatting from CPF to match stored value
    const numericCpf = cpf.replace(/\D/g, "");
    const q = query(usersRef, where('cpf', '==', numericCpf));
    
    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log(`Nenhum usuário encontrado com o CPF: ${numericCpf}`);
            return null;
        }
        // Assuming CPF is unique, return the email of the first match
        const userDoc = querySnapshot.docs[0];
        return userDoc.data().email;
    } catch (error) {
        console.error("Erro ao buscar usuário por CPF:", error);
        return null;
    }
}


export function LoginForm() {
  const { toast } = useToast()
  const { app, firestore } = useFirebase();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  })
  
  const isCpf = (identifier: string) => {
    return /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(identifier);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!app || !firestore) return;
    setIsSubmitting(true);
    const auth = getAuth(app);
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
      toast({
        title: "Login bem-sucedido",
        description: "Redirecionando para o seu painel...",
      })
      router.push('/dashboard');
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email ou CPF</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="email@exemplo.com ou CPF" {...field} className="pl-10" disabled={isSubmitting} />
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
  )
}
