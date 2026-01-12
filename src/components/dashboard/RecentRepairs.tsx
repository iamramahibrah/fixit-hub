import { Monitor, Smartphone, Laptop, Printer, MoreHorizontal } from "lucide-react";
import { RepairStatusBadge, RepairStatus } from "./RepairStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Repair {
  id: string;
  ticketNumber: string;
  deviceType: "laptop" | "desktop" | "phone" | "printer";
  brand: string;
  model: string;
  customer: string;
  technician: string;
  status: RepairStatus;
  createdAt: string;
}

const deviceIcons = {
  laptop: Laptop,
  desktop: Monitor,
  phone: Smartphone,
  printer: Printer,
};

const mockRepairs: Repair[] = [
  {
    id: "1",
    ticketNumber: "REP-001",
    deviceType: "laptop",
    brand: "HP",
    model: "EliteBook 840",
    customer: "John Kamau",
    technician: "Peter Ochieng",
    status: "repairing",
    createdAt: "2024-01-12",
  },
  {
    id: "2",
    ticketNumber: "REP-002",
    deviceType: "phone",
    brand: "Samsung",
    model: "Galaxy S23",
    customer: "Mary Wanjiku",
    technician: "James Mwangi",
    status: "diagnosing",
    createdAt: "2024-01-12",
  },
  {
    id: "3",
    ticketNumber: "REP-003",
    deviceType: "desktop",
    brand: "Dell",
    model: "OptiPlex 7090",
    customer: "David Otieno",
    technician: "Peter Ochieng",
    status: "waiting",
    createdAt: "2024-01-11",
  },
  {
    id: "4",
    ticketNumber: "REP-004",
    deviceType: "printer",
    brand: "Epson",
    model: "L3150",
    customer: "Grace Nyambura",
    technician: "James Mwangi",
    status: "completed",
    createdAt: "2024-01-11",
  },
  {
    id: "5",
    ticketNumber: "REP-005",
    deviceType: "laptop",
    brand: "Lenovo",
    model: "ThinkPad X1",
    customer: "Samuel Kiprop",
    technician: "Peter Ochieng",
    status: "received",
    createdAt: "2024-01-12",
  },
];

export function RecentRepairs() {
  return (
    <div className="rounded-xl border bg-card shadow-card animate-slide-up">
      <div className="flex items-center justify-between border-b p-5">
        <div>
          <h3 className="font-semibold text-foreground">Recent Repairs</h3>
          <p className="text-sm text-muted-foreground">Latest repair jobs and their status</p>
        </div>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px]">Ticket</TableHead>
            <TableHead>Device</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Technician</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockRepairs.map((repair) => {
            const DeviceIcon = deviceIcons[repair.deviceType];
            return (
              <TableRow key={repair.id} className="cursor-pointer">
                <TableCell className="font-medium text-primary">
                  {repair.ticketNumber}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{repair.brand} {repair.model}</p>
                      <p className="text-xs text-muted-foreground capitalize">{repair.deviceType}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-foreground">{repair.customer}</TableCell>
                <TableCell className="text-muted-foreground">{repair.technician}</TableCell>
                <TableCell>
                  <RepairStatusBadge status={repair.status} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
