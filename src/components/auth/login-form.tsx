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
import { KeyRound, Mail, Loader2 } from "lucide-react"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { useFirebase } from "@/firebase/provider"
import { useRouter } from "next/navigation"
import { useState } from "react"

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um endereço de e-mail válido." }),
  password: z.string().min(1, { message: "A senha é obrigatória." }),
})

export function LoginForm() {
  const { toast } = useToast()
  const { app } = useFirebase();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!app) return;
    setIsSubmitting(true);
    const auth = getAuth(app);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login bem-sucedido",
        description: "Redirecionando...",
      })
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      let description = "Ocorreu um erro desconhecido.";
      if (error.code === 'auth/invalid-credential') {
        description = "Credenciais inválidas. Verifique seu e-mail e senha e tente novamente.";
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="m@exemplo.com" {...field} className="pl-10" disabled={isSubmitting} />
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
                <a href="#" className="ml-auto inline-block text-sm underline">
                  Esqueceu sua senha?
                </a>
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
