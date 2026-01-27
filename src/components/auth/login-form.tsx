"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useFirebase } from "@/firebase/provider"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { FirebaseError } from "firebase/app"
import Link from "next/link"

const loginSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(1, "A senha é obrigatória."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const { auth } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    if (!auth) return
    setIsLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (!user.emailVerified) {
          toast({
              title: 'Verificação de Email Pendente',
              description: 'Por favor, verifique o seu email para continuar. A redirecioná-lo...',
          });
          router.push('/verify-email-notice');
          return;
      }

      toast({
        title: "Login bem-sucedido!",
        description: "Bem-vindo(a) de volta!",
      })
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      router.push(redirectUrl)
    } catch (error: unknown) {
        let description = "Ocorreu um erro desconhecido. Tente novamente.";
        if (error instanceof FirebaseError) {
            switch(error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    description = "Email ou senha inválidos. Por favor, tente novamente."
                    break;
                case 'auth/too-many-requests':
                    description = "Acesso temporariamente bloqueado devido a muitas tentativas. Tente novamente mais tarde."
                    break;
                default:
                    description = "Não foi possível fazer login. Verifique sua conexão e tente novamente."
                    break;
            }
        }
      toast({
        variant: "destructive",
        title: "Erro no Login",
        description: description,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} autoComplete="email" />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Esqueceu a senha?
          </Link>
        </div>
        <Input id="password" type="password" {...register("password")} autoComplete="current-password"/>
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  )
}
