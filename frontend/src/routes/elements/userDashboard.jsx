import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from "@tanstack/react-router";
import { ClientService } from '../../client/services';
import { 
  CreditCard, 
  Users, 
  Calendar, 
  PlusCircle, 
  Clock, 
  Package, 
  User, 
  UserPlus, 
  Home 
} from 'lucide-react';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch client plan instances
  const { 
    data: planInstances, 
    isLoading: planInstancesLoading,
    isError: planInstancesError,
    error: planInstancesErrorData
  } = useQuery({
    queryKey: ['clientPlanInstances'],
    queryFn: () => ClientService.getClientPlanInstances(),
    retry: 3,
    staleTime: 30000,
  });
  
  // Fetch client visits
  const { 
    data: visits, 
    isLoading: visitsLoading,
    isError: visitsError,
    error: visitsErrorData
  } = useQuery({
    queryKey: ['clientVisits'],
    queryFn: () => ClientService.getVisits({ limit: 10 }),
    retry: 3,
    staleTime: 30000,
  });
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Error display component
  const ErrorDisplay = ({ title, error }) => (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {error?.message || "An unexpected error occurred"}
        <Button 
          variant="outline" 
          className="mt-2"
          onClick={() => queryClient.invalidateQueries()}
        >
          Try Again
        </Button>
      </AlertDescription>
    </Alert>
  );

  // Demo data for when real data is loading
  const demoPlanInstances = [
    {
      id: "123e4567-e89b-12d3-a456-426614174001",
      plan_id: "223e4567-e89b-12d3-a456-426614174001",
      start_date: "2025-03-01T00:00:00Z",
      end_date: "2025-04-01T00:00:00Z",
      total_cost: 99.99,
      paid_amount: 99.99,
      is_active: true,
      is_fully_paid: true,
      remaining_entries: 8
    }
  ];

  const demoVisits = [
    {
      id: "123e4567-e89b-12d3-a456-426614174001",
      check_in: "2025-03-01T10:00:00Z",
      check_out: "2025-03-01T12:00:00Z",
      duration: 2.0
    }
  ];

  // Use demo data if the real data is loading
  const displayPlanInstances = planInstancesLoading ? demoPlanInstances : planInstances || [];
  const displayVisits = visitsLoading ? demoVisits : visits || [];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">My Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Today: {new Date().toLocaleDateString()}</span>
              <Badge variant="outline">User</Badge>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-grow p-6">
        {/* Navigation tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="mb-6"
        >
          <TabsList className="bg-white shadow rounded-lg">
            <TabsTrigger value="overview" className="flex items-center">
              <Home className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center">
              <Package className="mr-2 h-4 w-4" />
              My Plans
            </TabsTrigger>
            <TabsTrigger value="visits" className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              My Visits
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {/* Quick Actions */}
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-blue-100 p-3 mb-4">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-medium mb-2">Purchase a Plan</h3>
                    <p className="text-sm text-gray-500 mb-4">Browse and purchase available plans</p>
                    <Button asChild className="w-full">
                      <Link to="/dashboard/client/plans">View Plans</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-green-100 p-3 mb-4">
                      <Calendar className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-medium mb-2">Make a Reservation</h3>
                    <p className="text-sm text-gray-500 mb-4">Schedule your next visit</p>
                    <Button asChild className="w-full">
                      <Link to="/dashboard/reservations/create">New Reservation</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-purple-100 p-3 mb-4">
                      <UserPlus className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-medium mb-2">Register a Child</h3>
                    <p className="text-sm text-gray-500 mb-4">Add a child to your account</p>
                    <Button asChild className="w-full">
                      <Link to="/dashboard/clients/register">Register Child</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Active Plans Summary */}
            <h2 className="text-lg font-semibold mb-4">My Active Plans</h2>
            {planInstancesError ? (
              <ErrorDisplay title="Error Loading Plans" error={planInstancesErrorData} />
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
                {displayPlanInstances.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Remaining Uses</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayPlanInstances.map((instance) => (
                        <TableRow key={instance.id}>
                          <TableCell className="font-medium">Plan #{instance.id.substring(0, 8)}</TableCell>
                          <TableCell>{formatDate(instance.end_date)}</TableCell>
                          <TableCell>{instance.remaining_entries || 'Unlimited'}</TableCell>
                          <TableCell>
                            {instance.is_active ? (
                              <Badge variant="success">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/dashboard/client/plan-instances/${instance.id}`}>View Details</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-gray-500 mb-4">You don't have any active plans</p>
                    <Button asChild>
                      <Link to="/dashboard/client/plans">Browse Plans</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Recent Visits */}
            <h2 className="text-lg font-semibold mb-4">Recent Visits</h2>
            {visitsError ? (
              <ErrorDisplay title="Error Loading Visits" error={visitsErrorData} />
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                {displayVisits.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayVisits.map((visit) => (
                        <TableRow key={visit.id}>
                          <TableCell>{formatDate(visit.check_in)}</TableCell>
                          <TableCell>{formatTime(visit.check_in)}</TableCell>
                          <TableCell>{visit.check_out ? formatTime(visit.check_out) : 'N/A'}</TableCell>
                          <TableCell>{visit.duration ? `${visit.duration} hours` : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No recent visits</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="plans">
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">My Plans</h2>
                <Button asChild>
                  <Link to="/dashboard/client/plans">Browse Plans</Link>
                </Button>
              </div>
              
              {planInstancesError ? (
                <ErrorDisplay title="Error Loading Plans" error={planInstancesErrorData} />
              ) : (
                <>
                  {displayPlanInstances.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan ID</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Total Cost</TableHead>
                          <TableHead>Paid Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayPlanInstances.map((instance) => (
                          <TableRow key={instance.id}>
                            <TableCell className="font-medium">#{instance.id.substring(0, 8)}</TableCell>
                            <TableCell>{formatDate(instance.start_date)}</TableCell>
                            <TableCell>{formatDate(instance.end_date)}</TableCell>
                            <TableCell>{formatCurrency(instance.total_cost)}</TableCell>
                            <TableCell>{formatCurrency(instance.paid_amount)}</TableCell>
                            <TableCell>
                              {instance.is_active ? (
                                <Badge variant="success">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button asChild variant="outline" size="sm">
                                <Link to={`/dashboard/client/plan-instances/${instance.id}`}>View</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Plans Found</h3>
                      <p className="text-gray-500 mb-6">You haven't purchased any plans yet.</p>
                      <Button asChild>
                        <Link to="/dashboard/client/plans">Browse Available Plans</Link>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Make a Payment</h3>
              <p className="text-gray-500 mb-6">Need to make a payment for an existing plan?</p>
              <Button asChild>
                <Link to="/dashboard/payments/create">Make Payment</Link>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="visits">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">My Visit History</h2>
                <Button asChild>
                  <Link to="/dashboard/reservations/create">Make Reservation</Link>
                </Button>
              </div>
              
              {visitsError ? (
                <ErrorDisplay title="Error Loading Visits" error={visitsErrorData} />
              ) : (
                <>
                  {displayVisits.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayVisits.map((visit) => (
                          <TableRow key={visit.id}>
                            <TableCell>{formatDate(visit.check_in)}</TableCell>
                            <TableCell>{formatTime(visit.check_in)}</TableCell>
                            <TableCell>{visit.check_out ? formatTime(visit.check_out) : 'N/A'}</TableCell>
                            <TableCell>{visit.duration ? `${visit.duration} hours` : 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Visits Found</h3>
                      <p className="text-gray-500 mb-6">You haven't made any visits yet.</p>
                      <Button asChild>
                        <Link to="/dashboard/reservations/create">Schedule a Visit</Link>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default UserDashboard; 