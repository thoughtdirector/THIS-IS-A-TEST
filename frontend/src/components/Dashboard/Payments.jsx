import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CreditCard, Search, RefreshCw, Filter, ChevronDown, Calendar, DollarSign, Download } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';

const Payments = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    to: new Date()
  });
  
  // Fetch payments data
  const { 
    data: payments, 
    isLoading: paymentsLoading,
    isError: paymentsError,
    error: paymentsErrorData,
    refetch: refetchPayments
  } = useQuery({
    queryKey: ['payments', currentPage, pageSize, statusFilter, dateRange],
    queryFn: () => DashboardService.getAllPayments({ 
      skip: currentPage * pageSize, 
      limit: pageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      date_from: dateRange.from.toISOString(),
      date_to: dateRange.to.toISOString()
    }),
  });
  
  // Filter payments based on search term
  const filteredPayments = payments ? payments.filter(payment => 
    (payment.client_name && payment.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (payment.transaction_id && payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];
  
  // Calculate total revenue from filtered payments
  const totalRevenue = filteredPayments.reduce((sum, payment) => {
    if (payment.status === 'completed') {
      return sum + payment.amount;
    }
    return sum;
  }, 0);
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge variant="secondary">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
  
  const downloadPaymentsCSV = () => {
    // Create CSV content
    const headers = ['Date', 'Client', 'Amount', 'Status', 'Method', 'Transaction ID'];
    const rows = filteredPayments.map(payment => [
      formatDate(payment.created_at),
      payment.client_name || `Client #${payment.client_id}`,
      formatCurrency(payment.amount),
      payment.status,
      payment.payment_method,
      payment.transaction_id
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payments-${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const renderPagination = () => {
    const totalItems = filteredPayments.length;
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
  
  // Group by payment method for summary
  const paymentMethodTotals = filteredPayments.reduce((acc, payment) => {
    if (payment.status === 'completed') {
      const method = payment.payment_method || 'Other';
      if (!acc[method]) {
        acc[method] = 0;
      }
      acc[method] += payment.amount;
    }
    return acc;
  }, {});
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payment Management</h1>
        <Button asChild>
          <Link to="/payments/create" className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            Process New Payment
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Payments</p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredPayments.filter(p => p.status === 'completed').length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full bg-yellow-100 p-3 mr-4">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Date Range</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <DatePicker
            value={dateRange}
            onChange={setDateRange}
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Status: {statusFilter === 'all' ? 'All' : statusFilter}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'all'}
                onCheckedChange={() => setStatusFilter('all')}
              >
                All Payments
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'completed'}
                onCheckedChange={() => setStatusFilter('completed')}
              >
                Completed
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'pending'}
                onCheckedChange={() => setStatusFilter('pending')}
              >
                Pending
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'failed'}
                onCheckedChange={() => setStatusFilter('failed')}
              >
                Failed
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === 'refunded'}
                onCheckedChange={() => setStatusFilter('refunded')}
              >
                Refunded
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetchPayments()}
            disabled={paymentsLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={downloadPaymentsCSV}
            disabled={filteredPayments.length === 0}
            className="flex items-center"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="summary">Payment Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                View and manage all payment transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Error loading payments: {paymentsErrorData?.message || "Unknown error"}
                  </AlertDescription>
                </Alert>
              ) : paymentsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payments found. Try adjusting your search or filters.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.created_at)}</TableCell>
                          <TableCell className="font-medium">
                            {payment.client_name || `Client #${payment.client_id}`}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {payment.transaction_id}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/payments/${payment.id}`}>
                                View
                              </Link>
                            </Button>
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
        </TabsContent>
        
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
              <CardDescription>
                Summary of payment methods and revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Error loading payment data: {paymentsErrorData?.message || "Unknown error"}
                  </AlertDescription>
                </Alert>
              ) : paymentsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment data available for the selected period.
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Revenue by Payment Method</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Object.entries(paymentMethodTotals).map(([method, total]) => (
                        <Card key={method}>
                          <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                              <CreditCard className="h-8 w-8 text-primary mb-2" />
                              <p className="text-sm text-gray-500">{method}</p>
                              <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Payment Status Summary</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {['completed', 'pending', 'failed', 'refunded'].map(status => {
                          const statusPayments = filteredPayments.filter(p => p.status === status);
                          const statusTotal = statusPayments.reduce((sum, p) => sum + p.amount, 0);
                          const percentage = filteredPayments.length ? 
                            (statusPayments.length / filteredPayments.length * 100).toFixed(1) : 0;
                          
                          return (
                            <TableRow key={status}>
                              <TableCell>{getStatusBadge(status)}</TableCell>
                              <TableCell>{statusPayments.length}</TableCell>
                              <TableCell>{formatCurrency(statusTotal)}</TableCell>
                              <TableCell>{percentage}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payments;