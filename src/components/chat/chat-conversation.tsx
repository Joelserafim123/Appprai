'use client';

import { UserData, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import type { Chat, ChatMessage } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
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
        batch.set(messageRef, {
            senderId: currentUser.uid,
            text: messageText,
            timestamp: serverTimestamp(),
            isRead: false
        });

        const chatRef = doc(db, 'chats', chat.id);
        batch.update(chatRef, {
            lastMessage: messageText,
            lastMessageSenderId: currentUser.uid,
            lastMessageTimestamp: serverTimestamp()
        });

        await batch.commit();

    } catch (error) {
        console.error("Error sending message:", error);
    } finally {
        setIsSending(false);
    }
  };

  const otherPartyName = currentUser.role === 'owner' ? chat.userName : chat.tentName;
  const otherPartyAvatar = currentUser.role === 'owner' ? chat.userPhotoURL : chat.tentLogoUrl;

  return (
    <Card className="flex flex-col flex-1 h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
             <Avatar>
                <AvatarImage src={otherPartyAvatar ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                    {currentUser.role === 'owner' ? <UserIcon className="h-5 w-5" /> : getInitials(otherPartyName)}
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
                      'flex w-full max-w-[80%] gap-2',
                      isCurrentUser ? 'self-end flex-row-reverse' : 'self-start'
                    )}
                  >
                    {!isCurrentUser && (
                       <Avatar className='h-8 w-8 self-end'>
                            <AvatarImage src={otherPartyAvatar ?? undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground">
                                {currentUser.role === 'owner' ? <UserIcon className="h-4 w-4" /> : getInitials(otherPartyName)}
                            </AvatarFallback>
                        </Avatar>
                    )}
                     <div className={cn("flex flex-col w-full", isCurrentUser ? 'items-end' : 'items-start')}>
                        <div
                            className={cn(
                                'rounded-xl px-3 py-2',
                                isCurrentUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                        >
                            <p className='text-sm' style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.text}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                                {message.timestamp?.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isCurrentUser && (
                                message.isRead ? <CheckCheck className="h-4 w-4 text-primary" /> : <Check className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
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
