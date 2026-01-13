
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { User, Mail, KeyRound, Briefcase, UserCircle, Loader2, Send } from "lucide-react"
import { getAuth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { useFirebase } from "@/firebase/provider"
import { useRouter } from "next/navigation"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { useState, useCallback } from "react"
import type { UserProfile } from "@/lib/types"

const formSchema = z.object({
  displayName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  role: z.enum(["customer", "owner"], { required_error: "You must select a role." }),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf), { message: "CPF must have 11 digits and is required." }),
  cep: z.string().refine(value => /^\d{5}-?\d{3}$/.test(value), 'Invalid CEP.'),
  street: z.string().min(1, 'Street is required.'),
  number: z.string().min(1, 'Number is required.'),
  neighborhood: z.string().min(1, 'Neighborhood is required.'),
  city: z.string().min(1, 'City is required.'),
  state: z.string().min(1, 'State is required.'),
})

export function SignUpForm() {
  const { toast } = useToast()
  const { firebaseApp: app, firestore } = useFirebase();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      role: "customer",
      cpf: "",
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  })

  const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    form.setValue('cpf', value, { shouldValidate: true });
  }, [form]);

   const handleCepChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    form.setValue('cep', value, { shouldValidate: true });

    if (value.length === 9) { // CEP is complete
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value.replace('-', '')}/json/`);
        const data = await res.json();
        if (!data.erro) {
          form.setValue('street', data.logradouro);
          form.setValue('neighborhood', data.bairro);
          form.setValue('city', data.localidade);
          form.setValue('state', data.uf);
          toast({ title: "Address found!" });
        } else {
          toast({ variant: 'destructive', title: "CEP not found." });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: "Error fetching CEP." });
      }
    }
  }, [form, toast]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!app || !firestore) return;
    setIsSubmitting(true);

    const auth = getAuth(app);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: values.displayName,
      });

      await sendEmailVerification(user);

      const userProfileData: UserProfile = {
        uid: user.uid,
        email: values.email,
        displayName: values.displayName,
        role: values.role,
        photoURL: user.photoURL || '',
        cpf: values.cpf.replace(/\D/g, ""), // Save CPF without formatting
        cep: values.cep,
        street: values.street,
        number: values.number,
        neighborhood: values.neighborhood,
        city: values.city,
        state: values.state,
      };
      
      const userDocRef = doc(firestore, "users", user.uid);
      
      setDoc(userDocRef, userProfileData).catch(e => {
         const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}`,
          operation: 'create',
          requestResourceData: userProfileData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e;
      });

      toast({
        title: "Verification Required",
        description: "A verification email has been sent. Please check your inbox.",
      });
      setIsVerificationSent(true);

    } catch (error: any) {
      if (error.code === 'permission-denied') return; // Handled by emitter

      let description = "An unknown error occurred.";
      if (error.code === 'auth/email-already-in-use') {
          description = "This email address is already in use.";
      }
      toast({
          variant: "destructive",
          title: "Failed to create account",
          description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isVerificationSent) {
    return (
      <div className="text-center space-y-4">
        <Send className="mx-auto h-12 w-12 text-primary" />
        <h3 className="text-xl font-semibold">Verify Your Email</h3>
        <p className="text-muted-foreground">
          We've sent a verification link to <span className="font-bold">{form.getValues('email')}</span>. 
          Please click the link to activate your account.
        </p>
        <Button onClick={() => router.push('/login')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>I am a...</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                  disabled={isSubmitting}
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="customer" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-2"><UserCircle className="w-4 h-4" /> Customer</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="owner" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-2"><Briefcase className="w-4 h-4" /> Tent Owner</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="Your full name" {...field} className="pl-10" disabled={isSubmitting} />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="your@email.com" {...field} className="pl-10" disabled={isSubmitting} />
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
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isSubmitting} />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
                <FormItem>
                <FormLabel>CPF</FormLabel>
                <FormControl>
                    <Input {...field} onChange={handleCpfChange} placeholder="000.000.000-00" disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

        <FormField
            control={form.control}
            name="cep"
            render={({ field }) => (
                <FormItem>
                <FormLabel>CEP / Postal Code</FormLabel>
                <FormControl>
                    <Input {...field} onChange={handleCepChange} placeholder="00000-000" disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />

        <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
                <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Street</FormLabel>
                        <FormControl>
                            <Input {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div>
                 <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Number</FormLabel>
                        <FormControl>
                            <Input {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
         <FormField
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Neighborhood</FormLabel>
                <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
                 <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                            <Input {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div>
                 <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                            <Input {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
           {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Account'}
        </Button>
      </form>
    </Form>
  )
}
