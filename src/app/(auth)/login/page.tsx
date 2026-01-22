import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LoginForm } from "@/components/auth/login-form"
import { SocialLogins } from "@/components/auth/social-logins"

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Acesse Sua Conta</CardTitle>
        <CardDescription>
          Use seu email e senha ou o Google para acessar a plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <LoginForm />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Ou continue com
              </span>
            </div>
          </div>
          <SocialLogins />
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

    