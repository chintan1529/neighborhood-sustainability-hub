'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2 } from 'lucide-react';
import { submitCollectorReview } from '@/app/resident/actions';
import { cn } from '@/lib/utils';

interface RateCollectorDialogProps {
    reportId: string;
    trigger?: React.ReactNode;
}

export function RateCollectorDialog({ reportId, trigger }: RateCollectorDialogProps) {
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [review, setReview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (rating < 1) {
            toast({
                variant: 'destructive',
                title: 'Rating required',
                description: 'Please select a star rating before submitting.',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await submitCollectorReview(reportId, rating, review);
            
            if (result.success) {
                toast({
                    title: 'Review submitted',
                    description: 'Thank you for your feedback! It helps us improve our service.',
                });
                setOpen(false);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Submission failed',
                    description: result.error || 'Please try again later.',
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'An unexpected error occurred.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Rate Collector</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Rate Collector</DialogTitle>
                    <DialogDescription>
                        How did the waste collector perform on this pickup? Your feedback helps us maintain high quality service.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-6 flex flex-col items-center justify-center gap-6">
                    {/* Star Rating */}
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                            >
                                <Star
                                    className={cn(
                                        "h-10 w-10 transition-colors",
                                        (hoverRating ? star <= hoverRating : star <= rating)
                                            ? "fill-amber-400 text-amber-400"
                                            : "fill-muted text-muted-foreground/30"
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                    
                    {/* Feedback specific labels */}
                    <p className="text-sm font-medium text-muted-foreground h-5">
                        {rating === 1 && "Poor"}
                        {rating === 2 && "Fair"}
                        {rating === 3 && "Good"}
                        {rating === 4 && "Very Good"}
                        {rating === 5 && "Excellent!"}
                    </p>

                    {/* Review Textarea */}
                    <div className="w-full space-y-2">
                        <Textarea
                            placeholder="Add a written review (optional)..."
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            className="resize-none"
                            maxLength={500}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Feedback
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
