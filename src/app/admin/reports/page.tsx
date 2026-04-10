import { createClient, createAdminClient } from '@/lib/supabase/server';
import { calculateBatchPriority, getTierLabel, type PriorityInput } from '@/lib/priority-engine';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { REPORT_STATUSES } from '@/lib/constants';
import Link from 'next/link';
import { ReportViewDialog } from '@/components/admin/report-view-dialog';

// Force dynamic rendering for fresh data
export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Use admin client to fetch all reports regardless of RLS
    const adminClient = createAdminClient();

    const { data: reports, error } = await adminClient
        .from('waste_reports')
        .select('*, profiles!waste_reports_user_id_fkey(full_name)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Fetch reports error:', error);
    }

    // Calculate priorities for active reports
    const activeReports = (reports || []).filter((r: any) => ['pending', 'assigned', 'in_progress'].includes(r.status));
    const priorityInputs: PriorityInput[] = activeReports.map((r: any) => ({
        id: r.id,
        wasteType: r.confirmed_class || r.predicted_class || 'mixed',
        createdAt: r.created_at,
        quantity: r.quantity_estimate,
        latitude: r.latitude,
        longitude: r.longitude,
        predictionConfidence: r.prediction_confidence,
        status: r.status,
    }));
    const priorities = calculateBatchPriority(priorityInputs);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Reports Management</h2>
                <Link href="/admin/export">
                    <Button>Export CSV</Button>
                </Link>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports?.map((report: any) => {
                            const status = REPORT_STATUSES[report.status as keyof typeof REPORT_STATUSES] || {
                                label: report.status,
                                color: 'text-gray-500'
                            };
                            return (
                                <TableRow key={report.id}>
                                    <TableCell className="font-mono text-xs">
                                        {report.id.substring(0, 8)}...
                                    </TableCell>
                                    <TableCell>
                                        {report.profiles?.full_name || 'Unknown'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={status.color.replace('text-', 'border-')}>
                                            {status.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {(() => {
                                            const p = priorities.get(report.id);
                                            if (!p) return <span className="text-xs text-muted-foreground">—</span>;
                                            return (
                                                <Badge variant="outline" className={`text-[10px] ${p.color} ${p.borderColor} ${p.darkBorderColor}`}>
                                                    {p.icon} {getTierLabel(p.tier)} ({p.score})
                                                </Badge>
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                        {report.confirmed_class || report.predicted_class || 'Processing'}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={report.address_text}>
                                        {report.address_text || 'No address'}
                                    </TableCell>
                                    <TableCell>{formatDate(report.created_at)}</TableCell>
                                    <TableCell>
                                        <ReportViewDialog report={report} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {(!reports || reports.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No reports found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
