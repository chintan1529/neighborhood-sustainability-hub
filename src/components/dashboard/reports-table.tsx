'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { REPORT_STATUSES, WASTE_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BeforeAfterSlider } from '@/components/ui/before-after-slider';
import { ArrowLeftRight, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ReportsTableProps {
    reports: any[];
}

export function ReportsTable({ reports }: ReportsTableProps) {
    const supabase = createClient();
    
    if (reports.length === 0) {
        return (
            <div className="text-center py-10 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">No reports found.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports.map((report) => {
                        const status = REPORT_STATUSES[report.status as keyof typeof REPORT_STATUSES];
                        const category = report.confirmed_class
                            ? WASTE_CATEGORIES[report.confirmed_class as keyof typeof WASTE_CATEGORIES]
                            : null;

                        return (
                            <TableRow key={report.id}>
                                <TableCell className="font-medium">{formatDate(report.created_at)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {category && <span>{category.icon}</span>}
                                        <span className="capitalize">{report.confirmed_class || 'Processing'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={status.color.replace('text-', 'border-')}>
                                        {status.label}
                                    </Badge>
                                </TableCell>
                                <TableCell>{report.points_awarded || '-'}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={report.address_text}>
                                    {report.address_text || 'Unknown location'}
                                </TableCell>
                                <TableCell className="text-right">
                                    {report.status === 'completed' && report.completion_photo_url && report.photo_url ? (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200">
                                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                                    View Cleanup
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl sm:max-w-4xl p-0 overflow-hidden bg-black/95 border-border/50">
                                                <DialogHeader className="p-4 inset-x-0 absolute top-0 z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                                                    <DialogTitle className="text-white text-lg font-medium drop-shadow-md">
                                                        Cleanup Transformation
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <div className="w-full h-full flex items-center justify-center p-4 pt-16 pb-12">
                                                    <BeforeAfterSlider 
                                                        beforeImage={supabase.storage.from('report-photos').getPublicUrl(report.photo_url).data.publicUrl}
                                                        afterImage={supabase.storage.from('proofs').getPublicUrl(report.completion_photo_url).data.publicUrl}
                                                        className="max-h-[70vh] w-auto mx-auto object-contain rounded-lg ring-1 ring-white/20 shadow-2xl"
                                                    />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    ) : report.photo_url ? (
                                        <div className="flex items-center justify-end">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl bg-black/95 border-border/50 p-4">
                                                    <img 
                                                        src={supabase.storage.from('report-photos').getPublicUrl(report.photo_url).data.publicUrl}
                                                        alt="Report Item"
                                                        className="w-full max-h-[70vh] object-contain rounded-md"
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground/50 text-xs">—</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
