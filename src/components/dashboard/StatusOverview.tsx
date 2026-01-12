import { cn } from "@/lib/utils";

interface StatusItem {
  status: string;
  count: number;
  color: string;
  percentage: number;
}

const statusData: StatusItem[] = [
  { status: "Received", count: 8, color: "bg-status-received", percentage: 15 },
  { status: "Diagnosing", count: 12, color: "bg-status-diagnosing", percentage: 22 },
  { status: "Waiting for Parts", count: 6, color: "bg-status-waiting", percentage: 11 },
  { status: "Repairing", count: 18, color: "bg-status-repairing", percentage: 33 },
  { status: "Completed", count: 45, color: "bg-status-completed", percentage: 19 },
];

export function StatusOverview() {
  const totalActive = statusData.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-card animate-slide-up">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Repair Status Overview</h3>
        <p className="text-sm text-muted-foreground">{totalActive} total active repairs</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 flex h-3 overflow-hidden rounded-full bg-muted">
        {statusData.map((item, index) => (
          <div
            key={item.status}
            className={cn("h-full transition-all duration-500", item.color)}
            style={{ width: `${item.percentage}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {statusData.map((item) => (
          <div key={item.status} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
              <span className="text-sm text-foreground">{item.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">{item.count}</span>
              <span className="text-xs text-muted-foreground w-10 text-right">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
