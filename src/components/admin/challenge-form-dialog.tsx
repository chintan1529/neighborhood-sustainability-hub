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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { createChallenge } from '@/app/actions/admin';
import { useToast } from '@/hooks/use-toast';

export function ChallengeFormDialog() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        targetCount: '10',
        rewardPoints: '50',
        startsAt: new Date().toISOString().split('T')[0],
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const form = new FormData();
        form.append('title', formData.title);
        form.append('description', formData.description);
        form.append('targetCount', formData.targetCount);
        form.append('rewardPoints', formData.rewardPoints);
        form.append('startsAt', formData.startsAt);
        form.append('endsAt', formData.endsAt);

        const result = await createChallenge(form);

        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error,
            });
        } else {
            toast({
                title: 'Success',
                description: 'Challenge created successfully!',
            });
            setOpen(false);
            // Reset form
            setFormData({
                title: '',
                description: '',
                targetCount: '10',
                rewardPoints: '50',
                startsAt: new Date().toISOString().split('T')[0],
                endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            });
        }
        setIsLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Challenge
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Challenge</DialogTitle>
                        <DialogDescription>
                            Set up a new community challenge. Fill in the details below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Challenge Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Plastic Free Week"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe what participants need to do..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="targetCount">Target Count *</Label>
                                <Input
                                    id="targetCount"
                                    type="number"
                                    min="1"
                                    placeholder="10"
                                    value={formData.targetCount}
                                    onChange={(e) => setFormData({ ...formData, targetCount: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Number of reports to complete</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rewardPoints">Reward Points *</Label>
                                <Input
                                    id="rewardPoints"
                                    type="number"
                                    min="1"
                                    placeholder="50"
                                    value={formData.rewardPoints}
                                    onChange={(e) => setFormData({ ...formData, rewardPoints: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Points awarded on completion</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startsAt">Start Date *</Label>
                                <Input
                                    id="startsAt"
                                    type="date"
                                    value={formData.startsAt}
                                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endsAt">End Date *</Label>
                                <Input
                                    id="endsAt"
                                    type="date"
                                    value={formData.endsAt}
                                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !formData.title}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Challenge
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
