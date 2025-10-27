'use client';

import { useState, useEffect } from 'react';
import { AnalyticsStats } from '@/components/analytics/analytics-stats';
import { AlertTrendsChart } from '@/components/analytics/alert-trends-chart';
import { AlertTypesChart } from '@/components/analytics/alert-types-chart';
import { UserActivityChart } from '@/components/analytics/user-activity-chart';
import { RecentLogsTable } from '@/components/analytics/recent-logs-table';
import { DateRangeFilter } from '@/components/analytics/date-range-filter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CardLoading, TableLoading } from '@/components/ui/content-loading';
import { reportsService, Report } from '@/lib/services/reports';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    fetchReports();
    return () => clearTimeout(timer);
  }, []);

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const data = await reportsService.getAll();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setReportsLoading(false);
    }
  };

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

      {/* Generated Reports Section */}
      <div className="bg-card/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Generated Reports</h2>
          <Button
            onClick={() => toast.info('Generate Report feature coming soon!')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <span className="material-icons text-sm mr-2">add</span>
            Generate Report
          </Button>
        </div>

        {reportsLoading ? (
          <TableLoading rows={5} columns={6} />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Generated By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <span className="material-icons text-4xl">description</span>
                          <p>No reports generated yet</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {report.report_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(report.date_range_start).toLocaleDateString()} - {new Date(report.date_range_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">{report.generated_by_username}</TableCell>
                        <TableCell>
                          {report.is_generated ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Generated
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600">
                              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {report.is_generated && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  reportsService.download(report.id)
                                    .then((blob) => {
                                      const url = window.URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `${report.title}.pdf`;
                                      document.body.appendChild(a);
                                      a.click();
                                      window.URL.revokeObjectURL(url);
                                      document.body.removeChild(a);
                                      toast.success('Report downloaded successfully');
                                    })
                                    .catch(() => toast.error('Failed to download report'));
                                }}
                              >
                                <span className="material-icons text-sm">download</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.info('View details coming soon!')}
                            >
                              <span className="material-icons text-sm">visibility</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {reports.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {reports.length} report{reports.length !== 1 ? 's' : ''}
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Alert Logs Table */}
      <RecentLogsTable />
    </div>
  );
}



