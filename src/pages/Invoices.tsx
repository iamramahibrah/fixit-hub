import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, MoreHorizontal, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  ticketNumber: string;
  customer: string;
  device: string;
  laborCost: number;
  partsCost: number;
  discount: number;
  total: number;
  paymentMethod: "cash" | "mpesa" | "card" | "pending";
  status: "paid" | "pending" | "overdue";
  createdAt: string;
}

const mockInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-0001",
    ticketNumber: "REP-001",
    customer: "John Kamau",
    device: "HP EliteBook 840",
    laborCost: 3500,
    partsCost: 5000,
    discount: 0,
    total: 8500,
    paymentMethod: "mpesa",
    status: "paid",
    createdAt: "2024-01-12",
  },
  {
    id: "2",
    invoiceNumber: "INV-0002",
    ticketNumber: "REP-002",
    customer: "Mary Wanjiku",
    device: "Samsung Galaxy S23",
    laborCost: 2000,
    partsCost: 10000,
    discount: 500,
    total: 11500,
    paymentMethod: "pending",
    status: "pending",
    createdAt: "2024-01-12",
  },
  {
    id: "3",
    invoiceNumber: "INV-0003",
    ticketNumber: "REP-003",
    customer: "David Otieno",
    device: "Dell OptiPlex 7090",
    laborCost: 5000,
    partsCost: 8000,
    discount: 1000,
    total: 12000,
    paymentMethod: "cash",
    status: "paid",
    createdAt: "2024-01-11",
  },
  {
    id: "4",
    invoiceNumber: "INV-0004",
    ticketNumber: "REP-004",
    customer: "Grace Nyambura",
    device: "Epson L3150",
    laborCost: 1500,
    partsCost: 2000,
    discount: 0,
    total: 3500,
    paymentMethod: "mpesa",
    status: "paid",
    createdAt: "2024-01-11",
  },
  {
    id: "5",
    invoiceNumber: "INV-0005",
    ticketNumber: "REP-005",
    customer: "Samuel Kiprop",
    device: "Lenovo ThinkPad X1",
    laborCost: 2500,
    partsCost: 4000,
    discount: 0,
    total: 6500,
    paymentMethod: "pending",
    status: "overdue",
    createdAt: "2024-01-08",
  },
];

const statusStyles = {
  paid: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
};

const paymentMethodLabels = {
  cash: "Cash",
  mpesa: "M-Pesa",
  card: "Card",
  pending: "Pending",
};

const Invoices = () => {
  return (
    <MainLayout 
      title="Invoices" 
      subtitle="Manage billing and payment records"
    >
      {/* Filters Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            className="pl-9"
          />
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Invoices Table */}
      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Labor</TableHead>
              <TableHead>Parts</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockInvoices.map((invoice) => (
              <TableRow key={invoice.id} className="cursor-pointer">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-primary">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{invoice.ticketNumber}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-foreground">{invoice.customer}</TableCell>
                <TableCell className="text-muted-foreground">{invoice.device}</TableCell>
                <TableCell className="text-foreground">KES {invoice.laborCost.toLocaleString()}</TableCell>
                <TableCell className="text-foreground">KES {invoice.partsCost.toLocaleString()}</TableCell>
                <TableCell className="font-semibold text-foreground">
                  KES {invoice.total.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {paymentMethodLabels[invoice.paymentMethod]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("capitalize", statusStyles[invoice.status])}
                  >
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </MainLayout>
  );
};

export default Invoices;
