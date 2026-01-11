'use client';

import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useRef } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Camera } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf), { message: "O CPF deve ter 11 dígitos." }),
  address: z.string().min(5, 'O endereço é obrigatório.'),
  photoURL: z.string().url('Por favor, insira uma URL válida.').or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, loading, refresh } = useUser();
  const { app, db } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ProfileFormData>();

  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || '',
        cpf: user.cpf || '',
        address: user.address || '',
        photoURL: user.photoURL || '',
      });
      if(user.photoURL) {
        setSelfie(user.photoURL);
      }
    }
  }, [user, reset]);
  
   useEffect(() => {
    const getCameraPermission = async () => {
      if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        setHasCameraPermission(false);
        console.error("Media devices not supported");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true});
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Acesso à Câmera Negado',
          description: 'Por favor, habilite as permissões de câmera nas configurações do seu navegador.',
        });
      }
    };

    getCameraPermission();
    
    // Cleanup function
    return () => {
        if(videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, []);

  const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = value;
    return e;
  }, []);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
  const takeSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if(context){
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setSelfie(dataUrl);
        setValue('photoURL', dataUrl);
      }
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !app || !db) return;
    setIsSubmitting(true);

    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);

    const finalPhotoURL = selfie || data.photoURL;

    try {
      if (currentUser) {
        // Update Firebase Auth profile
        await updateProfile(currentUser, {
          displayName: data.displayName,
          photoURL: finalPhotoURL,
        });
      }

      // Update Firestore document
      const firestoreData = {
        displayName: data.displayName,
        address: data.address,
        cpf: data.cpf.replace(/\D/g, ""),
        photoURL: finalPhotoURL,
      };
      
      updateDoc(userDocRef, firestoreData).catch(err => {
         const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: firestoreData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });

      toast({
        title: 'Perfil Atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
      
      // Refresh user data in the context
      if(refresh) refresh();

    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar perfil',
        description: 'Não foi possível salvar suas alterações. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p>Por favor, faça login para ver suas configurações.</p>;
  }

  return (
    <div className="w-full max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Conta</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua conta.</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
            <CardDescription>
              Estas são as informações associadas à sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-4">
              <Label>Foto de Perfil</Label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-40 h-40">
                  {selfie ? (
                     <Avatar className="h-40 w-40 border-4 border-primary">
                        <AvatarImage src={selfie} alt="Sua selfie" />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-40 h-40 bg-muted rounded-full flex items-center justify-center">
                       <UserIcon className="w-20 h-20 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-4">
                   <div className="w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      <canvas ref={canvasRef} className="hidden" />
                      {hasCameraPermission === false && (
                          <div className='text-center p-4'>
                            <Camera className="w-8 h-8 mx-auto text-muted-foreground"/>
                            <p className="text-sm text-muted-foreground mt-2">A câmera não está disponível ou a permissão foi negada.</p>
                          </div>
                      )}
                  </div>
                   <Button type="button" onClick={takeSelfie} disabled={hasCameraPermission !== true || isSubmitting} className="w-full">
                      <Camera className="mr-2 h-4 w-4"/>
                      {selfie ? 'Tirar Outra Selfie' : 'Tirar Selfie'}
                  </Button>
                </div>
              </div>
                {hasCameraPermission === false && (
                    <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Acesso à Câmera Necessário</AlertTitle>
                    <AlertDescription>
                        Por favor, permita o acesso à câmera para tirar uma selfie. Você pode precisar recarregar a página após conceder a permissão.
                    </AlertDescription>
                    </Alert>
                )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome Completo</Label>
              <Input id="displayName" {...register('displayName')} disabled={isSubmitting} />
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email || ''} readOnly disabled />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" {...register('cpf', { onChange: handleCpfChange })} disabled={isSubmitting} maxLength={14} />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" {...register('address')} disabled={isSubmitting} />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Conta</Label>
              <Input id="role" value={user.role === 'owner' ? 'Dono de Barraca' : 'Cliente'} readOnly disabled />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
