'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, doc, addDoc, updateDoc, deleteDoc, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Armchair, Plus, Trash, Edit } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { useMemoFirebase } from '@/firebase/provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RentalItem = {
  id: string;
  name: 'Kit Guarda-sol + 2 Cadeiras' | 'Cadeira Adicional';
  price: number;
  quantity: number;
};

const rentalItemSchema = z.object({
  name: z.enum(['Kit Guarda-sol + 2 Cadeiras', 'Cadeira Adicional'], { required_error: 'O nome é obrigatório.' }),
  price: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(0, 'O preço deve ser positivo.')),
  quantity: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(0, 'A quantidade deve ser positiva.')),
});

type RentalItemFormData = z.infer<typeof rentalItemSchema>;

function RentalItemForm({ tentId, item, onFinished, hasKit }: { tentId: string, item?: RentalItem, onFinished: () => void, hasKit: boolean }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, control, formState: { errors } } = useForm<RentalItemFormData>({
    resolver: zodResolver(rentalItemSchema),
    defaultValues: item || { name: hasKit ? 'Cadeira Adicional' : 'Kit Guarda-sol + 2 Cadeiras', price: 0, quantity: 1 },
  });

  const onSubmit = async (data: RentalItemFormData) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    const operation = item ? 'update' : 'create';
    const collectionRef = collection(firestore, 'tents', tentId, 'rentalItems');
    const docRef = item ? doc(collectionRef, item.id) : doc(collectionRef);

    const batch = writeBatch(firestore);
    const tentRef = doc(firestore, 'tents', tentId);
    
    if (data.name === 'Kit Guarda-sol + 2 Cadeiras') {
        batch.update(tentRef, { hasAvailableKits: data.quantity > 0 });
    }

    if (item) {
        batch.update(docRef, data);
    } else {
        batch.set(docRef, data);
    }
    
    batch.commit().then(() => {
        toast({ title: `Item de aluguel ${item ? 'atualizado' : 'adicionado'} com sucesso!` });
        onFinished();
    }).catch (e => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: operation,
            requestResourceData: data,
        }));
        throw e;
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Item</Label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!item}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Kit Guarda-sol + 2 Cadeiras" disabled={hasKit && !item}>Kit Guarda-sol + 2 Cadeiras</SelectItem>
                <SelectItem value="Cadeira Adicional">Cadeira Adicional</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
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
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [hasTent, setHasTent] = useState<boolean | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | undefined>(undefined);

  useEffect(() => {
    if (firestore && user && user.role === 'owner') {
      const tentRef = doc(firestore, 'tents', user.uid);
      getDoc(tentRef)
        .then(tentSnap => {
            setHasTent(tentSnap.exists());
        })
        .catch(error => {
            const permissionError = new FirestorePermissionError({
                path: tentRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
            setHasTent(false);
        });
    } else {
        setHasTent(false);
    }
  }, [firestore, user]);

  const rentalsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !hasTent) return null;
    return collection(firestore, 'tents', user.uid, 'rentalItems');
  }, [firestore, user, hasTent]);

  const { data: rentalItems, isLoading: rentalsLoading, error } = useCollection<RentalItem>(rentalsQuery);
  
  const deleteItem = async (itemToDelete: RentalItem) => {
    if (!firestore || !user) return;
    if (!confirm('Tem certeza que deseja apagar este item?')) return;
    
    const docRef = doc(firestore, 'tents', user.uid, 'rentalItems', itemToDelete.id);
    
    const batch = writeBatch(firestore);
    batch.delete(docRef);

    if (itemToDelete.name === 'Kit Guarda-sol + 2 Cadeiras') {
        const tentRef = doc(firestore, 'tents', user.uid);
        batch.update(tentRef, { hasAvailableKits: false });
    }
    
    batch.commit().then(() => {
        toast({ title: 'Item apagado com sucesso!' });
    }).catch (e => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e;
    });
  }

  const openEditForm = (item: RentalItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }

  const openNewForm = () => {
    setEditingItem(undefined);
    setIsFormOpen(true);
  }

  const hasKit = useMemo(() => rentalItems?.some(item => item.name === 'Kit Guarda-sol + 2 Cadeiras'), [rentalItems]);
  const hasAdditionalChair = useMemo(() => rentalItems?.some(item => item.name === 'Cadeira Adicional'), [rentalItems]);

  if (isUserLoading || hasTent === null) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return <p>Acesso negado.</p>;
  }

  if (hasTent === false) {
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
            <Button onClick={openNewForm} disabled={!!(hasKit && hasAdditionalChair)}>
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
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteItem(item)}>
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
                <p className="mt-2 text-sm text-muted-foreground">Comece adicionando o "Kit Guarda-sol + 2 Cadeiras".</p>
                <Button onClick={openNewForm} className="mt-6">
                    Adicionar Item de Aluguel
                </Button>
            </div>
        )}
        </div>
        {user && hasTent && 
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
              </DialogHeader>
              <RentalItemForm tentId={user.uid} item={editingItem} onFinished={() => setIsFormOpen(false)} hasKit={!!hasKit} />
          </DialogContent>
        }
    </Dialog>
  );
}
