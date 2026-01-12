
'use client';

import { useUser } from '@/firebase/provider';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, getDocs, doc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatConversation } from '@/components/chat/chat-conversation';
import { cn } from '@/lib/utils';
import type { Chat } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { useMemoFirebase } from '@/firebase/provider';

export default function ChatsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const [tentId, setTentId] = useState<string | null>(null);
  const [loadingTentId, setLoadingTentId] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Se o usuário for um dono, busca o ID da sua barraca
  useEffect(() => {
    if (isUserLoading) {
      setLoadingTentId(true);
      return;
    }
    if (firestore && user?.role === 'owner') {
      setLoadingTentId(true);
      const getTentId = async () => {
        const tentsRef = collection(firestore, 'tents');
        const q = query(tentsRef, where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setTentId(querySnapshot.docs[0].id);
        }
        setLoadingTentId(false);
      };
      getTentId();
    } else {
      setLoadingTentId(false);
    }
  }, [firestore, user, isUserLoading]);

  // Monta a query de chats baseada na função do usuário
  const chatsQuery = useMemoFirebase(() => {
    if (!firestore || !user || loadingTentId) return null;

    if (user.role === 'owner' && !tentId) {
        // Se for dono e não tiver barraca (após o carregamento ter terminado), retorna uma query vazia.
        return query(collection(firestore, 'chats'), where('tentId', '==', 'nonexistent-id-to-return-empty'));
    }

    const fieldToQuery = user.role === 'owner' ? 'tentId' : 'userId';
    const valueToQuery = user.role === 'owner' ? tentId : user.uid;

    if (!valueToQuery) return null;

    return query(
      collection(firestore, 'chats'),
      where(fieldToQuery, '==', valueToQuery),
      orderBy('lastMessageTimestamp', 'desc')
    );
  }, [firestore, user, tentId, loadingTentId]);
  
  const { data: chats, isLoading: chatsLoading, error } = useCollection<Chat>(chatsQuery);

  const handleSelectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
  }, []);

  if (isUserLoading || chatsLoading || loadingTentId) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p>Por favor, faça login para ver suas conversas.</p>;
  }
  
  if (error) {
      return <p className='text-destructive'>Erro ao carregar conversas: {error.message}</p>
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
                                        <AvatarImage src={photoUrl || `https://picsum.photos/seed/person-avatar/200`} />
                                        <AvatarFallback>
                                            {getInitials(displayName)}
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
