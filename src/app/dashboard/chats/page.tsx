'use client';

import { useUser, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatConversation } from '@/components/chat/chat-conversation';
import { cn } from '@/lib/utils';
import type { Chat } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { getInitials } from '@/lib/utils';
import { useTranslations } from '@/i18n';
import { Button } from '@/components/ui/button';

export default function ChatsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore: db } = useFirebase();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const t = useTranslations('ChatsPage');
  const searchParams = useSearchParams();
  const router = useRouter();

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
  
  useEffect(() => {
    const reservationIdFromQuery = searchParams.get('reservationId');
    if (reservationIdFromQuery && chats) {
        const chatForReservation = chats.find(c => c.reservationId === reservationIdFromQuery);
        if (chatForReservation) {
            setSelectedChatId(chatForReservation.id);
            // Optional: remove query param from URL to clean it up
            router.replace('/dashboard/chats', { scroll: false });
        }
    }
  }, [searchParams, chats, router]);


  const sortedChats = useMemo(() => {
    if (!chats) return [];
    // Filter out self-chats and then sort by last message timestamp.
    return chats
      .filter(chat => chat.userId !== chat.tentOwnerId)
      .sort((a, b) => {
        if (a.lastMessageTimestamp && b.lastMessageTimestamp) {
            return b.lastMessageTimestamp.toMillis() - a.lastMessageTimestamp.toMillis();
        }
        return 0;
    });
  }, [chats]);

  const handleSelectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
  }, []);

  const handleGoBackToList = useCallback(() => {
    setSelectedChatId(null);
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

  // If a chat is selected, show only the conversation view.
  if (selectedChatId && selectedChat) {
      return (
          <div className="w-full h-[calc(100vh-120px)] flex flex-col">
               <Button variant="ghost" onClick={handleGoBackToList} className="mb-4 self-start px-0">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('backToConversations')}
              </Button>
              <ChatConversation key={selectedChatId} chat={selectedChat} currentUser={user} />
          </div>
      );
  }
  
  // Otherwise, show the list of chats.
  return (
    <div className="w-full h-full flex flex-col">
        <header className="mb-4">
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground">{description}</p>
        </header>
        
        <Card className="flex-1 flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">{t('yourConversations')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2">
                {sortedChats && sortedChats.length > 0 ? (
                    <div className="space-y-1">
                       {sortedChats.map((chat) => {
                            const amIOwnerInThisChat = user.uid === chat.tentOwnerId;
                            const otherPartyName = amIOwnerInThisChat ? chat.userName : chat.tentName;
                            const otherPartyAvatar = amIOwnerInThisChat ? chat.userPhotoURL : chat.tentLogoUrl;
                            const lastMessagePrefix = chat.lastMessageSenderId === user.uid ? 'Você: ' : '';

                            return (
                              <button
                                key={chat.id}
                                onClick={() => handleSelectChat(chat.id)}
                                className={cn(
                                  "w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors hover:bg-muted/50"
                                )}
                              >
                                <Avatar className='h-10 w-10'>
                                  <AvatarImage src={otherPartyAvatar ?? undefined} alt={otherPartyName} />
                                  <AvatarFallback className="bg-primary/20 text-primary">
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
                    <div className="text-center py-8 text-sm text-muted-foreground h-full flex flex-col justify-center items-center">
                         <MessageSquare className="mx-auto h-8 w-8 mb-2"/>
                        <p>{t('noConversations')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
