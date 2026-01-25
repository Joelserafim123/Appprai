"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useFirebase } from "@/firebase"
import { sendPasswordResetEmail } from "firebase/auth"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { FirebaseError } from "firebase/app"

const forgotPasswordSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const { auth } = useFirebase()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    if (!auth) return
    setIsLoading(true)

    try {
      await sendPasswordResetEmail(auth, data.email)
      setIsSubmitted(true)
      toast({
        title: "Link de recuperação enviado!",
        description: "Se existir uma conta associada a este e-mail, um link será enviado.",
      })
    } catch (error: unknown) {
      console.error("Password reset error:", error)
      // We show a generic success message to prevent user enumeration
       toast({
        title: "Link de recuperação enviado!",
        description: "Se existir uma conta associada a este e-mail, um link será enviado.",
      })
       setIsSubmitted(true);
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
      return (
          <div className="text-center text-sm text-muted-foreground">
              <p>Verifique a sua caixa de entrada (e pasta de spam) para o link de recuperação de senha.</p>
          </div>
      )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} autoComplete="email" />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar Email de Recuperação
      </Button>
    </form>
  )
}
