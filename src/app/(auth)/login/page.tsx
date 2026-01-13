
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Acesse sua conta</CardTitle>
        <CardDescription>
          Que bom ver você de novo! Faça login para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <div className="mt-4 text-center text-sm">
          Não tem uma conta?{" "}
          <Link href="/signup" className="underline text-primary font-medium">
            Inscrever-se
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
