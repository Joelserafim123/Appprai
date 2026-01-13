
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { KeyRound, Loader2, User, Mail } from "lucide-react"
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { useFirebase } from "@/firebase/provider"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"


const formSchema = z.object({
  email: z.string().email({ message: "Invalid email." }),
  password: z.string().min(1, { message: "Password is required." }),
})


function ForgotPasswordDialog() {
  const { firebaseApp } = useFirebase();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handlePasswordReset = async () => {
    if (!firebaseApp || !email) return;
    setIsSending(true);
    const auth = getAuth(firebaseApp);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Recovery email sent!",
        description: "Check your inbox for the password reset link.",
      });
      setIsSent(true);
    } catch (error: any) {
      let description = "An error occurred. Please try again.";
      if (error.code === 'auth/user-not-found') {
        description = "No user found with this email.";
      }
       toast({
        variant: "destructive",
        title: "Failed to send email",
        description,
      });
    } finally {
      setIsSending(false);
    }
  }

  if (isSent) {
    return (
       <DialogContent>
        <DialogHeader>
          <DialogTitle>Check Your Email</DialogTitle>
          <DialogDescription>
            A link to reset your password has been sent to <span className="font-semibold">{email}</span>. Follow the instructions in the email to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    )
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Recover Password</DialogTitle>
        <DialogDescription>
          Enter your registered email address and we'll send you a link to reset your password.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
             <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
                className="pl-10"
              />
          </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" disabled={isSending}>Cancel</Button>
        </DialogClose>
        <Button onClick={handlePasswordReset} disabled={isSending || !email}>
          {isSending ? <Loader2 className="animate-spin" /> : "Send Recovery Link"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}


export function LoginForm() {
  const { toast } = useToast()
  const { firebaseApp, firestore } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })
  
  useEffect(() => {
    const emailFromParams = searchParams.get('email');
    if (emailFromParams) {
        form.setValue('email', decodeURIComponent(emailFromParams));
    }
  }, [searchParams, form]);


  const handleAuthSuccess = () => {
      toast({
        title: "Login successful",
        description: "Redirecting...",
      })
      const redirectUrl = searchParams.get('redirect');
      router.push(redirectUrl || '/dashboard');
      router.refresh(); 
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firebaseApp) return;
    setIsSubmitting(true);
    const auth = getAuth(firebaseApp);
    
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      handleAuthSuccess();
    } catch (error: any) {
      console.error(error);
      let description = "An unexpected error occurred while trying to log in.";
      
      const errorCode = error.code || error.message;

      switch (errorCode) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          description = "Invalid credentials. Please check your email and password and try again.";
          break;
        case 'auth/too-many-requests':
          description = "Access temporarily blocked due to too many attempts. Please try again later.";
          break;
        default:
          description = "Could not log in. Check your connection and try again.";
          break;
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description,
      })
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} className="pl-10" disabled={isSubmitting} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <DialogTrigger asChild>
                    <Button variant="link" size="sm" type="button" className="text-xs h-auto p-0">Forgot password?</Button>
                  </DialogTrigger>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isSubmitting}/>
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Log In'}
          </Button>
        </form>
      </Form>
      <ForgotPasswordDialog />
    </Dialog>
  )
}
