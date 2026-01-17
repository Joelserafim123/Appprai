import Link from "next/link"
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
          Use sua conta Google para acessar a plataforma de forma rápida e segura.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <SocialLogins />
        </div>
        <div className="mt-4 text-center text-sm">
          Não tem uma conta?{" "}
          <Link href="/signup" className="underline text-primary font-medium">
            Cadastre-se com o Google
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
