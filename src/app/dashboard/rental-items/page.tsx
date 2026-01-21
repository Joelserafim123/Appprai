'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Armchair, Plus, Trash, Edit } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, query, where, limit, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import type { Tent, RentalItem } from '@/lib/types';

const rentalItemSchema = z.object({
  name: z.enum(['Kit Guarda-sol + 2 Cadeiras', 'Cadeira Adicional'], { required_error: 'O nome é obrigatório.' }),
  price: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(0, 'O preço deve ser positivo.')),
  quantity: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(0, 'A quantidade deve ser positiva.')),
});

type RentalItemFormData = z.infer<typeof rentalItemSchema>;

function RentalItemForm({ tent, item, onFinished, hasKit }: { tent: Tent; item?: RentalItem, onFinished: () => void, hasKit: boolean }) {
  const { toast } = useToast();
  const { db } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, control, formState: { errors } } = useForm<RentalItemFormData>({
    resolver: zodResolver(rentalItemSchema),
    defaultValues: item ? { ...item } : { name: hasKit ? 'Cadeira Adicional' : 'Kit Guarda-sol + 2 Cadeiras', price: 0, quantity: 1 },
  });

  const updateTentAvailability = async () => {
    const rentalItemsRef = collection(db, 'tents', tent.id, 'rentalItems');
    const q = query(rentalItemsRef, where('name', '==', 'Kit Guarda-sol + 2 Cadeiras'));
    const querySnapshot = await getDocs(q);
    const hasAvailable = querySnapshot.docs.some(doc => doc.data().quantity > 0);
    
    await updateDoc(doc(db, 'tents', tent.id), { hasAvailableKits: hasAvailable });
  };


  const onSubmit = async (data: RentalItemFormData) => {
    setIsSubmitting(true);
    try {
        const rentalItemsCollectionRef = collection(db, 'tents', tent.id, 'rentalItems');
        if (item) {
            await updateDoc(doc(rentalItemsCollectionRef, item.id), data);
            toast({ title: 'Item de aluguel atualizado com sucesso!' });
        } else {
            await addDoc(rentalItemsCollectionRef, data);
            toast({ title: 'Item de aluguel adicionado com sucesso!' });
        }
        
        if (data.name === 'Kit Guarda-sol + 2 Cadeiras') {
            await updateTentAvailability();
        }
        onFinished();

    } catch(error) {
        console.error("Error saving rental item: ", error);
        toast({ variant: 'destructive', title: 'Erro ao salvar item', description: 'Por favor tente novamente.' });
    } finally {
        setIsSubmitting(false);
    }
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
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | undefined>(undefined);

  const tentQuery = useMemoFirebase(
    () => user ? query(collection(db, 'tents'), where('ownerId', '==', user.uid), limit(1)) : null,
    [db, user]
  );
  const { data: tents, isLoading: tentLoading } = useCollection<Tent>(tentQuery);
  const tent = tents?.[0];

  const rentalItemsQuery = useMemoFirebase(
    () => tent ? collection(db, 'tents', tent.id, 'rentalItems') : null,
    [db, tent]
  );
  const { data: rentalItems, isLoading: rentalsLoading } = useCollection<RentalItem>(rentalItemsQuery);

  const deleteItem = async (itemToDelete: RentalItem) => {
    if (!tent) return;
    if (!confirm('Tem certeza que deseja apagar este item?')) return;
    
    try {
        await deleteDoc(doc(db, 'tents', tent.id, 'rentalItems', itemToDelete.id));
        if (itemToDelete.name === 'Kit Guarda-sol + 2 Cadeiras') {
            const rentalItemsRef = collection(db, 'tents', tent.id, 'rentalItems');
            const q = query(rentalItemsRef, where('name', '==', 'Kit Guarda-sol + 2 Cadeiras'));
            const querySnapshot = await getDocs(q);
            const hasAvailable = querySnapshot.docs.some(doc => doc.data().quantity > 0);
            await updateDoc(doc(db, 'tents', tent.id), { hasAvailableKits: hasAvailable });
        }
        toast({ title: 'Item apagado com sucesso!' });
    } catch(error) {
        console.error("Error deleting rental item: ", error);
        toast({ title: 'Erro ao apagar item', variant: 'destructive' });
    }
  }

  const handleFormFinished = () => {
    setIsFormOpen(false);
    setEditingItem(undefined);
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
        {tent && 
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
              </DialogHeader>
              <RentalItemForm tent={tent} item={editingItem} onFinished={handleFormFinished} hasKit={!!hasKit} />
          </DialogContent>
        }
    </Dialog>
  );
}
