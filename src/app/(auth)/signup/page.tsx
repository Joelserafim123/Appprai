import Link from "next/link"
import { SignUpForm } from "@/components/auth/signup-form"
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
          Junte-se ao BeachPal e encontre seu lugar ao sol.
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
                Ou crie com e-mail
              </span>
            </div>
          </div>
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
