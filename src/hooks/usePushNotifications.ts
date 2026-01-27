'use client';
import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { useFirebase, useUser } from '@/firebase/provider';
import { useToast } from './use-toast';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

// This hook is for tent owners to subscribe to new reservation notifications.
export function usePushNotifications() {
  const { firebaseApp, firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSupportedState, setIsSupportedState] = useState(false);

  useEffect(() => {
    isSupported().then(supported => {
      setIsSupportedState(supported);
      if (supported) {
        setPermission(Notification.permission);
      }
    });
  }, []);

  useEffect(() => {
    if (permission === 'granted' && isSupportedState && firebaseApp) {
      const messaging = getMessaging(firebaseApp);
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received.', payload);
        toast({
          title: payload.notification?.title || 'Nova Notificação',
          description: payload.notification?.body || '',
        });
      });
      return () => unsubscribe();
    }
  }, [permission, isSupportedState, firebaseApp, toast]);

  const subscribeToNotifications = useCallback(async () => {
    if (!isSupportedState || !firebaseApp || !firestore || !user) return;

    setIsSubscribing(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        const messaging = getMessaging(firebaseApp);
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;

        if (!vapidKey) {
          console.error('VAPID key is not set. Please set NEXT_PUBLIC_VAPID_KEY in your environment variables.');
          toast({
            variant: 'destructive',
            title: 'Configuração Incompleta',
            description: 'A chave de notificação (VAPID key) não foi configurada.',
            duration: 9000,
          });
          setIsSubscribing(false);
          return;
        }

        const currentToken = await getToken(messaging, { vapidKey });

        if (currentToken) {
          const userDocRef = doc(firestore, 'users', user.uid);
          await updateDoc(userDocRef, {
            fcmTokens: arrayUnion(currentToken)
          });
          toast({ title: 'Notificações ativadas!', description: 'Você será notificado sobre novas reservas.' });
        } else {
          toast({ variant: 'destructive', title: 'Falha ao obter token', description: 'Não foi possível obter o token de notificação.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Permissão negada', description: 'Você precisa permitir notificações nas configurações do seu navegador.' });
      }
    } catch (error) {
      console.error('Error subscribing to notifications', error);
      toast({ variant: 'destructive', title: 'Erro ao ativar notificações', description: 'Verifique o console para mais detalhes.' });
    } finally {
      setIsSubscribing(false);
    }
  }, [isSupportedState, firebaseApp, firestore, user, toast]);

  return { permission, subscribeToNotifications, isSubscribing, isSupported: isSupportedState };
}
