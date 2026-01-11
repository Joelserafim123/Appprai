'use client';

import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User as UserIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { user, loading } = useUser();

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

      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <CardDescription>
            Estas são as informações associadas à sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nome Completo</Label>
            <Input id="displayName" value={user.displayName || ''} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email || ''} readOnly />
          </div>
           <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" value={user.cpf || ''} readOnly />
          </div>
           <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" value={user.address || ''} readOnly />
          </div>
           <div className="space-y-2">
            <Label htmlFor="role">Tipo de Conta</Label>
            <Input id="role" value={user.role === 'owner' ? 'Dono de Barraca' : 'Cliente'} readOnly />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
