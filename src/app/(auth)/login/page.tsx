import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Acesse Sua Conta</CardTitle>
        <CardDescription>
          Use seu email e senha para acessar a plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
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
