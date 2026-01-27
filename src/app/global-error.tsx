'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isPermissionError = error.name === 'FirebaseError' && error.message.includes('permission');

  return (
    <html>
      <body>
        <main className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-destructive">
                {isPermissionError ? 'Permissão Negada no Firestore' : 'Ocorreu um Erro na Aplicação'}
              </CardTitle>
              <CardDescription>
                {isPermissionError
                  ? 'Uma operação foi bloqueada pelas regras de segurança do Firestore.'
                  : 'Algo deu errado. Por favor, tente novamente.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground overflow-auto max-h-60">
                <p className="font-mono whitespace-pre-wrap">{error.message}</p>
                {error.stack && (
                  <details className="mt-2 text-xs">
                    <summary>Stack Trace</summary>
                    <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
                  </details>
                )}
              </div>
              {isPermissionError && (
                 <div className="border-l-2 border-orange-400 pl-4 text-sm text-muted-foreground">
                    <b>Dica:</b> Verifique o arquivo <code>firestore.rules</code> para garantir que a operação é permitida. A mensagem de erro acima contém detalhes da requisição que foi negada.
                 </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button onClick={() => reset()} variant="outline">Tentar Novamente</Button>
               <Button asChild>
                <a href="https://console.firebase.google.com/" target="_blank">
                    <FileQuestion className="mr-2"/>
                    Abrir Console do Firebase
                </a>
              </Button>
            </CardFooter>
          </Card>
        </main>
      </body>
    </html>
  );
}
