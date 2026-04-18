import { ReportWizard } from "@/components/report/report-wizard";

export default function NewReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">New Report</h2>
      </div>
      <ReportWizard />
    </div>
  );
}
