import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, MoreHorizontal, Phone, Mail, Wrench } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalRepairs: number;
  lastVisit: string;
  totalSpent: number;
}

const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "John Kamau",
    email: "john.kamau@email.com",
    phone: "+254 712 345 678",
    totalRepairs: 5,
    lastVisit: "2024-01-12",
    totalSpent: 42500,
  },
  {
    id: "2",
    name: "Mary Wanjiku",
    email: "mary.wanjiku@email.com",
    phone: "+254 723 456 789",
    totalRepairs: 3,
    lastVisit: "2024-01-12",
    totalSpent: 28000,
  },
  {
    id: "3",
    name: "David Otieno",
    email: "david.otieno@email.com",
    phone: "+254 734 567 890",
    totalRepairs: 8,
    lastVisit: "2024-01-11",
    totalSpent: 65000,
  },
  {
    id: "4",
    name: "Grace Nyambura",
    email: "grace.nyambura@email.com",
    phone: "+254 745 678 901",
    totalRepairs: 2,
    lastVisit: "2024-01-11",
    totalSpent: 15500,
  },
  {
    id: "5",
    name: "Samuel Kiprop",
    email: "samuel.kiprop@email.com",
    phone: "+254 756 789 012",
    totalRepairs: 4,
    lastVisit: "2024-01-12",
    totalSpent: 35000,
  },
  {
    id: "6",
    name: "Alice Muthoni",
    email: "alice.muthoni@email.com",
    phone: "+254 767 890 123",
    totalRepairs: 1,
    lastVisit: "2024-01-10",
    totalSpent: 8500,
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const Customers = () => {
  return (
    <MainLayout 
      title="Customers" 
      subtitle="Manage your customer database and repair history"
    >
      {/* Filters Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-9"
          />
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Total Repairs</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCustomers.map((customer) => (
              <TableRow key={customer.id} className="cursor-pointer">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">ID: CUS-{customer.id.padStart(4, "0")}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {customer.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{customer.totalRepairs}</span>
                    <span className="text-muted-foreground">repairs</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(customer.lastVisit).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="font-semibold text-foreground">
                  KES {customer.totalSpent.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </MainLayout>
  );
};

export default Customers;
