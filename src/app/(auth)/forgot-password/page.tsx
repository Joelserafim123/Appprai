'use client';

import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { useTranslations } from "@/i18n";

export default function ForgotPasswordPage() {
  const t = useTranslations('ForgotPasswordPage');

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
        <div className="mt-4 text-center text-sm">
          {t('backToLogin')}{" "}
          <Link href="/login" className="underline text-primary font-medium">
            {t('loginLink')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
