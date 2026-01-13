
'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Utensils, Plus, Trash, Edit } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { useMemoFirebase } from '@/firebase/provider';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Bebidas' | 'Petiscos' | 'Pratos Principais';
};

const menuItemSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  description: z.string().optional(),
  price: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(0, 'O preço deve ser positivo.')),
  category: z.enum(['Bebidas', 'Petiscos', 'Pratos Principais'], { required_error: 'A categoria é obrigatória.' }),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

function MenuItemForm({ tentId, item, onFinished }: { tentId: string, item?: MenuItem, onFinished: () => void }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, control, formState: { errors } } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: item || { name: '', description: '', price: 0, category: 'Petiscos' },
  });

  const onSubmit = async (data: MenuItemFormData) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
      if (item) {
        const docRef = doc(firestore, 'tents', tentId, 'menuItems', item.id);
        updateDoc(docRef, data).catch((e) => {
          const permissionError = new FirestorePermissionError({
              path: `tents/${tentId}/menuItems/${item.id}`,
              operation: 'update',
              requestResourceData: data,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw e;
        });
        toast({ title: "Item atualizado com sucesso!" });
      } else {
        const collectionRef = collection(firestore, 'tents', tentId, 'menuItems');
        addDoc(collectionRef, data).catch((e) => {
           const permissionError = new FirestorePermissionError({
              path: `tents/${tentId}/menuItems`,
              operation: 'create',
              requestResourceData: data,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw e;
        });
        toast({ title: "Item adicionado com sucesso!" });
      }
      onFinished();
    } catch (e: any) {
        if (e.code !== 'permission-denied') {
            toast({
            variant: 'destructive',
            title: 'Erro ao salvar o item.',
            description: 'Por favor, tente novamente.'
            });
        }
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
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [tentId, setTentId] = useState<string | null>(null);
  const [loadingTent, setLoadingTent] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);

  useEffect(() => {
    if (firestore && user) {
        setLoadingTent(true);
      const getTentId = async () => {
        const tentsRef = collection(firestore, 'tents');
        const q = query(tentsRef, where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setTentId(querySnapshot.docs[0].id);
        }
        setLoadingTent(false);
      };
      getTentId();
    } else if (!isUserLoading) {
        setLoadingTent(false);
    }
  }, [firestore, user, isUserLoading]);

  const menuQuery = useMemoFirebase(() => {
    if (!firestore || !tentId) return null;
    return collection(firestore, 'tents', tentId, 'menuItems');
  }, [firestore, tentId]);

  const { data: menu, isLoading: menuLoading, error } = useCollection<MenuItem>(menuQuery);
  
  const deleteItem = async (itemId: string) => {
    if (!firestore || !tentId) return;
    if (!confirm('Tem certeza que deseja apagar este item?')) return;
    
    const docRef = doc(firestore, 'tents', tentId, 'menuItems', itemId);
    try {
        deleteDoc(docRef).catch((e) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', permissionError);
          throw e;
        });
        toast({ title: 'Item apagado com sucesso!' });
    } catch(e: any) {
        if (e.code !== 'permission-denied') {
            toast({ variant: 'destructive', title: 'Erro ao apagar item.' });
        }
    }
  }

  const openEditForm = (item: MenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }

  const openNewForm = () => {
    setEditingItem(undefined);
    setIsFormOpen(true);
  }


  if (isUserLoading || loadingTent) {
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

  if (error) {
      return <p className='text-destructive'>Erro ao carregar cardápio: {error.message}</p>
  }

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="w-full max-w-4xl">
        <header className="mb-8 flex justify-between items-center">
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Meu Cardápio</h1>
            <p className="text-muted-foreground">Adicione, edite ou remova itens do seu cardápio.</p>
            </div>
            <Button onClick={openNewForm} disabled={!tentId}>
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
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteItem(item.id)}>
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
        {tentId && (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
                </DialogHeader>
                <MenuItemForm tentId={tentId} item={editingItem} onFinished={() => setIsFormOpen(false)} />
            </DialogContent>
        )}
    </Dialog>
  );
}
