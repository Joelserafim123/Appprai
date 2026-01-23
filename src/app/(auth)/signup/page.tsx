import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SignUpForm } from "@/components/auth/signup-form"

export default function SignUpPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Crie sua Conta</CardTitle>
        <CardDescription>
          Preencha os campos abaixo para criar sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <SignUpForm />
        </div>
        <div className="mt-4 text-center text-sm">
          Já tem uma conta?{" "}
          <Link href="/login" className="underline text-primary font-medium">
            Faça login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
