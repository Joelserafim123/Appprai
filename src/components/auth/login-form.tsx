
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
import { Loader2, Mail, Smartphone, Send } from "lucide-react"
import { getAuth, sendSignInLinkToEmail } from "firebase/auth"
import { useFirebase } from "@/firebase/provider"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PhoneSignIn } from "./phone-signin"


const formSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }),
})

export function LoginForm() {
  const { toast } = useToast()
  const { firebaseApp } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhoneSignInOpen, setIsPhoneSignInOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: searchParams.get('email') ?? "",
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
    
    const actionCodeSettings = {
        url: `${window.location.origin}/finish-login`,
        handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, values.email, actionCodeSettings);
      // The link was successfully sent. Inform the user.
      // Save the email locally so you don't need to ask the user for it again
      // if they open the link on the same device.
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
      <div className="grid grid-cols-1 gap-2">
        <Dialog open={isPhoneSignInOpen} onOpenChange={setIsPhoneSignInOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" disabled={isSubmitting}>
              <Smartphone className="mr-2" /> Entrar com Telefone
            </Button>
          </DialogTrigger>
          <PhoneSignIn onAuthSuccess={() => { setIsPhoneSignInOpen(false); handleAuthSuccess(); }} />
        </Dialog>
      </div>
    </Dialog>
  )
}
