'use client';

import type { UserData } from '@/firebase/provider';
import type { Chat, ChatMessage } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, User as UserIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { mockMessages } from '@/lib/mock-data';

interface ChatConversationProps {
  chat: Chat;
  currentUser: UserData;
}

export function ChatConversation({ chat, currentUser }: ChatConversationProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaViewport = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);

  useEffect(() => {
    setMessagesLoading(true);
    setTimeout(() => {
        setMessages(mockMessages[chat.id] || []);
        setMessagesLoading(false);
    }, 300);
  }, [chat.id]);

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
    if (!newMessage.trim()) return;

    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    const messageData: ChatMessage = {
      id: `mock-msg-${Date.now()}`,
      senderId: currentUser.uid,
      text: messageText,
      timestamp: { toDate: () => new Date() } as any,
    };
    
    setTimeout(() => {
        setMessages(prev => [...prev, messageData]);
        setIsSending(false);
    }, 500);
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
                const isCurrentUser = message.senderId === currentUser.uid || (currentUser.isAnonymous && message.senderId === 'owner1'); // Demo logic
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
