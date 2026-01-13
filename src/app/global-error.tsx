'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FirestorePermissionError } from '@/firebase/errors';
import { FileQuestion } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isPermissionError = error instanceof FirestorePermissionError;
  const permissionError = isPermissionError ? (error as FirestorePermissionError) : null;

  return (
    <html>
      <body>
        <main className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-destructive">
                {isPermissionError ? 'Permissão Negada no Firestore' : 'Ocorreu um Erro'}
              </CardTitle>
              <CardDescription>
                {isPermissionError
                  ? 'Uma operação foi bloqueada pelas regras de segurança do Firestore.'
                  : 'Algo deu errado na aplicação.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground overflow-auto max-h-60">
                <p className="font-mono whitespace-pre-wrap">{error.message}</p>
              </div>
              {permissionError && (
                 <div className="border-l-2 border-orange-400 pl-4 text-sm text-muted-foreground">
                    <b>Dica:</b> As regras de segurança estão no arquivo <code>firestore.rules</code>. Verifique se as regras permitem a operação ({permissionError.request.method}) no caminho "{permissionError.request.path}".
                 </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button onClick={() => reset()} variant="outline">Tentar Novamente</Button>
              <Button asChild>
                <a href="https://console.firebase.google.com/project/cadastro-3c63f/firestore/rules" target="_blank">
                    <FileQuestion className="mr-2"/>
                    Ver Regras
                </a>
              </Button>
            </CardFooter>
          </Card>
        </main>
      </body>
    </html>
  );
}
