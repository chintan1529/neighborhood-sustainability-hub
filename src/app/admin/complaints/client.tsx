'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateComplaintStatus } from '@/app/actions/complaints';
import {
    MessageSquareWarning, Clock, CheckCircle2, XCircle,
    AlertTriangle, Loader2, MapPin, User, Filter, Send
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
    profiles: { full_name: string; avatar_url: string | null } | null;
    assigned_profile: { full_name: string } | null;
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

const PRIORITY_COLORS: Record<number, string> = {
    1: 'border-l-slate-300',
    2: 'border-l-blue-400',
    3: 'border-l-amber-400',
    4: 'border-l-orange-500',
    5: 'border-l-red-500',
};

export function AdminComplaintsClient({
    complaints,
}: {
    complaints: Complaint[];
    admins?: { id: string; full_name: string }[];
}) {
    const [filter, setFilter] = useState<string>('all');
    const [activeId, setActiveId] = useState<string | null>(null);
    const [responseText, setResponseText] = useState('');
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const filtered = filter === 'all'
        ? complaints
        : complaints.filter(c => c.status === filter);

    // KPIs
    const total = complaints.length;
    const open = complaints.filter(c => !['resolved', 'rejected'].includes(c.status)).length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const avgResolutionHrs = (() => {
        const resolvedOnes = complaints.filter(c => c.resolved_at && c.created_at);
        if (resolvedOnes.length === 0) return 0;
        const totalHrs = resolvedOnes.reduce((sum, c) => {
            return sum + (new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60);
        }, 0);
        return Math.round(totalHrs / resolvedOnes.length);
    })();

    const handleAction = async (complaintId: string, status: string) => {
        startTransition(async () => {
            const result = await updateComplaintStatus(
                complaintId,
                status,
                responseText || undefined,
                status === 'resolved' ? responseText || 'Issue resolved by admin.' : undefined
            );
            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: 'Updated', description: `Complaint marked as ${status.replace('_', ' ')}.` });
                setActiveId(null);
                setResponseText('');
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                        <MessageSquareWarning className="h-5 w-5 text-white" />
                    </div>
                    Complaint Management
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Review and resolve citizen grievances</p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-2xl font-bold">{total}</p>
                        <p className="text-xs text-muted-foreground">Total Complaints</p>
                    </CardContent>
                </Card>
                <Card className="border-amber-200 dark:border-amber-900/30">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-2xl font-bold text-amber-600">{open}</p>
                        <p className="text-xs text-muted-foreground">Open / Active</p>
                    </CardContent>
                </Card>
                <Card className="border-emerald-200 dark:border-emerald-900/30">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-2xl font-bold text-emerald-600">{resolved}</p>
                        <p className="text-xs text-muted-foreground">Resolved</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-2xl font-bold">{avgResolutionHrs}<span className="text-sm font-normal text-muted-foreground">h</span></p>
                        <p className="text-xs text-muted-foreground">Avg Resolution Time</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {['all', 'submitted', 'under_review', 'in_progress', 'resolved', 'rejected'].map(s => (
                    <Button
                        key={s}
                        variant={filter === s ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setFilter(s)}
                    >
                        {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
                        {s !== 'all' && (
                            <span className="ml-1 opacity-60">
                                ({complaints.filter(c => c.status === s).length})
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {/* Complaints List */}
            {filtered.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                        <p className="text-muted-foreground">No complaints matching this filter.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map(complaint => {
                        const cat = CATEGORIES[complaint.category] || CATEGORIES.other;
                        const st = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.submitted;
                        const StatusIcon = st.icon;
                        const isActive = activeId === complaint.id;
                        const borderColor = PRIORITY_COLORS[complaint.priority] || 'border-l-gray-300';

                        return (
                            <Card
                                key={complaint.id}
                                className={`border-l-4 ${borderColor} transition-all duration-200 ${isActive ? 'shadow-lg ring-1 ring-rose-200 dark:ring-rose-900/40' : 'hover:shadow-md'}`}
                            >
                                <CardContent className="py-4">
                                    {/* Main row */}
                                    <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => setActiveId(isActive ? null : complaint.id)}>
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <span className="text-xl flex-shrink-0">{cat.emoji}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-semibold text-sm">{complaint.title}</h3>
                                                    <Badge variant="secondary" className={`text-[10px] border-none ${st.color}`}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {st.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{complaint.description}</p>
                                                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-2.5 w-2.5" />
                                                        {complaint.profiles?.full_name || 'Unknown User'}
                                                    </span>
                                                    <span>·</span>
                                                    <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                                                    <span>·</span>
                                                    <span>{cat.label}</span>
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
                                    </div>

                                    {/* Expanded admin panel */}
                                    {isActive && (
                                        <div className="mt-4 pt-4 border-t space-y-4 animate-in slide-in-from-top-2 duration-300">
                                            {/* Full description */}
                                            <div className="bg-muted/50 rounded-lg p-3">
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Full Description</p>
                                                <p className="text-sm">{complaint.description}</p>
                                            </div>

                                            {/* Response input */}
                                            {!['resolved', 'rejected'].includes(complaint.status) && (
                                                <div className="space-y-3">
                                                    <Textarea
                                                        placeholder="Write your response or resolution notes..."
                                                        value={responseText}
                                                        onChange={e => setResponseText(e.target.value)}
                                                        rows={3}
                                                    />
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {complaint.status === 'submitted' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                                                disabled={isPending}
                                                                onClick={() => handleAction(complaint.id, 'under_review')}
                                                            >
                                                                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                                                Start Review
                                                            </Button>
                                                        )}
                                                        {['submitted', 'under_review'].includes(complaint.status) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-violet-600 border-violet-200 hover:bg-violet-50"
                                                                disabled={isPending}
                                                                onClick={() => handleAction(complaint.id, 'in_progress')}
                                                            >
                                                                <Send className="h-3.5 w-3.5 mr-1" />
                                                                Mark In Progress
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                                            disabled={isPending}
                                                            onClick={() => handleAction(complaint.id, 'resolved')}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                                            Resolve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                                            disabled={isPending}
                                                            onClick={() => handleAction(complaint.id, 'rejected')}
                                                        >
                                                            <XCircle className="h-3.5 w-3.5 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Show existing response */}
                                            {complaint.admin_response && (
                                                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                                                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Admin Response</p>
                                                    <p className="text-sm">{complaint.admin_response}</p>
                                                </div>
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
