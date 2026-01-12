import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentRepairs } from "@/components/dashboard/RecentRepairs";
import { StatusOverview } from "@/components/dashboard/StatusOverview";
import { TechnicianPerformance } from "@/components/dashboard/TechnicianPerformance";
import { Wrench, Users, Clock, DollarSign } from "lucide-react";

const Index = () => {
  return (
    <MainLayout 
      title="Dashboard" 
      subtitle="Welcome back! Here's what's happening today."
    >
      {/* Stats Grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Repairs"
          value={42}
          change={{ value: 12, trend: "up" }}
          icon={Wrench}
          variant="primary"
        />
        <StatsCard
          title="Total Customers"
          value={284}
          change={{ value: 8, trend: "up" }}
          icon={Users}
          variant="success"
        />
        <StatsCard
          title="Avg. Repair Time"
          value="2.4 days"
          change={{ value: 15, trend: "down" }}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Monthly Revenue"
          value="KES 245,000"
          change={{ value: 23, trend: "up" }}
          icon={DollarSign}
          variant="accent"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Repairs - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentRepairs />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <StatusOverview />
          <TechnicianPerformance />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
