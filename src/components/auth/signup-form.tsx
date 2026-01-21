"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useFirebase } from "@/firebase"
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import type { UserProfile } from "@/lib/types"
import { FirestorePermissionError } from "@/firebase/errors"
import { errorEmitter } from "@/firebase/error-emitter"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"


const signupSchema = z.object({
  displayName: z.string().min(3, "O nome é obrigatório."),
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  role: z.enum(['customer', 'owner'], { required_error: "Você deve escolher um tipo de conta." }),
})

type SignupFormValues = z.infer<typeof signupSchema>

export function SignUpForm() {
  const { firebaseApp, firestore } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'customer',
    }
  })

  const onSubmit = async (data: SignupFormValues) => {
    if (!firebaseApp || !firestore) return
    setIsLoading(true)
    const auth = getAuth(firebaseApp)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password)
      const user = userCredential.user

      if (user) {
        await updateProfile(user, {
            displayName: data.displayName,
        });
      }
      
      const userDocRef = doc(firestore, 'users', user.uid);
      const userProfileData: Omit<UserProfile, 'cpf' | 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state' | 'photoURL'> = {
            uid: user.uid,
            email: user.email!,
            displayName: data.displayName,
            role: data.role,
            profileComplete: false,
      };

      await setDoc(userDocRef, userProfileData).catch(e => {
            const permissionError = new FirestorePermissionError({
                path: `users/${'user.uid'}`,
                operation: 'create',
                requestResourceData: userProfileData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw e;
        });

      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao BeachPal!",
      })
      router.push("/dashboard")
    } catch (error: any) {
      let description = "Ocorreu um erro. Por favor, tente novamente."
      if (error.code === 'auth/email-already-in-use') {
        description = "Este email já está em uso. Tente fazer login."
      }
       
      if (error.code !== 'permission-denied') {
        toast({
          variant: "destructive",
          title: "Erro no Cadastro",
          description,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="displayName">Nome Completo</Label>
            <Input id="displayName" type="text" placeholder="Seu Nome" {...register("displayName")} />
            {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
        </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="m@example.com" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

       <div className="space-y-2">
        <Label>Tipo de Conta</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="flex space-x-4 pt-2"
              disabled={isLoading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="customer" id="customer" />
                <Label htmlFor="customer" className="font-normal">Quero alugar e pedir</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="owner" id="owner" />
                <Label htmlFor="owner" className="font-normal">Sou dono de barraca</Label>
              </div>
            </RadioGroup>
          )}
        />
        {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Cadastrar
      </Button>
    </form>
  )
}
