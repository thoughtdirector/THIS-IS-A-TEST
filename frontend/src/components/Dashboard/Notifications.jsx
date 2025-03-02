import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Bell, Search, RefreshCw, Filter, ChevronDown, Send, Download, ArrowUpDown } from 'lucide-react';
import { DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';

const Notifications = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    to: new Date()
  });
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Fetch notifications data
  const { 
    data: notifications, 
    isLoading: notificationsLoading,
    isError: notificationsError,
    error: notificationsErrorData,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: ['notifications', currentPage, pageSize, typeFilter, dateRange, sortField, sortOrder],
    queryFn: () => DashboardService.getAllNotifications({ 
      skip: currentPage * pageSize, 
      limit: pageSize,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      date_from: dateRange.from.toISOString(),
      date_to: dateRange.to.toISOString(),
      sort_by: sortField,
      sort_order: sortOrder
    }),
  });
  
  // Resend notification mutation
  const resendNotificationMutation = useMutation({
    mutationFn: DashboardService.resendNotification,
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });
  
  // Filter notifications based on search term
  const filteredNotifications = notifications ? notifications.filter(notification => 
    notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (notification.client_name && notification.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getTypeStatus = (notification) => {
    if (notification.is_broadcast) {
      return <Badge variant="default">Broadcast</Badge>;
    } else if (notification.target_client_id) {
      return <Badge variant="outline">Individual</Badge>;
    } else if (notification.target_group_id) {
      return <Badge variant="secondary">Group</Badge>;
    } else {
      return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(0); // Reset to first page on search
  };
  
  const handlePageChange = (newPage) => {
    if (newPage >= 0) {
      setCurrentPage(newPage);
    }
  };
  
  const handleResend = (notificationId) => {
    resendNotificationMutation.mutate({ id: notificationId });
  };
  
  const handleSort = (field) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };
  
  const downloadNotificationsCSV = () => {
    // Create CSV content
    const headers = ['Date', 'Message', 'Recipient', 'Type', 'Sent By'];
    const rows = filteredNotifications.map(notification => [
      formatDate(notification.created_at),
      notification.message,
      notification.client_name || notification.target_group_name || 'All Clients',
      notification.is_broadcast ? 'Broadcast' : notification.target_client_id ? 'Individual' : 'Group',
      notification.created_by_name || `Admin #${notification.created_by}`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `notifications-${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const renderPagination = () => {
    const totalItems = filteredNotifications.length;
    const hasMore = totalItems >= pageSize;
    
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          Showing {Math.min(totalItems, 1 + (currentPage * pageSize))} to {Math.min(totalItems, (currentPage + 1) * pageSize)} of {totalItems}+ entries
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };
  
  // Group by type for summary
  const notificationTypeCounts = filteredNotifications.reduce((acc, notification) => {
    let type = notification.is_broadcast ? 'broadcast' : 
              notification.target_client_id ? 'individual' : 'group';
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type]++;
    return acc;
  }, {});
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notification History</h1>
        <Button asChild>
          <Link to="/notifications/create" className="flex items-center">
            <Send className="mr-2 h-4 w-4" />
            Send New Notification
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Notifications</p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredNotifications.length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">By Type</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Badge variant="default" className="mr-2">Broadcast</Badge>
                  <span>Broadcast Messages</span>
                </div>
                <span className="font-medium">{notificationTypeCounts.broadcast || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">Individual</Badge>
                  <span>Individual Messages</span>
                </div>
                <span className="font-medium">{notificationTypeCounts.individual || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Badge variant="secondary" className="mr-2">Group</Badge>
                  <span>Group Messages</span>
                </div>
                <span className="font-medium">{notificationTypeCounts.group || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Date Range</h3>
            <DatePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </CardContent>
        </Card>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Type: {typeFilter === 'all' ? 'All' : typeFilter}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={typeFilter === 'all'}
                onCheckedChange={() => setTypeFilter('all')}
              >
                All Types
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={typeFilter === 'broadcast'}
                onCheckedChange={() => setTypeFilter('broadcast')}
              >
                Broadcast
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={typeFilter === 'individual'}
                onCheckedChange={() => setTypeFilter('individual')}
              >
                Individual
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={typeFilter === 'group'}
                onCheckedChange={() => setTypeFilter('group')}
              >
                Group
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetchNotifications()}
            disabled={notificationsLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={downloadNotificationsCSV}
            disabled={filteredNotifications.length === 0}
            className="flex items-center"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            View all notification messages sent to clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notificationsError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                Error loading notifications: {notificationsErrorData?.message || "Unknown error"}
              </AlertDescription>
            </Alert>
          ) : notificationsLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No notifications found. Try adjusting your search or filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center">
                        Date
                        {sortField === 'created_at' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sent By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(notification.created_at)}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">{notification.message}</div>
                      </TableCell>
                      <TableCell>
                        {notification.is_broadcast ? (
                          "All Clients"
                        ) : notification.client_name ? (
                          notification.client_name
                        ) : notification.target_group_name ? (
                          notification.target_group_name
                        ) : (
                          <span className="text-gray-500 text-sm">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>{getTypeStatus(notification)}</TableCell>
                      <TableCell>
                        {notification.created_by_name || `Admin #${notification.created_by}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleResend(notification.id)}
                            disabled={resendNotificationMutation.isPending && resendNotificationMutation.variables?.id === notification.id}
                          >
                            {resendNotificationMutation.isPending && resendNotificationMutation.variables?.id === notification.id ? (
                              <span className="mr-2">...</span>
                            ) : (
                              <Send className="mr-2 h-3 w-3" />
                            )}
                            Resend
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/notifications/${notification.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {renderPagination()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;