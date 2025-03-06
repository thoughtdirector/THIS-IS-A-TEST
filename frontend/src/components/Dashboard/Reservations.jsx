import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CalendarPlus, ArrowLeft, Search, RefreshCw, Filter, ChevronDown, Calendar, Clock, Check, X } from 'lucide-react';
import { DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const Reservations = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  
  // Fetch reservations data
  const { 
    data: reservations, 
    isLoading: reservationsLoading,
    isError: reservationsError,
    error: reservationsErrorData,
    refetch: refetchReservations
  } = useQuery({
    queryKey: ['reservations', currentPage, pageSize, showUpcomingOnly],
    queryFn: () => DashboardService.getAllReservations({ 
      skip: currentPage * pageSize, 
      limit: pageSize,
      upcoming_only: showUpcomingOnly
    }),
  });
  
  // Filter function for reservations
  const filterReservations = (reservs) => {
    if (!reservs) return [];
    
    return reservs.filter(reservation => {
      // Filter by search term (client name, etc.)
      const searchMatch = !searchTerm || 
        (reservation.client_name && reservation.client_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by upcoming vs. all
      const dateMatch = !showUpcomingOnly || 
        new Date(reservation.date) >= new Date();
      
      return searchMatch && dateMatch;
    });
  };
  
  const filteredReservations = filterReservations(reservations);
  
  // Separate upcoming and past reservations for tabs
  const now = new Date();
  const upcomingReservations = filteredReservations.filter(
    res => new Date(res.date) >= now
  );
  
  const pastReservations = filteredReservations.filter(
    res => new Date(res.date) < now
  );
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
  
  const renderPagination = (items) => {
    const totalItems = items.length;
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
  
  const renderReservationsTable = (reservations) => {
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium">
                  {reservation.client_name || `Client #${reservation.client_group_id}`}
                </TableCell>
                <TableCell>{formatDate(reservation.date)}</TableCell>
                <TableCell>{formatTime(reservation.date)}</TableCell>
                <TableCell>{reservation.duration_hours} hours</TableCell>
                <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/dashboard/reservations/${reservation.id}`}>
                        View
                      </Link>
                    </Button>
                    {new Date(reservation.date) > now && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/dashboard/reservations/${reservation.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {renderPagination(reservations)}
      </>
    );
  };
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/dashboard/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Reservations</h1>
      </div>
        <Button asChild>
          <Link to="/dashboard/reservations/create" className="flex items-center">
            <CalendarPlus className="mr-2 h-4 w-4" />
            New Reservation
          </Link>
        </Button>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search reservations..."
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
                Filters
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={showUpcomingOnly}
                onCheckedChange={setShowUpcomingOnly}
              >
                Upcoming Only
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={pageSize === 10}
                onCheckedChange={() => setPageSize(10)}
              >
                Show 10 per page
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={pageSize === 25}
                onCheckedChange={() => setPageSize(25)}
              >
                Show 25 per page
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={pageSize === 50}
                onCheckedChange={() => setPageSize(50)}
              >
                Show 50 per page
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetchReservations()}
            disabled={reservationsLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Past
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Reservations</CardTitle>
            </CardHeader>
            <CardContent>
              {reservationsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Error loading reservations: {reservationsErrorData?.message || "Unknown error"}
                  </AlertDescription>
                </Alert>
              ) : reservationsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : upcomingReservations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No upcoming reservations found.
                </div>
              ) : (
                renderReservationsTable(upcomingReservations)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="past">
          <Card>
            <CardHeader>
              <CardTitle>Past Reservations</CardTitle>
            </CardHeader>
            <CardContent>
              {reservationsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Error loading reservations: {reservationsErrorData?.message || "Unknown error"}
                  </AlertDescription>
                </Alert>
              ) : reservationsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : pastReservations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No past reservations found.
                </div>
              ) : (
                renderReservationsTable(pastReservations)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reservations;