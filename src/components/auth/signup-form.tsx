
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
import { User, Mail, KeyRound, Briefcase, UserCircle, Loader2 } from "lucide-react"
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore"
import { useFirebase } from "@/firebase/provider"
import { useRouter } from "next/navigation"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { useState, useCallback } from "react"
import { UserProfile } from "@/lib/types"

const formSchema = z.object({
  fullName: z.string().min(2, { message: "O nome completo deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um endereço de e-mail válido." }),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf), { message: "O CPF deve ter 11 dígitos." }),
  cep: z.string().refine(value => /^\d{5}-?\d{3}$/.test(value), 'CEP inválido.'),
  street: z.string().min(1, 'A rua é obrigatória.'),
  number: z.string().min(1, 'O número é obrigatório.'),
  neighborhood: z.string().min(1, 'O bairro é obrigatório.'),
  city: z.string().min(1, 'A cidade é obrigatória.'),
  state: z.string().min(1, 'O estado é obrigatório.'),
  password: z.string().min(8, { message: "A senha deve ter pelo menos 8 caracteres." }),
  role: z.enum(["customer", "owner"], { required_error: "Você precisa selecionar um papel." }),
})

export function SignUpForm() {
  const { toast } = useToast()
  const { firebaseApp: app, firestore } = useFirebase();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      cpf: "",
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
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

  const handleCepChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5, 8);
    }
    form.setValue('cep', value);

    if (value.length === 9) { // CEP is complete
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value.replace('-', '')}/json/`);
        const data = await res.json();
        if (!data.erro) {
          form.setValue('street', data.logradouro);
          form.setValue('neighborhood', data.bairro);
          form.setValue('city', data.localidade);
          form.setValue('state', data.uf);
          toast({ title: "Endereço encontrado!" });
        } else {
          toast({ variant: 'destructive', title: "CEP não encontrado." });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: "Erro ao buscar CEP." });
      }
    }
  }, [form, toast]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!app || !firestore) return;
    setIsSubmitting(true);

    const auth = getAuth(app);
    
    try {
      // Check for unique CPF
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("cpf", "==", values.cpf.replace(/\D/g, "")));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Falha no cadastro",
          description: "O CPF informado já está em uso.",
        });
        setIsSubmitting(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: values.fullName,
        photoURL: '',
      });

      const userProfileData: UserProfile = {
        uid: user.uid,
        email: values.email,
        displayName: values.fullName,
        photoURL: '',
        cpf: values.cpf.replace(/\D/g, ""),
        role: values.role,
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
        title: "Conta criada!",
        description: "Bem-vindo ao BeachPal. Redirecionando...",
      })
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Error creating account:", error);
      if (error.code !== 'permission-denied') {
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
          name="fullName"
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
                    disabled={isSubmitting} 
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
          name="cep"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <Input {...field} onChange={handleCepChange} maxLength={9} placeholder="00000-000" disabled={isSubmitting} />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-3 gap-4">
            <FormField
            control={form.control}
            name="street"
            render={({ field }) => (
                <FormItem className="col-span-2">
                <FormLabel>Rua</FormLabel>
                <Input {...field} disabled={isSubmitting} />
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Número</FormLabel>
                <Input {...field} disabled={isSubmitting} />
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Bairro</FormLabel>
                <Input {...field} disabled={isSubmitting} />
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                    <FormItem className="col-span-2">
                    <FormLabel>Cidade</FormLabel>
                    <Input {...field} disabled={isSubmitting} />
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Input {...field} disabled={isSubmitting} />
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
           {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
        </Button>
      </form>
    </Form>
  )
}

    