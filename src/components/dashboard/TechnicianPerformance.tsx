import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface Technician {
  id: string;
  name: string;
  initials: string;
  completedToday: number;
  activeJobs: number;
  rating: number;
}

const technicians: Technician[] = [
  {
    id: "1",
    name: "Peter Ochieng",
    initials: "PO",
    completedToday: 5,
    activeJobs: 3,
    rating: 4.8,
  },
  {
    id: "2",
    name: "James Mwangi",
    initials: "JM",
    completedToday: 4,
    activeJobs: 4,
    rating: 4.6,
  },
  {
    id: "3",
    name: "Sarah Achieng",
    initials: "SA",
    completedToday: 3,
    activeJobs: 2,
    rating: 4.9,
  },
];

export function TechnicianPerformance() {
  const maxCompleted = Math.max(...technicians.map(t => t.completedToday));

  return (
    <div className="rounded-xl border bg-card p-5 shadow-card animate-slide-up">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Technician Performance</h3>
        <p className="text-sm text-muted-foreground">Today's completions</p>
      </div>

      <div className="space-y-4">
        {technicians.map((tech) => (
          <div key={tech.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {tech.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{tech.name}</p>
                  <p className="text-xs text-muted-foreground">{tech.activeJobs} active jobs</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{tech.completedToday}</p>
                <p className="text-xs text-muted-foreground">completed</p>
              </div>
            </div>
            <Progress 
              value={(tech.completedToday / maxCompleted) * 100} 
              className="h-1.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
