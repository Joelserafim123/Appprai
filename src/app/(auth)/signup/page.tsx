import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SocialLogins } from "@/components/auth/social-logins"

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Crie sua Conta</CardTitle>
        <CardDescription>
          Use sua conta Google para se cadastrar no BeachPal. É rápido e fácil!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <SocialLogins />
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
