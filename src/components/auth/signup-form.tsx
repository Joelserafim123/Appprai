"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useFirebase } from "@/firebase"
import { getAuth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import type { UserProfile } from "@/lib/types"
import { FirestorePermissionError } from "@/firebase/errors"
import { errorEmitter } from "@/firebase/error-emitter"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FirebaseError } from "firebase/app"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


const signupSchema = z.object({
  displayName: z.string().min(3, "O nome completo é obrigatório."),
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  role: z.enum(['customer', 'owner'], { required_error: "Você deve escolher um tipo de conta." }),
})

type SignupFormValues = z.infer<typeof signupSchema>

export function SignUpForm() {
  const { firestore, auth } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [pendingData, setPendingData] = useState<SignupFormValues | null>(null);

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

  const processForm = (data: SignupFormValues) => {
    setPendingData(data);
  };
  
  const handleConfirmSubmit = async () => {
    if (!pendingData || !auth || !firestore) return;
    setIsLoading(true)
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, pendingData.email, pendingData.password)
      const user = userCredential.user

      await sendEmailVerification(user);

      await updateProfile(user, {
          displayName: pendingData.displayName,
      });
      
      const userDocRef = doc(firestore, 'users', user.uid);
      const userProfileData: Omit<UserProfile, 'cpf' | 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state'> = {
            uid: user.uid,
            email: user.email!,
            displayName: pendingData.displayName,
            role: pendingData.role,
            profileComplete: false,
      };

      await setDoc(userDocRef, userProfileData);

      toast({
        title: "Conta criada com sucesso!",
        description: "Enviámos um email de verificação. Por favor, verifique a sua caixa de entrada.",
      })
      router.push("/verify-email-notice")
    } catch (error: unknown) {
      let description = "Ocorreu um erro. Por favor, tente novamente."
      if (error instanceof FirestorePermissionError) {
        // Error is handled globally by the listener
        return;
      }
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/email-already-in-use') {
          description = "Este email já está em uso. Tente fazer login ou use um email diferente."
        }
      }
       
      toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description,
      })
    } finally {
      setIsLoading(false)
      setPendingData(null);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(processForm)} className="space-y-4">
          <div className="space-y-2">
              <Label htmlFor="displayName">Nome Completo</Label>
              <Input id="displayName" type="text" placeholder="Seu Nome Completo" {...register("displayName")} />
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
          </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} />
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
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="customer" id="customer" disabled={isLoading || !!pendingData} />
                  <Label htmlFor="customer" className="font-normal">Quero alugar e pedir</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="owner" id="owner" disabled={isLoading || !!pendingData} />
                  <Label htmlFor="owner" className="font-normal">Sou dono de barraca</Label>
                </div>
              </RadioGroup>
            )}
          />
          {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Cadastrar com Email
        </Button>
      </form>
       <AlertDialog open={!!pendingData} onOpenChange={(open) => !open && setPendingData(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Tipo de Conta</AlertDialogTitle>
                <AlertDialogDescription>
                    Você selecionou o tipo de conta: <span className="font-bold">{pendingData?.role === 'owner' ? 'Dono de Barraca' : 'Cliente'}</span>.
                    <br />
                    Esta escolha não poderá ser alterada futuramente. Deseja continuar?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmSubmit} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar e Criar Conta"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
