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

const loginSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const { firebaseApp } = useFirebase()
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
    if (!firebaseApp) return
    setIsLoading(true)
    const auth = getAuth(firebaseApp)

    try {
      await signInWithEmailAndPassword(auth, data.email, data.password)
      toast({
        title: "Login bem-sucedido!",
        description: "Bem-vindo de volta!",
      })
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      router.push(redirectUrl)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no Login",
        description: "Email ou senha inválidos. Por favor, tente novamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="m@example.com" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  )
}
