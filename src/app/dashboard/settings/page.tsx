
'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useRef } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { v4 as uuidv4 } from 'uuid';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  displayName: z.string().min(2, 'O nome completo é obrigatório.'),
  cpf: z.string().refine((cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf), { message: "O CPF deve ter 11 dígitos." }),
  address: z.string().min(5, 'O endereço é obrigatório.'),
  storagePath: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;


export default function SettingsPage() {
  const { user, isUserLoading: loading, refresh } = useUser();
  const { firebaseApp, firestore: db, storage } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);


  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ProfileFormData>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
          displayName: user?.displayName || '',
          cpf: user?.cpf || '',
          address: user?.address || '',
          storagePath: user?.storagePath || '',
      }
  });

  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || '',
        cpf: user.cpf || '',
        address: user.address || '',
        storagePath: user.storagePath || '',
      });
       setPhotoPreview(user.photoURL);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !firebaseApp || !db || !storage) return;
    setIsSubmitting(true);

    const auth = getAuth(firebaseApp);
    const currentUser = auth.currentUser;
    
    try {
        let photoURL = user.photoURL; // Start with the existing URL
        let newStoragePath = data.storagePath;

        // 1. If a new photo is selected, upload it to Storage
        if (newPhotoFile) {
            // Optional: Delete old photo from storage if it exists
            if (user.storagePath) {
                const oldPhotoRef = storageRef(storage, user.storagePath);
                try {
                    await deleteObject(oldPhotoRef);
                } catch (e:any) {
                    // Ignore if old photo doesn't exist, log other errors
                    if(e.code !== 'storage/object-not-found') console.error("Could not delete old photo:", e)
                }
            }

            const fileExtension = newPhotoFile.name.split('.').pop();
            const fileName = `${uuidv4()}.${fileExtension}`;
            newStoragePath = `user-profiles/${user.uid}/${fileName}`;
            const newPhotoRef = storageRef(storage, newStoragePath);
            
            await uploadBytes(newPhotoRef, newPhotoFile);
            photoURL = await getDownloadURL(newPhotoRef);
            setValue('storagePath', newStoragePath); // Save new path
        }
        
        // 2. Prepare data for Firestore
        const firestoreData: {[key: string]: any} = {
            displayName: data.displayName,
            address: data.address,
            cpf: data.cpf.replace(/\D/g, ""),
            photoURL: photoURL,
            storagePath: newStoragePath,
        };

        const authProfileUpdate: { displayName?: string, photoURL?: string } = {
            displayName: data.displayName,
            photoURL: photoURL,
        };
        
        // 3. Update Auth Profile
        if (currentUser) {
            await updateProfile(currentUser, authProfileUpdate);
        }
      
      // 4. Update Firestore Document
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, firestoreData);
      
      toast({
        title: 'Perfil Atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });

      setNewPhotoFile(null); // Reset file state
      refresh(); // Use the refresh function from the hook to get all new data

    } catch(error: any) {
      console.error("Error updating profile:", error);
       const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}`,
          operation: 'update',
          requestResourceData: {
              displayName: data.displayName,
          },
        });
        errorEmitter.emit('permission-error', permissionError);
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
             <div className="flex items-center gap-6">
                
                <div className="relative group">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={photoPreview ?? undefined} alt={user.displayName ?? ''} />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                     <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        className={cn(
                          "absolute inset-0 bg-black/50 flex items-center justify-center rounded-full text-white",
                          "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                        )}
                        aria-label="Alterar foto de perfil"
                    >
                       <Camera className="w-8 h-8" />
                    </button>
                    <Input
                        id="profile-picture"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg"
                        disabled={isSubmitting}
                    />
                </div>

                <div className="space-y-1">
                    <CardTitle>Meu Perfil</CardTitle>
                    <CardDescription>
                      Estas são as informações associadas à sua conta.
                    </CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
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
