'use client';

import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LoginForm } from "@/components/auth/login-form"
import { useTranslations } from "@/i18n";

export default function LoginPage() {
  const t = useTranslations('LoginPage');
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <LoginForm />
        </div>
        <div className="mt-4 text-center text-sm">
          {t('noAccount')}{" "}
          <Link href="/signup" className="underline text-primary font-medium">
            {t('signUpLink')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
