import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { REPORT_STATUSES, WASTE_CATEGORIES } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import { ArrowRight, FileText, Clock, Inbox, Star } from "lucide-react";
import { RateCollectorDialog } from "@/components/report/rate-collector-dialog";

interface RecentReportsProps {
  reports: any[];
}

const STATUS_DOT_COLORS: Record<string, string> = {
  pending: "bg-amber-500",
  assigned: "bg-blue-500",
  in_progress: "bg-purple-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

export function RecentReports({ reports }: RecentReportsProps) {
  return (
    <Card className="col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <CardTitle>Recent Reports</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {reports.length} report{reports.length !== 1 ? "s" : ""} recently
            </p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link href="/resident/reports">
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="pt-0">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm text-muted-foreground mb-1">
              No reports yet
            </p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Start making an impact by reporting waste in your neighborhood.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

            <div className="space-y-0.5">
              {reports.map((report) => {
                const status =
                  REPORT_STATUSES[
                    report.status as keyof typeof REPORT_STATUSES
                  ];
                const category = report.confirmed_class
                  ? WASTE_CATEGORIES[
                      report.confirmed_class as keyof typeof WASTE_CATEGORIES
                    ]
                  : null;
                const dotColor =
                  STATUS_DOT_COLORS[report.status] || "bg-gray-400";

                return (
                  <div
                    key={report.id}
                    className="group relative flex items-start gap-3.5 py-2.5 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors duration-150"
                  >
                    {/* Timeline dot */}
                    <div className="relative flex-shrink-0 mt-1.5 z-10">
                      <div
                        className={`w-[7px] h-[7px] rounded-full ${dotColor} ring-2 ring-card`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-medium text-sm truncate">
                          {category ? category.label : "Processing..."}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(report.created_at)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <Badge variant="secondary" className="text-[11px]">
                          {status.label}
                        </Badge>
                        {report.status === "completed" &&
                          !report.collector_rating && (
                            <RateCollectorDialog
                              reportId={report.id}
                              trigger={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[11px] px-2 gap-1"
                                >
                                  <Star className="h-2.5 w-2.5" />
                                  Rate
                                </Button>
                              }
                            />
                          )}
                        {report.collector_rating && (
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-2.5 w-2.5 ${i < report.collector_rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`}
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
