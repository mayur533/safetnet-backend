'use client';

import { useState } from 'react';
import { AnalyticsStats } from '@/components/analytics/analytics-stats';
import { AlertTrendsChart } from '@/components/analytics/alert-trends-chart';
import { AlertTypesChart } from '@/components/analytics/alert-types-chart';
import { UserActivityChart } from '@/components/analytics/user-activity-chart';
import { RecentLogsTable } from '@/components/analytics/recent-logs-table';
import { DateRangeFilter } from '@/components/analytics/date-range-filter';
import { Button } from '@/components/ui/button';
import { CardLoading } from '@/components/ui/content-loading';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleExportPDF = () => {
    alert('Exporting analytics to PDF...');
    // TODO: Implement PDF export
  };

  const handleExportCSV = () => {
    alert('Exporting analytics to CSV...');
    // TODO: Implement CSV export
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
            <p className="text-muted-foreground mt-1">Comprehensive security insights and trends</p>
          </div>
        </div>

        {/* Stats Loading */}
        <CardLoading count={4} />

        {/* Charts Loading */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card p-6 rounded-lg shadow-md border">
            <div className="h-6 w-32 bg-muted rounded mb-4 animate-pulse"></div>
            <div className="h-80 bg-muted/40 rounded animate-pulse"></div>
          </div>
          <div className="lg:col-span-1 bg-card p-6 rounded-lg shadow-md border">
            <div className="h-6 w-32 bg-muted rounded mb-4 animate-pulse"></div>
            <div className="h-80 bg-muted/40 rounded animate-pulse"></div>
          </div>
        </div>

        {/* User Activity Loading */}
        <div className="bg-card p-6 rounded-lg shadow-md border">
          <div className="h-6 w-32 bg-muted rounded mb-4 animate-pulse"></div>
          <div className="h-64 bg-muted/40 rounded animate-pulse"></div>
        </div>

        {/* Table Loading */}
        <div className="bg-card p-6 rounded-lg shadow-md border">
          <div className="h-6 w-32 bg-muted rounded mb-4 animate-pulse"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-4 animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="h-4 flex-1 bg-muted/60 rounded"></div>
                <div className="h-4 flex-1 bg-muted/60 rounded"></div>
                <div className="h-4 flex-1 bg-muted/60 rounded"></div>
                <div className="h-4 flex-1 bg-muted/60 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">Comprehensive security insights and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <span className="material-icons text-sm mr-1">picture_as_pdf</span>
            Export PDF
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <span className="material-icons text-sm mr-1">table_chart</span>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Analytics Stats */}
      <AnalyticsStats />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Trends - Takes 2 columns */}
        <div className="lg:col-span-2">
          <AlertTrendsChart />
        </div>

        {/* Alert Types - Takes 1 column */}
        <div className="lg:col-span-1">
          <AlertTypesChart />
        </div>
      </div>

      {/* User Activity Chart */}
      <UserActivityChart />

      {/* Recent Alert Logs Table */}
      <RecentLogsTable />
    </div>
  );
}



