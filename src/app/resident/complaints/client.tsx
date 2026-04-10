'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { submitComplaint } from '@/app/actions/complaints';
import {
    MessageSquareWarning, Plus, Clock, CheckCircle2, XCircle,
    AlertTriangle, Loader2, MapPin, ChevronDown, ChevronUp
} from 'lucide-react';

interface Complaint {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority: number;
    address_text: string | null;
    admin_response: string | null;
    resolution_notes: string | null;
    created_at: string;
    resolved_at: string | null;
}

const CATEGORIES: Record<string, { label: string; emoji: string }> = {
    missed_pickup: { label: 'Missed Pickup', emoji: '🚛' },
    illegal_dumping: { label: 'Illegal Dumping', emoji: '🚯' },
    overflowing_bin: { label: 'Overflowing Bin', emoji: '🗑️' },
    service_quality: { label: 'Service Quality', emoji: '⭐' },
    damaged_bin: { label: 'Damaged Bin', emoji: '🔧' },
    noise_complaint: { label: 'Noise Complaint', emoji: '🔊' },
    hazardous_waste: { label: 'Hazardous Waste', emoji: '☣️' },
    other: { label: 'Other', emoji: '📝' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400', icon: Clock },
    under_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', icon: AlertTriangle },
    in_progress: { label: 'In Progress', color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400', icon: Loader2 },
    resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', icon: CheckCircle2 },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400', icon: XCircle },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: 'Low', color: 'text-slate-500' },
    2: { label: 'Medium', color: 'text-blue-500' },
    3: { label: 'High', color: 'text-amber-500' },
    4: { label: 'Urgent', color: 'text-orange-500' },
    5: { label: 'Critical', color: 'text-red-500' },
};

export function ComplaintsClient({ complaints }: { complaints: Complaint[] }) {
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            const result = await submitComplaint(formData);
            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: 'Complaint Submitted', description: 'Your complaint has been registered and will be reviewed shortly.' });
                setShowForm(false);
            }
        });
    };

    const activeCount = complaints.filter(c => !['resolved', 'rejected'].includes(c.status)).length;
    const resolvedCount = complaints.filter(c => c.status === 'resolved').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                            <MessageSquareWarning className="h-5 w-5 text-white" />
                        </div>
                        My Complaints
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {activeCount} active · {resolvedCount} resolved
                    </p>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Complaint
                </Button>
            </div>

            {/* Submission Form */}
            {showForm && (
                <Card className="border-rose-200 dark:border-rose-900/30 animate-in slide-in-from-top-4 duration-300">
                    <CardHeader>
                        <CardTitle className="text-lg">Submit a Complaint</CardTitle>
                        <CardDescription>Describe your issue and we'll address it as soon as possible</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleSubmit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input id="title" name="title" placeholder="Brief summary of the issue" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category *</Label>
                                    <Select name="category" required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
                                                <SelectItem key={key} value={key}>
                                                    {emoji} {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Provide details about the issue — what happened, when, how it affects you..."
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select name="priority" defaultValue="2">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(PRIORITY_LABELS).map(([key, { label }]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Location (optional)</Label>
                                    <Input id="address" name="address" placeholder="Street address or landmark" />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Submit Complaint
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Complaints List */}
            {complaints.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <MessageSquareWarning className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No complaints yet. Everything running smoothly!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {complaints.map(complaint => {
                        const cat = CATEGORIES[complaint.category] || CATEGORIES.other;
                        const st = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.submitted;
                        const StatusIcon = st.icon;
                        const pri = PRIORITY_LABELS[complaint.priority] || PRIORITY_LABELS[2];
                        const isExpanded = expandedId === complaint.id;

                        return (
                            <Card
                                key={complaint.id}
                                className={`transition-all duration-200 cursor-pointer hover:shadow-md ${
                                    complaint.status === 'resolved' ? 'opacity-70' : ''
                                }`}
                                onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <span className="text-2xl flex-shrink-0 mt-0.5">{cat.emoji}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-semibold text-sm truncate">{complaint.title}</h3>
                                                    <Badge variant="secondary" className={`text-[10px] ${st.color} border-none`}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {st.label}
                                                    </Badge>
                                                    <span className={`text-[10px] font-medium ${pri.color}`}>
                                                        {pri.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                    {complaint.description}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                                    <span>{cat.label}</span>
                                                    <span>·</span>
                                                    <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                                                    {complaint.address_text && (
                                                        <>
                                                            <span>·</span>
                                                            <span className="flex items-center gap-0.5">
                                                                <MapPin className="h-2.5 w-2.5" />
                                                                {complaint.address_text}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        )}
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Full Description</p>
                                                <p className="text-sm">{complaint.description}</p>
                                            </div>
                                            {complaint.admin_response && (
                                                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                                                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Admin Response</p>
                                                    <p className="text-sm">{complaint.admin_response}</p>
                                                </div>
                                            )}
                                            {complaint.resolution_notes && (
                                                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3">
                                                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Resolution</p>
                                                    <p className="text-sm">{complaint.resolution_notes}</p>
                                                </div>
                                            )}
                                            {complaint.resolved_at && (
                                                <p className="text-[10px] text-muted-foreground">
                                                    Resolved on {new Date(complaint.resolved_at).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
