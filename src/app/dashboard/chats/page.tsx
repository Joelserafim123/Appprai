'use client';

import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare, User as UserIcon } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatConversation } from '@/components/chat/chat-conversation';
import { cn } from '@/lib/utils';
import type { Chat } from '@/lib/types';
import { mockChats } from '@/lib/mock-data';

export default function ChatsPage() {
  const { user, isUserLoading } = useUser();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);

  useEffect(() => {
    setChatsLoading(true);
    setTimeout(() => {
        // For demo, filter chats where the current user is a participant
        // Assuming user is either 'customer1' or 'owner1'
        const userChats = mockChats.filter(c => c.participantIds.includes('customer1') || c.participantIds.includes('owner1'));
        setChats(userChats as Chat[]);
        setChatsLoading(false);
    }, 500);
  }, []);

  const handleSelectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
  }, []);

  if (isUserLoading || (chatsLoading && !chats)) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p>Por favor, faça login para ver suas conversas.</p>;
  }
  
  const selectedChat = chats?.find(c => c.id === selectedChatId) ?? null;

  return (
    <div className="w-full h-[calc(100vh-120px)] flex flex-col">
        <header className="mb-4">
            <h1 className="text-3xl font-bold tracking-tight">Conversas</h1>
            <p className="text-muted-foreground">Comunicação direta com {user.role === 'owner' ? 'seus clientes' : 'as barracas'}.</p>
        </header>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 overflow-hidden">
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg">Suas Conversas</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-2">
                    {chats && chats.length > 0 ? (
                        <div className="space-y-2">
                           {chats.map((chat) => {
                                const photoUrl = user.role === 'owner' ? chat.userPhotoURL : chat.tentLogoUrl;
                                const displayName = user.role === 'owner' ? chat.userName : chat.tentName;
                                return (
                                <button key={chat.id} onClick={() => handleSelectChat(chat.id)} className={cn("w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors", selectedChatId === chat.id ? 'bg-muted' : 'hover:bg-muted/50')}>
                                    <Avatar className='h-10 w-10'>
                                        <AvatarImage src={photoUrl || ''} />
                                        <AvatarFallback>
                                            <UserIcon className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className='flex-1 overflow-hidden'>
                                        <p className='font-semibold truncate'>{displayName}</p>
                                        <p className='text-xs text-muted-foreground truncate'>{chat.lastMessage}</p>
                                    </div>
                                </button>
                           )})}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                             <MessageSquare className="mx-auto h-8 w-8 mb-2"/>
                            Nenhuma conversa encontrada.
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex flex-col h-full">
                {selectedChat ? (
                    <ChatConversation key={selectedChatId} chat={selectedChat} currentUser={user} />
                ) : (
                    <Card className="flex-1 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <MessageSquare className="mx-auto h-12 w-12 mb-4"/>
                            <p>Selecione uma conversa para começar</p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
}
