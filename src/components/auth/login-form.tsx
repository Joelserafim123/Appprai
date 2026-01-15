
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
import { Loader2, Mail, Send } from "lucide-react"
import { getAuth, sendSignInLinkToEmail } from "firebase/auth"
import { useFirebase } from "@/firebase/provider"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

const formSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }),
})

export function LoginForm() {
  const { toast } = useToast()
  const { firebaseApp } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: searchParams.get('email') ?? "",
    },
  })
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firebaseApp) return;
    setIsSubmitting(true);
    const auth = getAuth(firebaseApp);
    
    const actionCodeSettings = {
        url: `${window.location.origin}/finish-login`,
        handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, values.email, actionCodeSettings);
      // O link foi enviado com sucesso. Informar o utilizador.
      // Guardar o e-mail localmente para não precisar de o pedir novamente
      // se o utilizador abrir o link no mesmo dispositivo.
      window.localStorage.setItem('emailForSignIn', values.email);
      setEmailSent(true);
      toast({
        title: "Link de login enviado!",
        description: "Verifique seu e-mail para o link de acesso.",
      })
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: "Não foi possível enviar o link de login. Tente novamente.",
      })
    } finally {
        setIsSubmitting(false);
    }
  }
  
  if (emailSent) {
    return (
        <div className="text-center space-y-4">
            <Send className="mx-auto h-12 w-12 text-primary"/>
            <h3 className="text-xl font-semibold">Verifique seu E-mail</h3>
            <p className="text-muted-foreground">
                Enviamos um link mágico de login para <span className="font-bold text-foreground">{form.getValues('email')}</span>. 
                Clique no link para entrar na sua conta.
            </p>
        </div>
    )
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
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Entrar com Link Mágico'}
          </Button>
        </form>
      </Form>
  )
}
