'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSearch } from '@/lib/contexts/search-context';
import { usersService, type User } from '@/lib/services/users';
import { CardLoading, TableLoading } from '@/components/ui/content-loading';

const initialSubAdmins: SubAdmin[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@safefleet.com',
    assignedArea: 'Downtown Area',
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@safefleet.com',
    assignedArea: 'University Campus',
    status: 'active',
    createdAt: '2024-01-18',
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael.chen@safefleet.com',
    assignedArea: 'Shopping Mall',
    status: 'active',
    createdAt: '2024-01-20',
  },
  {
    id: '4',
    name: 'Emily Rodriguez',
    email: 'emily.r@safefleet.com',
    assignedArea: 'Business District',
    status: 'inactive',
    createdAt: '2024-01-22',
  },
  {
    id: '5',
    name: 'David Park',
    email: 'david.park@safefleet.com',
    assignedArea: 'Residential Zone',
    status: 'active',
    createdAt: '2024-01-25',
  },
  {
    id: '6',
    name: 'Jessica Williams',
    email: 'jessica.w@safefleet.com',
    assignedArea: 'Industrial Park',
    status: 'active',
    createdAt: '2024-01-28',
  },
  {
    id: '7',
    name: 'Robert Brown',
    email: 'robert.brown@safefleet.com',
    assignedArea: 'Medical District',
    status: 'active',
    createdAt: '2024-02-01',
  },
  {
    id: '8',
    name: 'Amanda Taylor',
    email: 'amanda.t@safefleet.com',
    assignedArea: 'Entertainment Zone',
    status: 'inactive',
    createdAt: '2024-02-05',
  },
  {
    id: '9',
    name: 'Christopher Lee',
    email: 'chris.lee@safefleet.com',
    assignedArea: 'Downtown Area',
    status: 'active',
    createdAt: '2024-02-08',
  },
  {
    id: '10',
    name: 'Michelle Garcia',
    email: 'michelle.g@safefleet.com',
    assignedArea: 'University Campus',
    status: 'active',
    createdAt: '2024-02-12',
  },
];

type SortField = 'username' | 'email' | 'date_joined';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'active' | 'inactive';

interface SubAdminsTableProps {
  onEditSubAdmin?: (subAdminId: number) => void;
  refreshTrigger?: number;
}

