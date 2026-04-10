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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { createWorkshop } from '@/app/actions/admin';
import { useToast } from '@/hooks/use-toast';

export function WorkshopFormDialog() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        shortDescription: '',
        description: '',
        type: 'workshop',
        locationType: 'in-person',
        location: '',
        maxParticipants: '',
        pointsReward: '50',
        startsAt: '',
        endsAt: '',
        tags: '',
    });

    const resetForm = () => {
        setFormData({
            title: '',
            shortDescription: '',
            description: '',
            type: 'workshop',
            locationType: 'in-person',
            location: '',
            maxParticipants: '',
            pointsReward: '50',
            startsAt: '',
            endsAt: '',
            tags: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const form = new FormData();
        form.append('title', formData.title);
        form.append('shortDescription', formData.shortDescription);
        form.append('description', formData.description);
        form.append('type', formData.type);
        form.append('locationType', formData.locationType);
        form.append('location', formData.location);
        form.append('maxParticipants', formData.maxParticipants);
        form.append('pointsReward', formData.pointsReward);
        form.append('startsAt', formData.startsAt);
        form.append('endsAt', formData.endsAt);
        form.append('tags', formData.tags);

        const result = await createWorkshop(form);

        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error,
            });
        } else {
            toast({
                title: 'Success',
                description: 'Workshop created successfully!',
            });
            setOpen(false);
            resetForm();
        }
        setIsLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Workshop
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Workshop</DialogTitle>
                        <DialogDescription>
                            Set up a new workshop, campaign, training, or event for the community.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Title */}
                        <div className="grid gap-2">
                            <Label htmlFor="ws-title">Title *</Label>
                            <Input
                                id="ws-title"
                                placeholder="e.g., Composting 101: Turn Waste into Garden Gold"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        {/* Short Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="ws-short-desc">Short Description</Label>
                            <Input
                                id="ws-short-desc"
                                placeholder="Brief one-line summary shown on cards"
                                value={formData.shortDescription}
                                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                            />
                        </div>

                        {/* Full Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="ws-description">Full Description</Label>
                            <Textarea
                                id="ws-description"
                                placeholder="Detailed description of what the workshop covers..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        {/* Type & Location Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Type *</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="workshop">🛠️ Workshop</SelectItem>
                                        <SelectItem value="campaign">📢 Campaign</SelectItem>
                                        <SelectItem value="training">📚 Training</SelectItem>
                                        <SelectItem value="event">🎉 Event</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Location Type *</Label>
                                <Select
                                    value={formData.locationType}
                                    onValueChange={(value) => setFormData({ ...formData, locationType: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select location type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in-person">🏢 In-Person</SelectItem>
                                        <SelectItem value="online">💻 Online</SelectItem>
                                        <SelectItem value="hybrid">🔗 Hybrid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="grid gap-2">
                            <Label htmlFor="ws-location">Location / Venue</Label>
                            <Input
                                id="ws-location"
                                placeholder="e.g., Community Center, Main Road or Zoom link"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>

                        {/* Start & End Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ws-starts">Start Date & Time *</Label>
                                <Input
                                    id="ws-starts"
                                    type="datetime-local"
                                    value={formData.startsAt}
                                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ws-ends">End Date & Time</Label>
                                <Input
                                    id="ws-ends"
                                    type="datetime-local"
                                    value={formData.endsAt}
                                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Max Participants & Points */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ws-max">Max Participants</Label>
                                <Input
                                    id="ws-max"
                                    type="number"
                                    min="1"
                                    placeholder="Leave empty for unlimited"
                                    value={formData.maxParticipants}
                                    onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">Leave empty for no limit</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="ws-points">Points Reward *</Label>
                                <Input
                                    id="ws-points"
                                    type="number"
                                    min="0"
                                    placeholder="50"
                                    value={formData.pointsReward}
                                    onChange={(e) => setFormData({ ...formData, pointsReward: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Points awarded for attending</p>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="grid gap-2">
                            <Label htmlFor="ws-tags">Tags</Label>
                            <Input
                                id="ws-tags"
                                placeholder="composting, organic, beginner (comma-separated)"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Separate tags with commas</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !formData.title || !formData.startsAt}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Workshop
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
