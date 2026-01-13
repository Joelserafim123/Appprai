
'use client';

import type { UserData } from '@/firebase/auth/use-user';
import type { Chat, ChatMessage } from '@/lib/types';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, orderBy, query, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useMemo, useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, User as UserIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useMemoFirebase } from '@/firebase/provider';

interface ChatConversationProps {
  chat: Chat;
  currentUser: UserData;
}

export function ChatConversation({ chat, currentUser }: ChatConversationProps) {
  const { firestore } = useFirebase();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaViewport = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'chats', chat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, chat.id]);

  const { data: messages, isLoading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);

  // Auto-scroll para o final
  useEffect(() => {
    if (scrollAreaViewport.current) {
      scrollAreaViewport.current.scrollTo({
        top: scrollAreaViewport.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !firestore) return;

    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    const messageData = {
      senderId: currentUser.uid,
      text: messageText,
      timestamp: serverTimestamp(),
    };
    
    const updateData = {
        lastMessage: messageText,
        lastMessageTimestamp: serverTimestamp(),
    };

    const chatDocRef = doc(firestore, 'chats', chat.id);
    const messagesColRef = collection(firestore, 'chats', chat.id, 'messages');

    try {
      // Não aguardar para fornecer atualizações otimistas
      addDoc(messagesColRef, messageData).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: messagesColRef.path,
            operation: 'create',
            requestResourceData: messageData
        });
        errorEmitter.emit('permission-error', permissionError);
        throw error;
      });
      updateDoc(chatDocRef, updateData).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: chatDocRef.path,
            operation: 'update',
            requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
        throw error;
      });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSending(false);
    }
  };

  const getSenderAvatar = (senderId: string) => {
    if (senderId === chat.userId) return chat.userPhotoURL;
    if (senderId === chat.tentOwnerId) return chat.tentLogoUrl;
    return '';
  };


  return (
    <Card className="flex flex-col flex-1 h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
             <Avatar>
                <AvatarImage src={currentUser.role === 'owner' ? chat.userPhotoURL : chat.tentLogoUrl} />
                <AvatarFallback>
                    <UserIcon className="h-4 w-4" />
                </AvatarFallback>
             </Avatar>
             <div>
                <CardTitle className="text-lg">{currentUser.role === 'owner' ? chat.userName : chat.tentName}</CardTitle>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full" viewportRef={scrollAreaViewport}>
          <div className="p-4 space-y-4">
            {messagesLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              messages?.map((message) => {
                const isCurrentUser = message.senderId === currentUser.uid;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex items-end gap-2',
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isCurrentUser && (
                       <Avatar className='h-8 w-8'>
                            <AvatarImage src={getSenderAvatar(message.senderId)} />
                            <AvatarFallback>
                                <UserIcon className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                    )}
                     <div
                        className={cn(
                          'max-w-xs md:max-w-md lg:max-w-lg rounded-xl px-4 py-2',
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                       <p className='text-sm'>{message.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
