
'use client';

import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Camera, UserCircle } from 'lucide-react';
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf), { message: "O CPF deve ter 11 dígitos." }),
  address: z.string().min(5, 'O endereço é obrigatório.'),
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

  useEffect(() => {
    return () => {
      // Cleanup: Stop video stream when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          variant: 'destructive',
          title: 'Câmera não suportada',
          description: 'Seu navegador não suporta acesso à câmera.',
        });
        setHasCameraPermission(false);
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
          title: 'Acesso à câmera negado',
          description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
        });
      }
    };


  const takeSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if(context) {
          context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          const dataUrl = canvas.toDataURL('image/png');
          setSelfie(dataUrl);

          // Stop the camera stream
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          video.srcObject = null;
          setHasCameraPermission(null);
      }
    }
  };


  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
          displayName: user?.displayName || '',
          cpf: user?.cpf || '',
          address: user?.address || ''
      }
  });

  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || '',
        cpf: user.cpf || '',
        address: user.address || '',
      });
      if (user.photoURL) {
        setSelfie(user.photoURL);
      }
    }
  }, [user, reset]);

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

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !app || !db) return;
    setIsSubmitting(true);

    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    
    try {
        const firestoreData: {[key: string]: any} = {
            displayName: data.displayName,
            address: data.address,
            cpf: data.cpf.replace(/\D/g, ""),
        };
        
        if (selfie && selfie !== user.photoURL) {
            firestoreData.photoURL = selfie;
        }

        if (currentUser) {
            await updateProfile(currentUser, {
                displayName: data.displayName,
                ...(selfie && { photoURL: selfie }),
            });
        }
      
      const userDocRef = doc(db, "users", user.uid);
      
      updateDoc(userDocRef, firestoreData).catch(async (serverError) => {
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

      if(refresh) refresh();

    } catch(error: any) {
      console.error("Error updating profile:", error);
      if (!(error instanceof FirestorePermissionError)) {
         toast({
            variant: 'destructive',
            title: 'Erro ao atualizar perfil',
            description: error.message || 'Não foi possível salvar suas alterações.',
        });
      }
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
    <div className="w-full max-w-2xl space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Conta</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua conta e foto de perfil.</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
             <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={selfie ?? user.photoURL ?? ''} alt={user.displayName ?? ''} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <CardTitle>Meu Perfil</CardTitle>
                    <CardDescription>
                      Estas são as informações associadas à sua conta.
                    </CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-2">
                <Label>Foto de Perfil</Label>
                <div className='flex flex-col gap-4 items-center'>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  {hasCameraPermission === true && <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted />}
                  {hasCameraPermission === false && (
                     <Alert variant="destructive">
                      <AlertTitle>Câmera necessária</AlertTitle>
                      <AlertDescription>
                        Por favor, permita o acesso à câmera para tirar uma selfie.
                      </AlertDescription>
                    </Alert>
                  )}
                  {hasCameraPermission === true ? (
                     <Button type="button" onClick={takeSelfie}><Camera className="mr-2"/>Tirar Selfie</Button>
                  ) : (
                     <Button type="button" onClick={getCameraPermission}><UserCircle className="mr-2"/>Atualizar Foto de Perfil</Button>
                  )}
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nome Completo</Label>
              <Input id="displayName" {...register('displayName')} disabled={isSubmitting}/>
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email || ''} disabled readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                {...register('cpf', {
                  onChange: handleCpfChange
                })}
                placeholder="000.000.000-00"
                maxLength={14}
                disabled={isSubmitting}
              />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" {...register('address')} disabled={isSubmitting} />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
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
