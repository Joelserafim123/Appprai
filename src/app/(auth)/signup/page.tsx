'use client';

import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SignUpForm } from "@/components/auth/signup-form"
import { useTranslations } from "@/i18n";

export default function SignUpPage() {
  const t = useTranslations('SignUpPage');

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
          <SignUpForm />
        </div>
        <div className="mt-4 text-center text-sm">
          {t('hasAccount')}{" "}
          <Link href="/login" className="underline text-primary font-medium">
            {t('loginLink')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
