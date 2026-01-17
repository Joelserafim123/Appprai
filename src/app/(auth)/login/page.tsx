import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SocialLogins } from "@/components/auth/social-logins"

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Acesse Sua Conta</CardTitle>
        <CardDescription>
          Bem-vindo de volta! Faça login para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <SocialLogins />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Ou continue com e-mail
              </span>
            </div>
          </div>
          <LoginForm />
        </div>
        <div className="mt-4 text-center text-sm">
          Não tem uma conta?{" "}
          <Link href="/signup" className="underline text-primary font-medium">
            Cadastre-se
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
