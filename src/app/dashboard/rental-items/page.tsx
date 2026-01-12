

'use client';

import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Armchair, Plus, Trash, Edit } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

type RentalItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

const rentalItemSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  price: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(0, 'O preço deve ser positivo.')),
  quantity: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(0, 'A quantidade deve ser positiva.')),
});

type RentalItemFormData = z.infer<typeof rentalItemSchema>;

function RentalItemForm({ tentId, item, onFinished }: { tentId: string, item?: RentalItem, onFinished: () => void }) {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RentalItemFormData>({
    resolver: zodResolver(rentalItemSchema),
    defaultValues: item || { name: '', price: 0, quantity: 1 },
  });

  const onSubmit = async (data: RentalItemFormData) => {
    if (!db) return;
    setIsSubmitting(true);
    
    const collectionRef = collection(db, 'tents', tentId, 'rentalItems');
    
    try {
      if (item) {
        const docRef = doc(db, 'tents', tentId, 'rentalItems', item.id);
        await updateDoc(docRef, data);
        toast({ title: "Item de aluguel atualizado com sucesso!" });
      } else {
        await addDoc(collectionRef, data);
        toast({ title: "Item de aluguel adicionado com sucesso!" });
      }
      onFinished();
    } catch (e: any) {
        const permissionError = new FirestorePermissionError({
            path: item ? `tents/${tentId}/rentalItems/${item.id}` : `tents/${tentId}/rentalItems`,
            operation: item ? 'update' : 'create',
            requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: "Erro ao salvar item de aluguel." });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Item</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="price">Preço Diário (R$)</Label>
        <Input id="price" type="number" step="0.01" {...register('price')} />
        {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
      </div>
       <div>
        <Label htmlFor="quantity">Quantidade Disponível</Label>
        <Input id="quantity" type="number" step="1" {...register('quantity')} />
        {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
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

export default function RentalItemsPage() {
  const { user, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [tentId, setTentId] = useState<string | null>(null);
  const [loadingTent, setLoadingTent] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | undefined>(undefined);

  useEffect(() => {
    if (db && user) {
      setLoadingTent(true);
      const getTentId = async () => {
        const tentsRef = collection(db, 'tents');
        const q = query(tentsRef, where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setTentId(querySnapshot.docs[0].id);
        }
        setLoadingTent(false);
      };
      getTentId();
    } else if (!userLoading) {
        setLoadingTent(false);
    }
  }, [db, user, userLoading]);

  const rentalsQuery = useMemo(() => {
    if (!db || !tentId) return null;
    return collection(db, 'tents', tentId, 'rentalItems');
  }, [db, tentId]);

  const { data: rentalItems, loading: rentalsLoading, error } = useCollection<RentalItem>(rentalsQuery);
  
  const deleteItem = async (itemId: string) => {
    if (!db || !tentId) return;
    if (!confirm('Tem certeza que deseja apagar este item?')) return;
    
    const docRef = doc(db, 'tents', tentId, 'rentalItems', itemId);
    try {
        await deleteDoc(docRef);
        toast({ title: 'Item apagado com sucesso!' });
    } catch(e) {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao apagar item.' });
    }
  }

  const openEditForm = (item: RentalItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }

  const openNewForm = () => {
    setEditingItem(undefined);
    setIsFormOpen(true);
  }


  if (userLoading || loadingTent) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return <p>Acesso negado.</p>;
  }

  if (!tentId && !loadingTent) {
      return (
          <div className="text-center py-16 border-2 border-dashed rounded-lg max-w-lg mx-auto">
              <Armchair className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Cadastre sua barraca primeiro</h3>
              <p className="mt-2 text-sm text-muted-foreground">Você precisa de uma barraca para gerenciar seus itens de aluguel.</p>
              <Button asChild className="mt-6">
                  <Link href="/dashboard/my-tent">Ir para Minha Barraca</Link>
              </Button>
          </div>
      )
  }
  
  if (rentalsLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
      return <p className='text-destructive'>Erro ao carregar itens de aluguel: {error.message}</p>
  }

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="w-full max-w-4xl">
        <header className="mb-8 flex justify-between items-center">
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Itens de Aluguel</h1>
            <p className="text-muted-foreground">Gerencie cadeiras, guarda-sóis e outros itens.</p>
            </div>
            <Button onClick={openNewForm}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
            </Button>
        </header>

        {rentalItems && rentalItems.length > 0 ? (
            <div className="space-y-4">
            {rentalItems.map((item) => (
                <Card key={item.id}>
                    <CardHeader className='flex-row justify-between items-center'>
                        <CardTitle>{item.name}</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditForm(item)}>
                                <Edit className='w-4 h-4'/>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteItem(item.id)}>
                                <Trash className='w-4 h-4' />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex justify-between items-end">
                         <div>
                            <p className='font-bold text-lg'>R$ {item.price.toFixed(2)} / dia</p>
                            <p className="text-sm text-muted-foreground">Quantidade: {item.quantity}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
            </div>
        ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <Armchair className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Nenhum item de aluguel cadastrado</h3>
                <p className="mt-2 text-sm text-muted-foreground">Comece adicionando seu primeiro item.</p>
                <Button onClick={openNewForm} className="mt-6">
                    Adicionar Item de Aluguel
                </Button>
            </div>
        )}
        </div>
        {tentId && 
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
              </DialogHeader>
              <RentalItemForm tentId={tentId} item={editingItem} onFinished={() => setIsFormOpen(false)} />
          </DialogContent>
        }
    </Dialog>
  );
}
