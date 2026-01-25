'use client';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Star } from 'lucide-react';
import { useState } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import type { Reservation, Tent } from '@/lib/types';
import { cn } from '@/lib/utils';

function StarRating({ rating, setRating, disabled }: { rating: number, setRating: (rating: number) => void, disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          disabled={disabled}
          className={cn(
            "p-1 rounded-full transition-colors",
            !disabled && "hover:bg-accent",
            star <= rating ? "text-yellow-400" : "text-muted-foreground/50"
          )}
        >
          <Star fill={star <= rating ? 'currentColor' : 'none'} className="w-8 h-8" />
        </button>
      ))}
    </div>
  );
}


export function ReviewDialog({ reservation, onFinished }: { reservation: Reservation, onFinished: () => void }) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!firestore || !user) return;
    if (rating === 0) {
        toast({ variant: 'destructive', title: 'Por favor, selecione uma avaliação.' });
        return;
    }
    setIsSubmitting(true);
    
    const tentRef = doc(firestore, 'tents', reservation.tentId);
    const reservationRef = doc(firestore, 'reservations', reservation.id);
    const reviewRef = doc(collection(firestore, 'tents', reservation.tentId, 'reviews'));

    try {
        await runTransaction(firestore, async (transaction) => {
            const tentDoc = await transaction.get(tentRef);
            if (!tentDoc.exists()) {
                throw "A barraca não existe!";
            }
            
            // 1. Calculate new average rating and review count
            const tentData = tentDoc.data() as Tent;
            const currentRatingTotal = (tentData.averageRating || 0) * (tentData.reviewCount || 0);
            const newReviewCount = (tentData.reviewCount || 0) + 1;
            const newAverageRating = (currentRatingTotal + rating) / newReviewCount;
            
            // 2. Set the new review
            transaction.set(reviewRef, {
                userId: user.uid,
                userName: user.displayName,
                userPhotoURL: user.photoURL || null,
                tentId: reservation.tentId,
                reservationId: reservation.id,
                rating,
                comment,
                createdAt: serverTimestamp(),
            });

            // 3. Update the tent's aggregate rating
            transaction.update(tentRef, {
                reviewCount: newReviewCount,
                averageRating: newAverageRating,
            });

            // 4. Mark the reservation as reviewed
            transaction.update(reservationRef, { reviewed: true });
        });
        
        toast({ title: 'Avaliação enviada!', description: 'Obrigado pelo seu feedback.' });
        onFinished();

    } catch (error) {
        console.error("Error submitting review:", error);
        toast({ variant: 'destructive', title: 'Erro ao enviar avaliação' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Avalie sua experiência</DialogTitle>
        <DialogDescription>
          Sua opinião é importante para a barraca {reservation.tentName}.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <div className="space-y-2">
            <Label>Sua Avaliação</Label>
            <StarRating rating={rating} setRating={setRating} disabled={isSubmitting} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="comment">Comentário (opcional)</Label>
            <Textarea 
                id="comment" 
                placeholder="Descreva sua experiência..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting}
            />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" disabled={isSubmitting}>Cancelar</Button>
        </DialogClose>
        <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Enviar Avaliação'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
