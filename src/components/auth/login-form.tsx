
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
import { Loader2, Mail, Lock } from "lucide-react"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { useFirebase } from "@/firebase/provider"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

const formSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }),
  password: z.string().min(1, { message: "A senha é obrigatória." }),
})

export function LoginForm() {
  const { toast } = useToast()
  const { firebaseApp } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: searchParams.get('email') ?? "",
      password: "",
    },
  })
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firebaseApp) return;
    setIsSubmitting(true);
    const auth = getAuth(firebaseApp);

    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login bem-sucedido!",
        description: "Bem-vindo de volta!",
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      let description = "Não foi possível fazer login. Verifique seu e-mail e senha.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "E-mail ou senha inválidos. Por favor, tente novamente.";
      } else if (error.code === 'auth/user-disabled') {
        description = "Esta conta foi desativada.";
      }
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: description,
      })
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <FormLabel>Senha</FormLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input type="password" placeholder="Sua senha" {...field} className="pl-10" disabled={isSubmitting} />
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
