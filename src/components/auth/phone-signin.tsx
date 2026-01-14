
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  getAuth,
  ConfirmationResult,
} from "firebase/auth";
import { useFirebase } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smartphone, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { doc, getDoc, setDoc } from "firebase/firestore";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
    confirmationResult: ConfirmationResult | undefined;
  }
}

export function PhoneSignIn({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const { firebaseApp, firestore } = useFirebase();
  const { toast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);

  const setupRecaptcha = useCallback(() => {
    if (!firebaseApp || window.recaptchaVerifier) return;
    const auth = getAuth(firebaseApp);
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
      });
    } catch(e) {
      console.error("Recaptcha setup error", e)
    }
  }, [firebaseApp]);

  useEffect(() => {
    // We set up recaptcha on mount but only if it's not already there.
    if (firebaseApp) {
        setupRecaptcha();
    }
  }, [firebaseApp, setupRecaptcha]);
  
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 13) value = value.slice(0, 13);
    value = value.replace(/^(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    setPhoneNumber(value);
  };


  const handleSendVerificationCode = async () => {
    if (!firebaseApp) return;
    setIsSendingCode(true);
    const auth = getAuth(firebaseApp);
    const recaptchaVerifier = window.recaptchaVerifier;

    if (!recaptchaVerifier) {
      toast({ variant: "destructive", title: "Erro de reCAPTCHA", description: "O verificador reCAPTCHA não foi inicializado. Por favor, atualize a página." });
      setIsSendingCode(false);
      return;
    }

    const fullPhoneNumber = `+55${phoneNumber.replace(/\D/g, "")}`;

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setIsCodeSent(true);
      toast({ title: "Código SMS Enviado", description: `Um código foi enviado para ${phoneNumber}.` });
    } catch (error: any) {
      console.error("SMS Error", error);
      toast({
        variant: "destructive",
        title: "Falha ao enviar SMS",
        description: "Não foi possível enviar o código. Verifique o número e tente novamente.",
      });
      // Reset reCAPTCHA so user can try again.
      window.recaptchaVerifier?.render().then(widgetId => {
         // @ts-ignore
         window.grecaptcha.reset(widgetId);
      });

    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!window.confirmationResult) return;
    setIsVerifyingCode(true);

    try {
      const result = await window.confirmationResult.confirm(verificationCode);
      const user = result.user;

      // Check if user exists in Firestore, if not create a new doc.
      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: `Usuário ${user.uid.slice(0, 5)}`, // Placeholder name
          email: null,
          role: 'customer',
          phoneNumber: user.phoneNumber,
        });
      }
      onAuthSuccess();
    } catch (error: any) {
      console.error("Code Verification Error", error);
      toast({
        variant: "destructive",
        title: "Código Inválido",
        description: "O código que você inseriu está incorreto. Por favor, tente novamente.",
      });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Entrar com Telefone</DialogTitle>
        <DialogDescription>
          {isCodeSent ? "Insira o código que enviamos para o seu celular." : "Nós enviaremos um código de verificação para o seu celular."}
        </DialogDescription>
      </DialogHeader>
      
      {!isCodeSent ? (
        <div className="space-y-4 py-2">
            <div className="space-y-2">
                <Label htmlFor="phone-number">Número de Telefone</Label>
                <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="phone-number"
                        type="tel"
                        placeholder="(DDD) 99999-9999"
                        value={phoneNumber}
                        onChange={handlePhoneNumberChange}
                        disabled={isSendingCode}
                        className="pl-10"
                    />
                </div>
            </div>
            <div id="recaptcha-container"></div>
        </div>
      ) : (
        <div className="space-y-4 py-2">
             <div className="space-y-2">
                <Label htmlFor="verification-code">Código de Verificação</Label>
                 <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="verification-code"
                        type="text"
                        placeholder="••••••"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        disabled={isVerifyingCode}
                        className="pl-10"
                    />
                </div>
            </div>
        </div>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost">Cancelar</Button>
        </DialogClose>
        {!isCodeSent ? (
          <Button onClick={handleSendVerificationCode} disabled={isSendingCode || phoneNumber.replace(/\D/g, "").length < 10}>
            {isSendingCode ? <Loader2 className="animate-spin" /> : "Enviar Código"}
          </Button>
        ) : (
          <Button onClick={handleVerifyCode} disabled={isVerifyingCode || verificationCode.length < 6}>
            {isVerifyingCode ? <Loader2 className="animate-spin" /> : "Verificar e Entrar"}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
