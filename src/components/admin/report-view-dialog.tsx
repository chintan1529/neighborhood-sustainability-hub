'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Eye, MapPin, Calendar, User, Tag, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { REPORT_STATUSES } from '@/lib/constants';

interface ReportViewDialogProps {
    report: any;
}

export function ReportViewDialog({ report }: ReportViewDialogProps) {
    const [open, setOpen] = useState(false);

    const status = REPORT_STATUSES[report.status as keyof typeof REPORT_STATUSES] || {
        label: report.status,
        color: 'text-gray-500'
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Report Details
                    </DialogTitle>
                    <DialogDescription>
                        Report ID: {report.id}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant="outline" className={status.color.replace('text-', 'border-')}>
                            {status.label}
                        </Badge>
                    </div>

                    {/* Category */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Category
                        </span>
                        <span className="font-medium capitalize">
                            {report.confirmed_class || report.predicted_class || 'Processing'}
                        </span>
                    </div>

                    {/* User */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Reported By
                        </span>
                        <span className="font-medium">
                            {report.profiles?.full_name || 'Unknown'}
                        </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Location
                        </span>
                        <span className="font-medium max-w-[250px] text-right">
                            {report.address_text || 'No address provided'}
                        </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Created
                        </span>
                        <span className="font-medium">
                            {formatDate(report.created_at)}
                        </span>
                    </div>

                    {/* Quantity */}
                    {report.quantity_estimate && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Quantity Estimate</span>
                            <span className="font-medium">{report.quantity_estimate}</span>
                        </div>
                    )}

                    {/* Notes */}
                    {report.notes && (
                        <div className="border-t pt-4">
                            <span className="text-sm text-muted-foreground">Notes</span>
                            <p className="mt-1 text-sm">{report.notes}</p>
                        </div>
                    )}

                    {/* Image */}
                    {report.image_url && (
                        <div className="border-t pt-4">
                            <span className="text-sm text-muted-foreground">Attached Image</span>
                            <img
                                src={report.image_url}
                                alt="Report image"
                                className="mt-2 rounded-lg max-h-[200px] object-cover"
                            />
                        </div>
                    )}

                    {/* Coordinates */}
                    {report.latitude && report.longitude && (
                        <div className="border-t pt-4 text-xs text-muted-foreground">
                            Coordinates: {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
