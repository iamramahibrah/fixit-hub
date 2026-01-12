import { cn } from "@/lib/utils";

export type RepairStatus = 
  | "received" 
  | "diagnosing" 
  | "waiting" 
  | "repairing" 
  | "completed" 
  | "unrepairable";

interface RepairStatusBadgeProps {
  status: RepairStatus;
}

const statusConfig: Record<RepairStatus, { label: string; className: string }> = {
  received: {
    label: "Received",
    className: "bg-status-received/20 text-foreground/70 border-status-received/30",
  },
  diagnosing: {
    label: "Diagnosing",
    className: "bg-status-diagnosing/15 text-status-diagnosing border-status-diagnosing/30",
  },
  waiting: {
    label: "Waiting for Parts",
    className: "bg-status-waiting/15 text-status-waiting border-status-waiting/30",
  },
  repairing: {
    label: "Repairing",
    className: "bg-status-repairing/15 text-status-repairing border-status-repairing/30",
  },
  completed: {
    label: "Completed",
    className: "bg-status-completed/15 text-status-completed border-status-completed/30",
  },
  unrepairable: {
    label: "Unrepairable",
    className: "bg-status-unrepairable/15 text-status-unrepairable border-status-unrepairable/30",
  },
};

export function RepairStatusBadge({ status }: RepairStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
      config.className
    )}>
      <span className={cn(
        "mr-1.5 h-1.5 w-1.5 rounded-full",
        status === "received" && "bg-foreground/50",
        status === "diagnosing" && "bg-status-diagnosing animate-pulse-soft",
        status === "waiting" && "bg-status-waiting",
        status === "repairing" && "bg-status-repairing animate-pulse-soft",
        status === "completed" && "bg-status-completed",
        status === "unrepairable" && "bg-status-unrepairable"
      )} />
      {config.label}
    </span>
  );
}
