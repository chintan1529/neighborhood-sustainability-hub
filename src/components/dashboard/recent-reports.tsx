import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { REPORT_STATUSES, WASTE_CATEGORIES } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils';
import { ArrowRight, FileText, Clock, Inbox, Star } from 'lucide-react';
import { RateCollectorDialog } from '@/components/report/rate-collector-dialog';

interface RecentReportsProps {
    reports: any[];
}

const STATUS_DOT_COLORS: Record<string, string> = {
    pending: 'bg-amber-500',
    assigned: 'bg-blue-500',
    in_progress: 'bg-purple-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-red-500',
};

export function RecentReports({ reports }: RecentReportsProps) {
    return (
        <Card className="col-span-1 shadow-subtle hover:shadow-soft transition-all duration-300 overflow-hidden border border-border/60">
            {/* Header with gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-60" />

            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                        <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold">Recent Reports</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {reports.length} report{reports.length !== 1 ? 's' : ''} recently
                        </p>
                    </div>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600">
                    <Link href="/resident/reports">
                        View All <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardHeader>

            <CardContent className="pt-0">
                {reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                            <Inbox className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="font-medium text-sm text-muted-foreground mb-1">No reports yet</p>
                        <p className="text-xs text-muted-foreground/70 max-w-[200px]">
                            Start making an impact by reporting waste in your neighborhood!
                        </p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-border via-border to-transparent" />

                        <div className="space-y-1">
                            {reports.map((report) => {
                                const status = REPORT_STATUSES[report.status as keyof typeof REPORT_STATUSES];
                                const category = report.confirmed_class
                                    ? WASTE_CATEGORIES[report.confirmed_class as keyof typeof WASTE_CATEGORIES]
                                    : null;
                                const dotColor = STATUS_DOT_COLORS[report.status] || 'bg-gray-400';
                                const isPending = report.status === 'pending';

                                return (
                                    <div
                                        key={report.id}
                                        className="group relative flex items-start gap-4 py-3 px-3 -mx-3 rounded-lg hover:bg-muted/40 transition-colors duration-200"
                                    >
                                        {/* Timeline dot */}
                                        <div className="relative flex-shrink-0 mt-1.5 z-10">
                                            <div className={`w-[9px] h-[9px] rounded-full ${dotColor} ring-2 ring-card`} />
                                            {isPending && (
                                                <div className={`absolute inset-0 w-[9px] h-[9px] rounded-full ${dotColor} animate-ping opacity-75`} />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <span className="font-medium text-sm truncate">
                                                    {category ? category.label : 'Processing...'}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {formatRelativeTime(report.created_at)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-[10px] px-2 py-0.5 font-medium ${status.color.replace('text-', 'text-')}`}
                                                >
                                                    {status.label}
                                                </Badge>
                                                {report.status === 'completed' && !report.collector_rating && (
                                                    <RateCollectorDialog 
                                                        reportId={report.id} 
                                                        trigger={
                                                            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 dark:text-amber-400 dark:border-amber-800">
                                                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                                                Rate Collector
                                                            </Button>
                                                        }
                                                    />
                                                )}
                                                {report.collector_rating && (
                                                    <div className="flex items-center gap-0.5" title={report.collector_review ? `Review: "${report.collector_review}"` : `Rated ${report.collector_rating} stars`}>
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star 
                                                                key={i} 
                                                                className={`h-2.5 w-2.5 ${i < report.collector_rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30'}`} 
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
