'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSearch } from '@/lib/contexts/search-context';
import { alertsService, Alert } from '@/lib/services/alerts';
import { TableLoading } from '@/components/ui/content-loading';
import { toast } from 'sonner';

interface AlertLog {
  id: string;
  timestamp: string;
  type: 'SOS' | 'Emergency' | 'Community' | 'Geofence' | 'System';
  location: string;
  user: string;
  status: 'resolved' | 'pending' | 'critical';
  responseTime: string;
}

const mockAlertLogs: AlertLog[] = [
  {
    id: '1',
    timestamp: '2024-02-15 14:32:15',
    type: 'SOS',
    location: 'Downtown Area',
    user: 'John Smith',
    status: 'resolved',
    responseTime: '2.3 min',
  },
  {
    id: '2',
    timestamp: '2024-02-15 14:28:42',
    type: 'Emergency',
    location: 'University Campus',
    user: 'Sarah Johnson',
    status: 'critical',
    responseTime: '1.8 min',
  },
  {
    id: '3',
    timestamp: '2024-02-15 14:15:30',
    type: 'Community',
    location: 'Shopping Mall',
    user: 'Michael Chen',
    status: 'resolved',
    responseTime: '3.1 min',
  },
  {
    id: '4',
    timestamp: '2024-02-15 13:45:18',
    type: 'Geofence',
    location: 'Business District',
    user: 'System',
    status: 'resolved',
    responseTime: '0.5 min',
  },
  {
    id: '5',
    timestamp: '2024-02-15 13:20:05',
    type: 'SOS',
    location: 'Residential Zone',
    user: 'Emily Davis',
    status: 'pending',
    responseTime: '4.2 min',
  },
  {
    id: '6',
    timestamp: '2024-02-15 12:58:33',
    type: 'Emergency',
    location: 'Industrial Park',
    user: 'David Wilson',
    status: 'resolved',
    responseTime: '2.9 min',
  },
  {
    id: '7',
    timestamp: '2024-02-15 12:30:22',
    type: 'Community',
    location: 'Medical District',
    user: 'Lisa Anderson',
    status: 'resolved',
    responseTime: '1.5 min',
  },
  {
    id: '8',
    timestamp: '2024-02-15 11:45:11',
    type: 'System',
    location: 'N/A',
    user: 'System',
    status: 'resolved',
    responseTime: '0.2 min',
  },
  {
    id: '9',
    timestamp: '2024-02-15 11:20:44',
    type: 'SOS',
    location: 'Entertainment Zone',
    user: 'Robert Taylor',
    status: 'resolved',
    responseTime: '2.7 min',
  },
  {
    id: '10',
    timestamp: '2024-02-15 10:55:09',
    type: 'Geofence',
    location: 'Downtown Area',
    user: 'System',
    status: 'resolved',
    responseTime: '0.3 min',
  },
];

