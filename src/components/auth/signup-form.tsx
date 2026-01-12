
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
import { User, Mail, KeyRound, Home, Briefcase, UserCircle, Loader2 } from "lucide-react"
import { getAuth, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore"
import { useFirebase } from "@/firebase/provider"
import { useRouter, useSearchParams } from "next/navigation"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { useState, useCallback } from "react"
import { Separator } from "../ui/separator"

const formSchema = z.object({
  fullName: z.string().min(2, { message: "O nome completo deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um endereço de e-mail válido." }),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf), { message: "O CPF deve ter 11 dígitos." }),
  address: z.string().min(5, { message: "Por favor, insira um endereço válido." }),
  password: z.string().min(8, { message: "A senha deve ter pelo menos 8 caracteres." }),
  role: z.enum(["customer", "owner"], { required_error: "Você precisa selecionar um papel." }),
})

export function SignUpForm() {
  const { toast } = useToast()
  const { firebaseApp: app, firestore } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      cpf: "",
      address: "",
      password: "",
      role: "customer"
    },
  })

  const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = value;
    return e;
  }, []);

  const handleAuthSuccess = (redirectUrl?: string) => {
      toast({
        title: "Login bem-sucedido",
        description: "Redirecionando...",
      })
      const finalRedirect = redirectUrl || searchParams.get('redirect') || '/dashboard';
      router.push(finalRedirect);
      router.refresh();
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!app || !firestore) return;
    setIsSubmitting(true);

    const auth = getAuth(app);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: values.fullName,
        photoURL: "", // Initialize with empty string
      });

      const userProfileData = {
        uid: user.uid,
        email: values.email,
        displayName: values.fullName,
        cpf: values.cpf.replace(/\D/g, ""),
        address: values.address,
        role: values.role,
        photoURL: "",
        createdAt: serverTimestamp(),
      };

      const userDocRef = doc(firestore, "users", user.uid);
      
      await setDoc(userDocRef, userProfileData);

      toast({
        title: "Conta criada!",
        description: "Bem-vindo ao BeachPal. Redirecionando...",
      })
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Error creating account:", error);
      if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
        // This case is handled by the FirestorePermissionError and the global listener
        const permissionError = new FirestorePermissionError({
          path: `users/${getAuth(app).currentUser?.uid}`, // Approximate path
          operation: 'create',
          requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        let description = "Ocorreu um erro desconhecido.";
        if (error.code === 'auth/email-already-in-use') {
            description = "Este endereço de e-mail já está em uso.";
        }
        toast({
            variant: "destructive",
            title: "Falha ao criar conta",
            description,
        })
      }
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleGoogleSignIn = async () => {
    if (!app || !firestore) return;
    setIsGoogleSubmitting(true);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
          role: form.getValues('role') || 'customer',
          cpf: '',
          address: '',
        };
        await setDoc(userDocRef, newUserProfile);
        handleAuthSuccess('/dashboard/settings'); 
      } else {
        const userData = userDoc.data();
        if (!userData.cpf || !userData.address) {
            handleAuthSuccess('/dashboard/settings');
        } else {
            handleAuthSuccess();
        }
      }

    } catch (error: any) {
      console.error("Google sign in error", error);
      let description = "Não foi possível fazer login com o Google.";
      if (error.code === 'auth/popup-closed-by-user') {
        description = "A janela de login do Google foi fechada.";
      }
       if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: `users/${getAuth(app).currentUser?.uid}`,
          operation: 'create',
          requestResourceData: { email: getAuth(app).currentUser?.email },
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
            variant: "destructive",
            title: "Falha no login com Google",
            description,
        })
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Eu sou...</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                  disabled={isSubmitting || isGoogleSubmitting}
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="customer" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-2"><UserCircle className="w-4 h-4" /> Cliente</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="owner" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center gap-2"><Briefcase className="w-4 h-4" /> Dono de Barraca</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Inscreva-se com
            </span>
          </div>
        </div>

         <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting || isGoogleSubmitting}>
           {isGoogleSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           ) : (
            <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.62-3.8 1.62-2.97 0-5.4-2.44-5.4-5.4s2.43-5.4 5.4-5.4c1.35 0 2.64.52 3.58 1.44l2.15-2.15C17.2.73 15.23 0 12.48 0 5.88 0 .5 5.38.5 12s5.38 12 11.98 12c3.13 0 5.64-1.04 7.52-2.9s2.96-4.5 2.96-8.08c0-.6-.05-1.18-.15-1.72H12.48z"></path></svg>
           )}
          Inscrever-se com Google
        </Button>

         <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou com seu e-mail
            </span>
          </div>
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="Seu nome completo" {...field} className="pl-10" disabled={isSubmitting || isGoogleSubmitting} />
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
                  <Input placeholder="seu@email.com" {...field} className="pl-10" disabled={isSubmitting || isGoogleSubmitting} />
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
               <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                    <Input 
                    placeholder="000.000.000-00" 
                    {...field} 
                    onChange={(e) => field.onChange(handleCpfChange(e))}
                    maxLength={14}
                    disabled={isSubmitting || isGoogleSubmitting} 
                    className="pl-10"
                    />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
               <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="Sua rua, número, cidade" {...field} className="pl-10" disabled={isSubmitting || isGoogleSubmitting} />
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
              <FormLabel>Senha</FormLabel>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isSubmitting || isGoogleSubmitting} />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting || isGoogleSubmitting}>
           {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
        </Button>
      </form>
    </Form>
  )
}
