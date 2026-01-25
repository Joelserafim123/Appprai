import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
        <CardDescription>
          Insira seu e-mail para receber um link de recuperação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
        <div className="mt-4 text-center text-sm">
          Lembrou da senha?{" "}
          <Link href="/login" className="underline text-primary font-medium">
            Faça login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
