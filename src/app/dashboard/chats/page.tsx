'use client';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare, User as UserIcon } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatConversation } from '@/components/chat/chat-conversation';
import { cn } from '@/lib/utils';
import type { Chat } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { getInitials } from '@/lib/utils';
import { useTranslations } from '@/i18n';

export default function ChatsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore: db } = useFirebase();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const t = useTranslations('ChatsPage');

  const chatsQuery = useMemoFirebase(
    () =>
      user && user.uid && db
        ? query(
            collection(db, 'chats'),
            where('participantIds', 'array-contains', user.uid),
            where('status', '==', 'active')
          )
        : null,
    [db, user?.uid]
  );
  const { data: chats, isLoading: chatsLoading } = useCollection<Chat>(chatsQuery);

  const sortedChats = useMemo(() => {
    if (!chats) return [];
    // Firestore does not support orderBy on a different field than the one used in the where clause with array-contains.
    // So we sort client-side.
    return [...chats].sort((a, b) => {
        if (a.lastMessageTimestamp && b.lastMessageTimestamp) {
            return b.lastMessageTimestamp.toMillis() - a.lastMessageTimestamp.toMillis();
        }
        return 0;
    });
  }, [chats]);

  useEffect(() => {
    if (sortedChats && sortedChats.length > 0 && !selectedChatId) {
      setSelectedChatId(sortedChats[0].id);
    }
  }, [sortedChats, selectedChatId]);


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
    return <p>{t('pleaseLogin')}</p>;
  }
  
  const selectedChat = sortedChats?.find(c => c.id === selectedChatId) ?? null;
  
  const description = user.role === 'owner' ? t('description_owner') : t('description_customer');

  return (
    <div className="w-full h-[calc(100vh-120px)] flex flex-col">
        <header className="mb-4">
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground">{description}</p>
        </header>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 overflow-hidden">
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg">{t('yourConversations')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-2">
                    {sortedChats && sortedChats.length > 0 ? (
                        <div className="space-y-2">
                           {sortedChats.map((chat) => {
                                // A chat with oneself (where customer and owner are the same) should not be displayed.
                                if (chat.userId === chat.tentOwnerId) {
                                  return null;
                                }
                           
                                // Determine the user's role specifically for this chat.
                                const amIOwnerInThisChat = user.uid === chat.tentOwnerId;

                                // Determine the other party's details based on the user's role in this chat.
                                const otherPartyName = amIOwnerInThisChat ? chat.userName : chat.tentName;
                                const otherPartyAvatar = amIOwnerInThisChat ? chat.userPhotoURL : chat.tentLogoUrl;
                                
                                const lastMessagePrefix = chat.lastMessageSenderId === user.uid ? 'Você: ' : '';

                                return (
                                  <button
                                    key={chat.id}
                                    onClick={() => handleSelectChat(chat.id)}
                                    className={cn(
                                      "w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors",
                                      selectedChatId === chat.id ? 'bg-muted' : 'hover:bg-muted/50'
                                    )}
                                  >
                                    <Avatar className='h-10 w-10'>
                                      <AvatarImage src={otherPartyAvatar ?? undefined} alt={otherPartyName} />
                                      <AvatarFallback className="bg-primary/20 text-primary">
                                        {/* If the other party is a user, show a user icon. If it's a tent, show initials. */}
                                        {amIOwnerInThisChat ? <UserIcon className="h-6 w-6" /> : getInitials(otherPartyName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className='flex-1 overflow-hidden'>
                                      <p className='font-semibold truncate'>{otherPartyName}</p>
                                      <p className='text-xs text-muted-foreground truncate'>{lastMessagePrefix}{chat.lastMessage}</p>
                                    </div>
                                  </button>
                                );
                           })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                             <MessageSquare className="mx-auto h-8 w-8 mb-2"/>
                            {t('noConversations')}
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
                            <p>{t('selectConversation')}</p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
}
