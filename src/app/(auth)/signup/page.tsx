import Link from "next/link"
import { SignUpForm } from "@/components/auth/signup-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Crie sua Conta</CardTitle>
        <CardDescription>
          Junte-se ao BeachPal e encontre seu lugar ao sol.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
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
