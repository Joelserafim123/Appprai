'use client';

import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { Chat, ChatMessage, UserProfile, Tent, ChatMessageWrite, ChatWrite, UserData } from '@/lib/types';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Check, CheckCheck, User as UserIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { collection, query, orderBy, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';


interface ChatConversationProps {
  chat: Chat;
  currentUser: UserData;
}

export function ChatConversation({ chat, currentUser }: ChatConversationProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaViewport = useRef<HTMLDivElement>(null);
  const { firestore: db } = useFirebase();

  const messagesQuery = useMemoFirebase(
    () => (chat && db) ? query(collection(db, 'chats', chat.id, 'messages'), orderBy('timestamp', 'asc')) : null,
    [db, chat]
  );
  const { data: messages, isLoading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);

  const amIOwnerInThisChat = currentUser.uid === chat.tentOwnerId;

  // Fetch live data for the other party to ensure it's up-to-date
  const otherUserRef = useMemoFirebase(
    () => (db && amIOwnerInThisChat) ? doc(db, 'users', chat.userId) : null,
    [db, amIOwnerInThisChat, chat.userId]
  );
  const { data: otherUserData, isLoading: isLoadingUser } = useDoc<UserProfile>(otherUserRef);

  const tentRef = useMemoFirebase(
    () => (db && !amIOwnerInThisChat) ? doc(db, 'tents', chat.tentId) : null,
    [db, amIOwnerInThisChat, chat.tentId]
  );
  const { data: tentData, isLoading: isLoadingTent } = useDoc<Tent>(tentRef);


  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollAreaViewport.current) {
      setTimeout(() => {
          scrollAreaViewport.current?.scrollTo({
              top: scrollAreaViewport.current.scrollHeight,
              behavior: 'smooth',
          });
      }, 100);
    }

    // Mark messages as read
    if (!db || !messages || !currentUser || messages.length === 0) return;

    const unreadMessages = messages.filter(
      (msg) => msg.senderId !== currentUser.uid && !msg.isRead
    );

    if (unreadMessages.length > 0) {
      const batch = writeBatch(db);
      unreadMessages.forEach((msg) => {
        if (msg.id) { 
          const msgRef = doc(db, 'chats', chat.id, 'messages', msg.id);
          batch.update(msgRef, { isRead: true });
        }
      });
      
      batch.commit().catch(err => {
          console.error("Error marking messages as read:", err);
      });
    }
  }, [messages, db, currentUser, chat.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chat || !db) return;

    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
        const batch = writeBatch(db);
        
        const messageRef = doc(collection(db, 'chats', chat.id, 'messages'));
        const messagePayload: ChatMessageWrite = {
            senderId: currentUser.uid,
            text: messageText,
            timestamp: serverTimestamp(),
            isRead: false
        };
        batch.set(messageRef, messagePayload);

        const chatRef = doc(db, 'chats', chat.id);
        const chatUpdatePayload: Partial<ChatWrite> = {
            lastMessage: messageText,
            lastMessageSenderId: currentUser.uid,
            lastMessageTimestamp: serverTimestamp()
        };
        batch.update(chatRef, chatUpdatePayload);

        await batch.commit();

    } catch (error) {
        console.error("Error sending message:", error);
    } finally {
        setIsSending(false);
    }
  };
  
  const isLoading = messagesLoading || isLoadingUser || isLoadingTent;

  // Use live data if available, otherwise fallback to denormalized data from chat object
  const otherPartyName = amIOwnerInThisChat 
    ? (otherUserData?.displayName ?? chat.userName) 
    : (tentData?.name ?? chat.tentName);

  const otherPartyAvatar = amIOwnerInThisChat 
    ? (otherUserData?.photoURL ?? chat.userPhotoURL) 
    : (tentData?.logoUrl ?? chat.tentLogoUrl);


  return (
    <Card className="flex flex-col flex-1 h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
             <Avatar>
                <AvatarImage src={otherPartyAvatar ?? undefined} alt={otherPartyName} />
                <AvatarFallback className="bg-primary/20 text-primary">
                    {getInitials(otherPartyName)}
                </AvatarFallback>
             </Avatar>
             <div>
                <CardTitle className="text-lg">{otherPartyName}</CardTitle>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full" viewportRef={scrollAreaViewport}>
          <div className="flex flex-col gap-4 p-4">
            {isLoading ? (
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
                      'flex items-start gap-3',
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isCurrentUser && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={otherPartyAvatar ?? undefined} alt={otherPartyName} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {getInitials(otherPartyName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'flex flex-col max-w-[80%]',
                        isCurrentUser ? 'items-end' : 'items-start'
                      )}
                    >
                      <span className="text-xs text-muted-foreground px-2 mb-0.5">
                        {isCurrentUser ? 'Você' : otherPartyName}
                      </span>
                      <div
                        className={cn(
                          'rounded-lg px-3 py-2',
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className='text-sm' style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.text}</p>
                      </div>
                      <div className={cn("mt-1 flex items-center gap-1", isCurrentUser ? 'pr-1' : 'pl-1')}>
                        <span className="text-xs text-muted-foreground">
                            {message.timestamp?.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isCurrentUser && (
                            message.isRead ? <CheckCheck className="h-4 w-4 text-primary" /> : <Check className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                     {isCurrentUser && (
                       <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.photoURL ?? undefined} alt={currentUser.displayName ?? ''} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {getInitials(currentUser.displayName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
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
