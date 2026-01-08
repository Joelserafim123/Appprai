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
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>
          Join BeachPal and find your spot in the sun.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline text-primary font-medium">
            Login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
