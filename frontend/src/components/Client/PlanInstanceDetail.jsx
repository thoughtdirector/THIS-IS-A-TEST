import React, { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClientService } from '@/client/services';
import { ArrowLeft, Calendar, Clock, CreditCard, Users, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';

const PlanInstanceDetail = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { instanceId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch plan instance details
  const { 
    data: planInstance, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['planInstance', instanceId],
    queryFn: () => ClientService.getPlanInstance({ instanceId }),
  });
  
  // Fetch visits for this plan instance
  const { 
    data: visits, 
    isLoading: visitsLoading 
  } = useQuery({
    queryKey: ['planInstanceVisits', instanceId],
    queryFn: () => ClientService.getPlanInstanceVisits({ instanceId }),
  });
  
  // Fetch payments for this plan instance
  const { 
    data: payments, 
    isLoading: paymentsLoading 
  } = useQuery({
    queryKey: ['planInstancePayments', instanceId],
    queryFn: () => ClientService.getPlanInstancePayments({ instanceId }),
  });
  
  // Make payment mutation
  const makePaymentMutation = useMutation({
    mutationFn: ClientService.makePayment,
    onSuccess: (data) => {
      toast.success('Payment initiated successfully');
      queryClient.invalidateQueries(['planInstance', instanceId]);
      queryClient.invalidateQueries(['planInstancePayments', instanceId]);
      
      // Redirect to payment processor if needed
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    },
    onError: (error) => {
      toast.error('Failed to process payment: ' + error.message);
    }
  });
  
  const handleMakePayment = () => {
    if (!planInstance) return;
    
    const remainingAmount = planInstance.total_cost - planInstance.paid_amount;
    
    if (remainingAmount <= 0) {
      toast.info('This plan is already fully paid');
      return;
    }
    
    makePaymentMutation.mutate({
      plan_instance_id: instanceId,
      amount: remainingAmount,
      payment_method: 'credit_card'
    });
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
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
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link to="/client/plans">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Loading plan details...</h1>
        </div>
      </div>
    );
  }
  
  if (isError || !planInstance) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link to="/client/plans">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Plan Details</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            {error?.message || "Failed to load plan details"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const plan = planInstance.plan;
  const remainingAmount = planInstance.total_cost - planInstance.paid_amount;
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/client/plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Plan: {plan.name}</h1>
        <Badge className="ml-4" variant={planInstance.is_active ? "success" : "secondary"}>
          {planInstance.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Plan Details</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                    <p>{formatDate(planInstance.start_date)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">End Date</h3>
                    <p>{formatDate(planInstance.end_date)}</p>
                  </div>
                  
                  {planInstance.remaining_entries !== null && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Remaining Entries</h3>
                      <p>{planInstance.remaining_entries}</p>
                    </div>
                  )}
                  
                  {plan.duration_hours && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Hours per Visit</h3>
                      <p>{plan.duration_hours}</p>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Client Group</h3>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{planInstance.client_group.name}</span>
                  </div>
                </div>
                
                {planInstance.purchased_addons && Object.keys(planInstance.purchased_addons).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Purchased Add-ons</h3>
                      <ul className="space-y-1">
                        {Object.entries(planInstance.purchased_addons).map(([name, quantity]) => (
                          <li key={name} className="flex items-center">
                            <Plus className="h-3 w-3 mr-2 text-gray-500" />
                            <span>{name} (x{quantity})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-medium">{formatCurrency(planInstance.total_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid Amount:</span>
                    <span className="font-medium">{formatCurrency(planInstance.paid_amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Remaining:</span>
                    <span>{formatCurrency(remainingAmount)}</span>
                  </div>
                </div>
                
                <div className="flex items-center mt-4">
                  {planInstance.is_fully_paid ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span>Fully Paid</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-amber-600">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>Payment Required</span>
                    </div>
                  )}
                </div>
              </CardContent>
              {!planInstance.is_fully_paid && (
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleMakePayment}
                    disabled={makePaymentMutation.isPending}
                  >
                    {makePaymentMutation.isPending ? 'Processing...' : 'Pay Now'}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="visits">
          <Card>
            <CardHeader>
              <CardTitle>Visit History</CardTitle>
              <CardDescription>
                Record of all visits using this plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visitsLoading ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : visits?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map(visit => (
                      <TableRow key={visit.id}>
                        <TableCell>{formatDate(visit.check_in)}</TableCell>
                        <TableCell>{visit.client.full_name}</TableCell>
                        <TableCell>{formatTime(visit.check_in)}</TableCell>
                        <TableCell>{visit.check_out ? formatTime(visit.check_out) : 'Active'}</TableCell>
                        <TableCell>
                          {visit.duration ? `${visit.duration.toFixed(1)} hrs` : 'In Progress'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert>
                  <AlertDescription>
                    No visits recorded for this plan yet.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Record of all payments for this plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : payments?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.created_at)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell className="capitalize">{payment.payment_method.replace('_', ' ')}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'completed' ? 'success' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert>
                  <AlertDescription>
                    No payments recorded for this plan yet.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            {!planInstance.is_fully_paid && (
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={handleMakePayment}
                  disabled={makePaymentMutation.isPending}
                >
                  {makePaymentMutation.isPending ? 'Processing...' : 'Make Payment'}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlanInstanceDetail; 