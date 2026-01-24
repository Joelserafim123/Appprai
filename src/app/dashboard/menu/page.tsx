'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Utensils, Plus, Trash, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { MenuItem, Tent } from '@/lib/types';
import { collection, query, where, limit, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';


const menuItemSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'O preço deve ser positivo.'),
  category: z.enum(['Bebidas', 'Petiscos', 'Pratos Principais'], { required_error: 'A categoria é obrigatória.' }),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

function MenuItemForm({ tent, item, onFinished }: { tent: Tent; item?: MenuItem, onFinished: () => void }) {
  const { toast } = useToast();
  const { firestore: db } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
        name: '',
        description: '',
        price: 0,
        category: 'Petiscos'
    },
  });

  useEffect(() => {
      if (item) {
          reset(item);
      } else {
           reset({
                name: '',
                description: '',
                price: 0,
                category: 'Petiscos'
            });
      }
  }, [item, reset]);

  const onSubmit = (data: MenuItemFormData) => {
    if (!db) return;
    setIsSubmitting(true);

    const menuItemsCollectionRef = collection(db, 'tents', tent.id, 'menuItems');
    const promise = item
      ? updateDoc(doc(menuItemsCollectionRef, item.id), data)
      : addDoc(menuItemsCollectionRef, data);

    promise
      .then(() => {
        toast({ title: `Item ${item ? 'atualizado' : 'adicionado'} com sucesso!` });
        onFinished();
      })
      .catch((error) => {
        const isUpdate = !!item;
        const path = isUpdate && item
          ? doc(collection(db, 'tents', tent.id, 'menuItems'), item.id).path
          : collection(db, 'tents', tent.id, 'menuItems').path;

        const permissionError = new FirestorePermissionError({
          path,
          operation: isUpdate ? 'update' : 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Item</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...register('description')} />
      </div>
      <div>
        <Label htmlFor="price">Preço (R$)</Label>
        <Input id="price" type="number" step="0.01" {...register('price')} />
        {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
      </div>
      <div>
        <Label htmlFor="category">Categoria</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bebidas">Bebidas</SelectItem>
                <SelectItem value="Petiscos">Petiscos</SelectItem>
                <SelectItem value="Pratos Principais">Pratos Principais</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
      </div>
      <DialogFooter>
        <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function MenuPage() {
  const { user, isUserLoading } = useUser();
  const { firestore: db } = useFirebase();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const tentQuery = useMemoFirebase(
    () => (user && db) ? query(collection(db, 'tents'), where('ownerId', '==', user.uid), limit(1)) : null,
    [db, user]
  );
  const { data: tents, isLoading: tentLoading } = useCollection<Tent>(tentQuery);
  const tent = tents?.[0];

  const menuQuery = useMemoFirebase(
    () => (tent && db) ? collection(db, 'tents', tent.id, 'menuItems') : null,
    [db, tent]
  );
  const { data: menu, isLoading: menuLoading } = useCollection<MenuItem>(menuQuery);
  
  const handleConfirmDelete = () => {
    if (!tent || !db || !itemToDelete) return;
    setIsDeleting(true);
    const itemDocRef = doc(db, 'tents', tent.id, 'menuItems', itemToDelete.id);
    
    deleteDoc(itemDocRef)
        .then(() => {
            toast({ title: 'Item apagado com sucesso!' });
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: itemDocRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
          setItemToDelete(null);
          setIsDeleting(false);
        });
  }

  const handleFormFinished = () => {
    setIsFormOpen(false);
    setEditingItem(undefined);
  }

  const openEditForm = (item: MenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }

  const openNewForm = () => {
    setEditingItem(undefined);
    setIsFormOpen(true);
  }

  if (isUserLoading || tentLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return <p>Acesso negado.</p>;
  }
  
    if (!tent) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg max-w-lg mx-auto">
                <Utensils className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Cadastre sua barraca primeiro</h3>
                <p className="mt-2 text-sm text-muted-foreground">Você precisa de uma barraca para gerenciar um cardápio.</p>
                 <Button asChild className="mt-6">
                    <Link href="/dashboard/my-tent">Ir para Minha Barraca</Link>
                </Button>
            </div>
        );
    }
    
    if (menuLoading) {
         return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <div className="w-full max-w-4xl">
          <header className="mb-8 flex justify-between items-center">
              <div>
              <h1 className="text-3xl font-bold tracking-tight">Meu Cardápio</h1>
              <p className="text-muted-foreground">Adicione, edite ou remova itens do seu cardápio.</p>
              </div>
              <Button onClick={openNewForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Item
              </Button>
          </header>

          {menu && menu.length > 0 ? (
              <div className="space-y-4">
              {menu.map((item) => (
                  <Card key={item.id}>
                  <CardHeader className='flex-row justify-between items-start'>
                      <div>
                          <CardTitle>{item.name}</CardTitle>
                          <CardDescription>
                              {item.description}
                          </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditForm(item)}>
                              <Edit className='w-4 h-4'/>
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setItemToDelete(item)}>
                              <Trash className='w-4 h-4' />
                          </Button>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <div className="flex justify-between items-end">
                          <p className="text-sm font-semibold text-primary/80">{item.category}</p>
                          <p className='font-bold text-lg'>R$ {item.price.toFixed(2)}</p>
                      </div>
                  </CardContent>
                  </Card>
              ))}
              </div>
          ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <Utensils className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Seu cardápio está vazio</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Comece adicionando o primeiro item.</p>
                  <Button onClick={openNewForm} className="mt-6">
                      Adicionar Item ao Cardápio
                  </Button>
              </div>
          )}
          </div>
          {tent && (
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
                  </DialogHeader>
                  <MenuItemForm key={editingItem?.id || 'new'} tent={tent} item={editingItem} onFinished={handleFormFinished} />
              </DialogContent>
          )}
      </Dialog>
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá apagar permanentemente o item "{itemToDelete?.name}" do seu cardápio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="animate-spin" /> : "Sim, apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