export function RecentLogsTable() {
  const { searchQuery } = useSearch();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPaginationMenu, setShowPaginationMenu] = useState(false);
  const [filterType, setFilterType] = useState<'all' | AlertLog['type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | AlertLog['status']>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertsService.getAll();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  // Convert real API alerts to table format
  const alertLogs = alerts.map(alert => ({
    id: alert.id.toString(),
    timestamp: new Date(alert.created_at).toLocaleString(),
    type: (alert.alert_type || 'System') as AlertLog['type'],
    location: alert.location || alert.geofence_name || 'N/A',
    user: alert.user_username || 'System',
    status: (alert.is_resolved ? 'resolved' : alert.severity === 'critical' ? 'critical' : 'pending') as AlertLog['status'],
    responseTime: alert.response_time ? `${alert.response_time} min` : 'N/A',
  }));

  // Filter
  let filteredLogs = alertLogs.filter((log) =>
    log.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filterType !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.type === filterType);
  }

  if (filterStatus !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.status === filterStatus);
  }

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const getTypeBadge = (type: AlertLog['type']) => {
    const badges = {
      SOS: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      Emergency: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
      Community: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      Geofence: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      System: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[type]}`}>
        {type}
      </span>
    );
  };

  const getStatusBadge = (status: AlertLog['status']) => {
    const badges = {
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-card/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-border/50">
        <div className="mb-6">
          <h3 className="font-semibold text-lg">Recent Alert Logs</h3>
          <p className="text-xs text-muted-foreground mt-1">Detailed alert history and metrics</p>
        </div>
        <TableLoading rows={10} columns={6} />
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-lg">Recent Alert Logs</h3>
          <p className="text-xs text-muted-foreground mt-1">Real-time alert data from API</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Pagination Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPaginationMenu(!showPaginationMenu);
                setShowFilterMenu(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <span className="material-icons text-lg">apps</span>
              <span className="text-sm font-medium">Pagination</span>
            </button>

            {showPaginationMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Items per page
                  </div>
                  {[10, 25, 50, 100].map((count) => (
                    <button
                      key={count}
                      onClick={() => {
                        setItemsPerPage(count);
                        setCurrentPage(1);
                        setShowPaginationMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        itemsPerPage === count
                          ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {count} items
                    </button>
                  ))}

                  <div className="border-t border-border my-2"></div>

                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Navigation
                  </div>
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        setShowPaginationMenu(false);
                      }
                    }}
                    disabled={currentPage === 1}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="material-icons text-sm">chevron_left</span>
                    Previous Page
                  </button>
                  <button
                    onClick={() => {
                      if (currentPage < totalPages) {
                        setCurrentPage(currentPage + 1);
                        setShowPaginationMenu(false);
                      }
                    }}
                    disabled={currentPage === totalPages}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="material-icons text-sm">chevron_right</span>
                    Next Page
                  </button>

                  <div className="border-t border-border my-2"></div>

                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Go to page
                  </div>
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => {
                        setCurrentPage(page);
                        setShowPaginationMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        currentPage === page
                          ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                          : 'hover:bg-muted'
                      }`}
                    >
                      Page {page}
                    </button>
                  ))}
                  {totalPages > 10 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Showing first 10 pages of {totalPages}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowFilterMenu(!showFilterMenu);
                setShowPaginationMenu(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <span className="material-icons text-lg">filter_list</span>
              <span className="text-sm font-medium">Filter</span>
              {(filterType !== 'all' || filterStatus !== 'all') && (
                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
              )}
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Filter by Type
                  </div>
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setCurrentPage(1);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      filterType === 'all'
                        ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                        : 'hover:bg-muted'
                    }`}
                  >
                    All Types
                  </button>
                  {['SOS', 'Emergency', 'Community', 'Geofence', 'System'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setFilterType(type as AlertLog['type']);
                        setCurrentPage(1);
                        setShowFilterMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        filterType === type
                          ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {type}
                    </button>
                  ))}

                  <div className="border-t border-border my-2"></div>

                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Filter by Status
                  </div>
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      setCurrentPage(1);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                        : 'hover:bg-muted'
                    }`}
                  >
                    All Status
                  </button>
                  {['resolved', 'pending', 'critical'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilterStatus(status as AlertLog['status']);
                        setCurrentPage(1);
                        setShowFilterMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        filterStatus === status
                          ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-muted-foreground text-sm font-semibold">Timestamp</TableHead>
              <TableHead className="text-muted-foreground text-sm font-semibold">Type</TableHead>
              <TableHead className="text-muted-foreground text-sm font-semibold">Location</TableHead>
              <TableHead className="text-muted-foreground text-sm font-semibold">User</TableHead>
              <TableHead className="text-muted-foreground text-sm font-semibold">Status</TableHead>
              <TableHead className="text-muted-foreground text-sm font-semibold">Response Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-icons text-6xl text-muted-foreground">
                      {filteredLogs.length === 0 && alerts.length === 0 ? 'notifications_off' : 'search_off'}
                    </span>
                    <p className="text-muted-foreground">
                      {filteredLogs.length === 0 && alerts.length === 0 
                        ? 'No alerts yet' 
                        : 'No alerts match your filters'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => (
                <TableRow key={log.id} className="border-b hover:bg-muted/20 transition-colors">
                  <TableCell className="py-3 px-4">
                    <div className="text-sm font-mono">{log.timestamp}</div>
                  </TableCell>
                  <TableCell className="py-3 px-4">{getTypeBadge(log.type)}</TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-sm text-indigo-600">location_on</span>
                      <span className="text-sm">{log.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="text-sm">{log.user}</div>
                  </TableCell>
                  <TableCell className="py-3 px-4">{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="text-sm font-medium">{log.responseTime}</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Info */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs
          {(filterType !== 'all' || filterStatus !== 'all') && (
            <span className="ml-2 text-indigo-600 font-medium">
              (Filtered)
            </span>
          )}
        </p>
        <p>Page {currentPage} of {totalPages}</p>
      </div>
    </div>
  );
}