export function SubAdminsTable({ onEditSubAdmin, refreshTrigger = 0 }: SubAdminsTableProps) {
  const [subAdmins, setSubAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { searchQuery } = useSearch();
  const [sortField, setSortField] = useState<SortField>('date_joined');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showPerPageMenu, setShowPerPageMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewDetailsUser, setViewDetailsUser] = useState<User | null>(null);
  const [deleteSubAdminId, setDeleteSubAdminId] = useState<number | null>(null);

  // Fetch sub-admins on mount and when refreshTrigger changes
  useEffect(() => {
    fetchSubAdmins();
  }, [refreshTrigger]);

  const fetchSubAdmins = async () => {
    try {
      setIsLoading(true);
      const data = await usersService.getAll();
      // Filter to show only SUB_ADMIN role users
      const subAdminUsers = data.filter(user => 
        user.role === 'SUB_ADMIN' || user.role === 'SUB ADMIN'
      );
      setSubAdmins(subAdminUsers);
    } catch (error) {
      console.error('Failed to fetch sub-admins:', error);
      toast.error('Failed to load sub-admins');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter by search query
  let filteredSubAdmins = subAdmins.filter(
    (admin) =>
      admin.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (admin.full_name && admin.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter by status
  if (filterStatus !== 'all') {
    filteredSubAdmins = filteredSubAdmins.filter(
      (admin) => admin.is_active === (filterStatus === 'active')
    );
  }

  // Sort
  filteredSubAdmins = [...filteredSubAdmins].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredSubAdmins.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubAdmins = filteredSubAdmins.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (status: FilterStatus) => {
    setFilterStatus(status);
    setCurrentPage(1);
    setShowFilterMenu(false);
  };

  const handleSortChange = (field: SortField) => {
    setSortField(field);
    setCurrentPage(1);
    setShowSortMenu(false);
  };

  const handleSortOrderChange = (order: SortOrder) => {
    setSortOrder(order);
    setCurrentPage(1);
    setShowSortMenu(false);
  };

  const confirmDelete = async () => {
    if (!deleteSubAdminId) return;
    
    try {
      await usersService.delete(deleteSubAdminId);
      toast.success('Sub-admin deleted successfully');
      setDeleteSubAdminId(null);
      fetchSubAdmins(); // Refresh list
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete sub-admin');
    }
  };

  const handleToggleStatus = async (userId: number) => {
    try {
      const user = subAdmins.find(admin => admin.id === userId);
      if (!user) return;

      // Toggle the is_active status
      const updatedUser = await usersService.update(userId, {
        is_active: !user.is_active
      });

      // Update the local state
      setSubAdmins(
        subAdmins.map((admin) =>
          admin.id === userId ? updatedUser : admin
        )
      );

      toast.success(`User ${updatedUser.is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error('Failed to update user status');
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
        <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
        Inactive
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-border/50">
        {/* Stats Loading */}
        <CardLoading count={3} className="mb-6" />

        {/* Controls Loading */}
        <div className="flex items-center justify-end gap-3 mb-6 animate-pulse">
          <div className="h-10 w-32 bg-muted rounded-lg"></div>
          <div className="h-10 w-24 bg-muted rounded-lg"></div>
          <div className="h-10 w-24 bg-muted rounded-lg"></div>
        </div>

        {/* Table Loading */}
        <TableLoading rows={itemsPerPage} columns={5} />

        {/* Pagination Info Loading */}
        <div className="mt-4 flex items-center justify-between animate-pulse">
          <div className="h-4 w-48 bg-muted rounded"></div>
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-border/50">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Sub-Admins</p>
              <p className="text-2xl font-bold mt-1">{subAdmins.length}</p>
            </div>
            <span className="material-icons text-4xl opacity-80">supervisor_account</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-teal-600 p-4 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Active</p>
              <p className="text-2xl font-bold mt-1">
                {subAdmins.filter((a) => a.status === 'active').length}
              </p>
            </div>
            <span className="material-icons text-4xl opacity-80">check_circle</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Inactive</p>
              <p className="text-2xl font-bold mt-1">
                {subAdmins.filter((a) => a.status === 'inactive').length}
              </p>
            </div>
            <span className="material-icons text-4xl opacity-80">cancel</span>
          </div>
        </div>
      </div>

      {/* Filter, Sort, and Per Page Controls */}
      <div className="flex items-center justify-end gap-3 mb-6">
        {/* Pagination Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPerPageMenu(!showPerPageMenu);
              setShowFilterMenu(false);
              setShowSortMenu(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <span className="material-icons text-lg">apps</span>
            <span className="text-sm font-medium">Pagination</span>
          </button>

          {/* Pagination Dropdown */}
          {showPerPageMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-10">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Items per page
                </div>
                <button
                  onClick={() => {
                    setItemsPerPage(10);
                    setCurrentPage(1);
                    setShowPerPageMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    itemsPerPage === 10
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  10 items
                </button>
                <button
                  onClick={() => {
                    setItemsPerPage(25);
                    setCurrentPage(1);
                    setShowPerPageMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    itemsPerPage === 25
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  25 items
                </button>
                <button
                  onClick={() => {
                    setItemsPerPage(50);
                    setCurrentPage(1);
                    setShowPerPageMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    itemsPerPage === 50
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  50 items
                </button>
                <button
                  onClick={() => {
                    setItemsPerPage(100);
                    setCurrentPage(1);
                    setShowPerPageMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    itemsPerPage === 100
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  100 items
                </button>

                <div className="border-t border-border my-2"></div>

                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Navigation
                </div>
                <button
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      setShowPerPageMenu(false);
                    }
                  }}
                  disabled={currentPage === 1}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    currentPage === 1
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="material-icons text-sm">chevron_left</span>
                  Previous Page
                </button>
                <button
                  onClick={() => {
                    if (currentPage < totalPages) {
                      setCurrentPage(currentPage + 1);
                      setShowPerPageMenu(false);
                    }
                  }}
                  disabled={currentPage === totalPages}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    currentPage === totalPages
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-muted'
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
                      setShowPerPageMenu(false);
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
              setShowSortMenu(false);
              setShowPerPageMenu(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <span className="material-icons text-lg">filter_list</span>
            <span className="text-sm font-medium">Filter</span>
            {filterStatus !== 'all' && (
              <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
            )}
          </button>

          {/* Filter Dropdown */}
          {showFilterMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-10">
              <div className="p-2">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  All Sub-Admins
                </button>
                <button
                  onClick={() => handleFilterChange('active')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    filterStatus === 'active'
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  Active Only
                </button>
                <button
                  onClick={() => handleFilterChange('inactive')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    filterStatus === 'inactive'
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  Inactive Only
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sort Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSortMenu(!showSortMenu);
              setShowFilterMenu(false);
              setShowPerPageMenu(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <span className="material-icons text-lg">sort</span>
            <span className="text-sm font-medium">Sort</span>
          </button>

          {/* Sort Dropdown */}
          {showSortMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-10">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Sort By
                </div>
                <button
                  onClick={() => handleSortChange('name')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    sortField === 'name'
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  Name
                </button>
                <button
                  onClick={() => handleSortChange('email')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    sortField === 'email'
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => handleSortChange('username')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    sortField === 'username'
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  Organization
                </button>
                <button
                  onClick={() => handleSortChange('createdAt')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    sortField === 'createdAt'
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  Date Created
                </button>

                <div className="border-t border-border my-2"></div>

                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Order
                </div>
                <button
                  onClick={() => handleSortOrderChange('asc')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    sortOrder === 'asc'
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  Ascending (A-Z)
                </button>
                <button
                  onClick={() => handleSortOrderChange('desc')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    sortOrder === 'desc'
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  Descending (Z-A)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-muted-foreground text-sm font-semibold">Name</TableHead>
                <TableHead className="text-muted-foreground text-sm font-semibold">Email</TableHead>
                <TableHead className="text-muted-foreground text-sm font-semibold">
                  Organization
                </TableHead>
                <TableHead className="text-muted-foreground text-sm font-semibold">Status</TableHead>
                <TableHead className="text-muted-foreground text-sm font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSubAdmins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <span className="material-icons text-6xl text-muted-foreground mb-2">
                    search_off
                  </span>
                  <p className="text-muted-foreground">No sub-admins found</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedSubAdmins.map((admin) => (
                <TableRow
                  key={admin.id}
                  className="border-b hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {(admin.full_name || admin.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{admin.full_name || admin.username}</div>
                        <div className="text-xs text-muted-foreground">@{admin.username}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <div className="text-sm text-muted-foreground">{admin.email}</div>
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="material-icons text-sm text-indigo-600">business</span>
                      <span className="text-sm">{admin.organization?.name || 'Not Assigned'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-4">{getStatusBadge(admin.is_active)}</TableCell>
                  <TableCell className="py-4 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-muted"
                        >
                          <span className="material-icons text-lg">more_vert</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onClick={() => onEditSubAdmin?.(admin.id)}
                        >
                          <span className="material-icons text-sm mr-2">edit</span>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={async () => await handleToggleStatus(admin.id)}
                        >
                          <span className="material-icons text-sm mr-2">
                            {admin.is_active ? 'block' : 'check_circle'}
                          </span>
                          {admin.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onClick={() => setViewDetailsUser(admin)}
                        >
                          <span className="material-icons text-sm mr-2">visibility</span>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-red-600 focus:text-red-600"
                          onClick={() => setDeleteSubAdminId(admin.id)}
                        >
                          <span className="material-icons text-sm mr-2">delete</span>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table Info */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {startIndex + 1}-{Math.min(endIndex, filteredSubAdmins.length)} of {filteredSubAdmins.length} sub-admins
          {filterStatus !== 'all' && (
            <span className="ml-2 text-indigo-600 font-medium">
              (Filtered: {filterStatus})
            </span>
          )}
        </p>
        <p>
          Page {currentPage} of {totalPages} • Sorted by: {sortField} ({sortOrder === 'asc' ? 'Asc' : 'Desc'})
        </p>
      </div>

      {/* View Details Modal */}
      {viewDetailsUser && (
        <Dialog open={!!viewDetailsUser} onOpenChange={() => setViewDetailsUser(null)}>
          <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-border/50 p-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                <span className="material-icons text-indigo-600 mr-2">
                  admin_panel_settings
                </span>
                Sub-Admin Details
              </DialogTitle>
              <DialogDescription>
                Complete information about this sub-admin
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-3">
              {/* User Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Username */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                  <p className="text-base font-medium">{viewDetailsUser.username}</p>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base font-medium">{viewDetailsUser.email || 'Not set'}</p>
                </div>

                {/* First Name */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                  <p className="text-base font-medium">{viewDetailsUser.first_name || 'Not set'}</p>
                </div>

                {/* Last Name */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                  <p className="text-base font-medium">{viewDetailsUser.last_name || 'Not set'}</p>
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Sub-Admin
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    viewDetailsUser.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {viewDetailsUser.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {/* Date Joined */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Date Joined</Label>
                  <p className="text-base font-medium">
                    {new Date(viewDetailsUser.date_joined).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {/* Last Login */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Last Login</Label>
                  <p className="text-base font-medium">
                    {viewDetailsUser.last_login 
                      ? new Date(viewDetailsUser.last_login).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              {/* Organization */}
              {viewDetailsUser.organization && (
                <div className="space-y-1 pt-2 border-t">
                  <Label className="text-sm font-medium text-muted-foreground">Organization</Label>
                  <p className="text-base font-medium">{viewDetailsUser.organization.name}</p>
                </div>
              )}

              {/* User ID */}
              <div className="space-y-1 pt-2 border-t">
                <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
                <p className="text-base font-mono text-sm">{viewDetailsUser.id}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t mt-3">
              <Button
                variant="outline"
                onClick={() => setViewDetailsUser(null)}
              >
                <span className="material-icons text-sm mr-2" style={{ lineHeight: '0', verticalAlign: 'baseline', marginBottom: '-2px' }}>close</span>
                Close
              </Button>
              {onEditSubAdmin && (
                <Button
                  onClick={() => {
                    setViewDetailsUser(null);
                    onEditSubAdmin(viewDetailsUser.id);
                  }}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                >
                  <span className="material-icons text-sm mr-2" style={{ lineHeight: '0', verticalAlign: 'baseline', marginBottom: '-2px' }}>edit</span>
                  Edit Sub-Admin
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSubAdminId} onOpenChange={() => setDeleteSubAdminId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="material-icons text-red-600">warning</span>
              Delete Sub-Admin
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sub-admin? This action cannot be undone and will permanently remove the sub-admin and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              <span className="material-icons text-sm mr-2" style={{ lineHeight: '0', verticalAlign: 'baseline', marginBottom: '-2px' }}>delete</span>
              Delete Sub-Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

