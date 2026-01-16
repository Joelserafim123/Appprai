
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
import { User, Mail, Briefcase, UserCircle, Loader2, Lock } from "lucide-react"
import { getAuth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { useFirebase } from "@/firebase/provider"
import { useRouter } from "next/navigation"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { useState, useCallback } from "react"
import type { UserProfile } from "@/lib/types"


const formSchema = z.object({
  displayName: z.string().min(2, { message: "O nome completo deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um endereço de e-mail válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  confirmPassword: z.string(),
  role: z.enum(["customer", "owner"], { required_error: "Você deve selecionar uma função." }),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf), { message: "O CPF deve ter 11 dígitos e é obrigatório." }),
  cep: z.string().refine(value => /^\d{5}-?\d{3}$/.test(value), 'CEP inválido.'),
  street: z.string().min(1, 'A rua é obrigatória.'),
  number: z.string().min(1, 'O número é obrigatório.'),
  neighborhood: z.string().min(1, 'O bairro é obrigatório.'),
  city: z.string().min(1, 'A cidade é obrigatória.'),
  state: z.string().min(1, 'O estado é obrigatório.'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof formSchema>;


export function SignUpForm() {
  const { toast } = useToast()
  const { firebaseApp: app, firestore } = useFirebase();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<SignUpFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
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

  const { setValue } = form;

  const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setValue('cpf', value, { shouldValidate: true });
  }, [setValue]);

   const handleCepChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    setValue('cep', value, { shouldValidate: true });

    if (value.length === 9) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value.replace('-', '')}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setValue('street', data.logradouro, { shouldValidate: true });
          setValue('neighborhood', data.bairro, { shouldValidate: true });
          setValue('city', data.localidade, { shouldValidate: true });
          setValue('state', data.uf, { shouldValidate: true });
          toast({ title: "Endereço encontrado!" });
        } else {
          toast({ variant: 'destructive', title: "CEP não encontrado." });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: "Erro ao buscar CEP." });
      }
    }
  }, [setValue, toast]);

  async function onSubmit(values: SignUpFormData) {
    if (!app || !firestore) return;
    setIsSubmitting(true);

    try {
      const auth = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Update auth profile
      await updateProfile(user, { displayName: values.displayName });

      // Create firestore document
      const userProfileData: UserProfile & { profileComplete: boolean } = {
          uid: user.uid,
          email: values.email,
          displayName: values.displayName,
          role: values.role,
          cpf: values.cpf.replace(/\D/g, ''),
          cep: values.cep,
          street: values.street,
          number: values.number,
          neighborhood: values.neighborhood,
          city: values.city,
          state: values.state,
          profileComplete: true, // All data collected at once
      };
      
      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, userProfileData).catch(e => {
          const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}`,
          operation: 'create',
          requestResourceData: userProfileData,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw e;
      });

      // Send verification email
      await sendEmailVerification(user);

      toast({
        title: "Conta criada com sucesso!",
        description: "Enviámos um link de verificação para o seu e-mail. Por favor, verifique a sua caixa de entrada.",
      });
      router.push('/verify-email');

    } catch (error: any) {
       let description = "Ocorreu um erro ao tentar criar a sua conta.";
       if (error.code === 'auth/email-already-in-use') {
         description = "Este endereço de e-mail já está a ser utilizado por outra conta.";
       }
      toast({
          variant: "destructive",
          title: "Falha ao criar conta",
          description: description,
      });
    } finally {
      setIsSubmitting(false);
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
                  disabled={isSubmitting}
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

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="Seu nome completo" {...field} className="pl-10" disabled={isSubmitting} />
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
                  <Input placeholder="seu@email.com" {...field} className="pl-10" disabled={isSubmitting} />
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
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input type="password" placeholder="Crie uma senha" {...field} className="pl-10" disabled={isSubmitting} />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar Senha</FormLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input type="password" placeholder="Confirme sua senha" {...field} className="pl-10" disabled={isSubmitting} />
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
                        <Input
                            {...field}
                            onChange={handleCpfChange}
                            placeholder="000.000.000-00"
                            disabled={isSubmitting}
                        />
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
                  <FormLabel>CEP</FormLabel>
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
                        <FormLabel>Rua</FormLabel>
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
                        <FormLabel>Número</FormLabel>
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
                  <FormLabel>Bairro</FormLabel>
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
                        <FormLabel>Cidade</FormLabel>
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
                        <FormLabel>Estado</FormLabel>
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
           {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
        </Button>
      </form>
    </Form>
  )
}
