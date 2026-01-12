import { MainLayout } from "@/components/layout/MainLayout";
import { RepairStatusBadge, RepairStatus } from "@/components/dashboard/RepairStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Monitor, Smartphone, Laptop, Printer, MoreHorizontal, Search, Filter, Plus } from "lucide-react";

interface Repair {
  id: string;
  ticketNumber: string;
  deviceType: "laptop" | "desktop" | "phone" | "printer";
  brand: string;
  model: string;
  problem: string;
  customer: string;
  phone: string;
  technician: string;
  status: RepairStatus;
  estimatedCost: number;
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
    problem: "Screen flickering and battery not charging",
    customer: "John Kamau",
    phone: "+254 712 345 678",
    technician: "Peter Ochieng",
    status: "repairing",
    estimatedCost: 8500,
    createdAt: "2024-01-12",
  },
  {
    id: "2",
    ticketNumber: "REP-002",
    deviceType: "phone",
    brand: "Samsung",
    model: "Galaxy S23",
    problem: "Cracked screen replacement needed",
    customer: "Mary Wanjiku",
    phone: "+254 723 456 789",
    technician: "James Mwangi",
    status: "diagnosing",
    estimatedCost: 12000,
    createdAt: "2024-01-12",
  },
  {
    id: "3",
    ticketNumber: "REP-003",
    deviceType: "desktop",
    brand: "Dell",
    model: "OptiPlex 7090",
    problem: "Not booting, possible motherboard issue",
    customer: "David Otieno",
    phone: "+254 734 567 890",
    technician: "Peter Ochieng",
    status: "waiting",
    estimatedCost: 15000,
    createdAt: "2024-01-11",
  },
  {
    id: "4",
    ticketNumber: "REP-004",
    deviceType: "printer",
    brand: "Epson",
    model: "L3150",
    problem: "Paper jam and ink system cleaning",
    customer: "Grace Nyambura",
    phone: "+254 745 678 901",
    technician: "James Mwangi",
    status: "completed",
    estimatedCost: 3500,
    createdAt: "2024-01-11",
  },
  {
    id: "5",
    ticketNumber: "REP-005",
    deviceType: "laptop",
    brand: "Lenovo",
    model: "ThinkPad X1",
    problem: "Keyboard not working, needs replacement",
    customer: "Samuel Kiprop",
    phone: "+254 756 789 012",
    technician: "Peter Ochieng",
    status: "received",
    estimatedCost: 6500,
    createdAt: "2024-01-12",
  },
  {
    id: "6",
    ticketNumber: "REP-006",
    deviceType: "phone",
    brand: "iPhone",
    model: "14 Pro",
    problem: "Water damage, not turning on",
    customer: "Alice Muthoni",
    phone: "+254 767 890 123",
    technician: "Sarah Achieng",
    status: "unrepairable",
    estimatedCost: 0,
    createdAt: "2024-01-10",
  },
];

const Repairs = () => {
  return (
    <MainLayout 
      title="Repairs" 
      subtitle="Manage all repair jobs and track their progress"
    >
      {/* Filters Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by ticket, customer, device..."
              className="pl-9"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="diagnosing">Diagnosing</SelectItem>
              <SelectItem value="waiting">Waiting for Parts</SelectItem>
              <SelectItem value="repairing">Repairing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="unrepairable">Unrepairable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Repair Job
        </Button>
      </div>

      {/* Repairs Table */}
      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px]">Ticket</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Problem</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Est. Cost</TableHead>
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
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{repair.brand} {repair.model}</p>
                        <p className="text-xs text-muted-foreground capitalize">{repair.deviceType}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[200px] truncate text-sm text-foreground">
                      {repair.problem}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{repair.customer}</p>
                      <p className="text-xs text-muted-foreground">{repair.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{repair.technician}</TableCell>
                  <TableCell className="font-medium text-foreground">
                    {repair.estimatedCost > 0 ? `KES ${repair.estimatedCost.toLocaleString()}` : "-"}
                  </TableCell>
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
    </MainLayout>
  );
};

export default Repairs;
