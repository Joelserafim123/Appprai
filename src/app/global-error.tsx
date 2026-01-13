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
                {isPermissionError ? 'Firestore Permission Denied' : 'An Error Occurred'}
              </CardTitle>
              <CardDescription>
                {isPermissionError
                  ? 'An operation was blocked by Firestore security rules.'
                  : 'Something went wrong in the application.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground overflow-auto max-h-60">
                <p className="font-mono whitespace-pre-wrap">{error.message}</p>
              </div>
              {permissionError && (
                 <div className="border-l-2 border-orange-400 pl-4 text-sm text-muted-foreground">
                    <b>Hint:</b> Security rules are in the <code>firestore.rules</code> file. Check if the rules allow the operation ({permissionError.request.method}) on the path "{permissionError.request.path}".
                 </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button onClick={() => reset()} variant="outline">Try Again</Button>
              <Button asChild>
                <a href="https://console.firebase.google.com/project/cadastro-3c63f/firestore/rules" target="_blank">
                    <FileQuestion className="mr-2"/>
                    View Rules
                </a>
              </Button>
            </CardFooter>
          </Card>
        </main>
      </body>
    </html>
  );
}
