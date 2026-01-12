import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Plus, Star, Wrench, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string[];
  activeJobs: number;
  completedJobs: number;
  rating: number;
  status: "available" | "busy" | "offline";
}

const mockTechnicians: Technician[] = [
  {
    id: "1",
    name: "Peter Ochieng",
    email: "peter.ochieng@repairdesk.co.ke",
    phone: "+254 712 111 222",
    specialization: ["Laptops", "Desktops", "Networking"],
    activeJobs: 3,
    completedJobs: 156,
    rating: 4.8,
    status: "busy",
  },
  {
    id: "2",
    name: "James Mwangi",
    email: "james.mwangi@repairdesk.co.ke",
    phone: "+254 723 222 333",
    specialization: ["Phones", "Tablets", "Printers"],
    activeJobs: 4,
    completedJobs: 142,
    rating: 4.6,
    status: "busy",
  },
  {
    id: "3",
    name: "Sarah Achieng",
    email: "sarah.achieng@repairdesk.co.ke",
    phone: "+254 734 333 444",
    specialization: ["Phones", "Data Recovery"],
    activeJobs: 2,
    completedJobs: 98,
    rating: 4.9,
    status: "available",
  },
  {
    id: "4",
    name: "Michael Njoroge",
    email: "michael.njoroge@repairdesk.co.ke",
    phone: "+254 745 444 555",
    specialization: ["Networking", "Servers", "CCTV"],
    activeJobs: 0,
    completedJobs: 87,
    rating: 4.5,
    status: "offline",
  },
];

const statusStyles = {
  available: "bg-success/15 text-success border-success/30",
  busy: "bg-warning/15 text-warning border-warning/30",
  offline: "bg-muted text-muted-foreground border-muted-foreground/20",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const Technicians = () => {
  return (
    <MainLayout 
      title="Technicians" 
      subtitle="Manage your repair team and track performance"
    >
      {/* Filters Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search technicians..."
            className="pl-9"
          />
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Technician
        </Button>
      </div>

      {/* Technicians Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockTechnicians.map((tech) => (
          <div
            key={tech.id}
            className="rounded-xl border bg-card p-5 shadow-card transition-all duration-300 hover:shadow-card-hover cursor-pointer animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(tech.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground">{tech.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-medium text-foreground">{tech.rating}</span>
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn("capitalize text-xs", statusStyles[tech.status])}
              >
                {tech.status}
              </Badge>
            </div>

            {/* Specializations */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {tech.specialization.map((spec) => (
                <Badge
                  key={spec}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {spec}
                </Badge>
              ))}
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wrench className="h-4 w-4" />
                  <span>Active Jobs</span>
                </div>
                <span className="font-semibold text-foreground">{tech.activeJobs}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>Completed</span>
                </div>
                <span className="font-semibold text-foreground">{tech.completedJobs}</span>
              </div>

              {/* Workload Progress */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Workload</span>
                  <span>{Math.min(tech.activeJobs * 20, 100)}%</span>
                </div>
                <Progress 
                  value={Math.min(tech.activeJobs * 20, 100)} 
                  className="h-1.5"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
};

export default Technicians;
