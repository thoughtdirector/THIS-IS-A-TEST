import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CreditCard, Receipt, Save, Search, Info } from 'lucide-react';
import { ClientService, DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const PaymentCreate = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amount: '',
    payment_method: 'credit_card',
    transaction_id: '',
    notes: ''
  });
  const [paymentType, setPaymentType] = useState('direct');
  
  // Generate a random transaction ID when component mounts
  useEffect(() => {
    const generateTransactionId = () => {
      const timestamp = new Date().getTime().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      return `TX-${timestamp}-${random}`.toUpperCase();
    };
    
    setPaymentDetails(prev => ({
      ...prev,
      transaction_id: generateTransactionId()
    }));
  }, []);
  
  // Fetch active clients
  const { 
    data: clients, 
    isLoading: clientsLoading,
    isError: clientsError,
    error: clientsErrorData
  } = useQuery({
    queryKey: ['clients'],
    queryFn: () => DashboardService.getClients({ 
      limit: 100,
      active_only: true 
    }),
  });
  
  // Fetch client's active subscriptions
  const { 
    data: subscriptions, 
    isLoading: subscriptionsLoading,
    isError: subscriptionsError,
    error: subscriptionsErrorData,
    refetch: refetchSubscriptions
  } = useQuery({
    queryKey: ['clientSubscriptions', selectedClient?.id],
    queryFn: () => DashboardService.getClientSubscriptions({ 
      client_id: selectedClient?.id,
      active_only: true 
    }),
    enabled: !!selectedClient?.id && paymentType === 'subscription',
  });
  
  // Fetch subscription details to auto-fill amount
  const {
    data: subscriptionDetails,
    isLoading: subscriptionDetailsLoading
  } = useQuery({
    queryKey: ['subscription', selectedSubscription],
    queryFn: () => DashboardService.getSubscription({ id: selectedSubscription }),
    enabled: !!selectedSubscription,
    onSuccess: (data) => {
      if (data && data.plan && data.plan.price) {
        setPaymentDetails(prev => ({
          ...prev,
          amount: data.plan.price.toString()
        }));
      }
    }
  });
  
  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: ClientService.createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      navigate({ to: '/dashboard/payments' });
    },
  });
  
  // Filter clients based on search term
  const filteredClients = clients ? clients.filter(client => 
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  ) : [];
  
  // Handle client selection
  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client);
    setSelectedSubscription(null);
  };
  
  // Handle payment details change
  const handlePaymentDetailsChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails({
      ...paymentDetails,
      [name]: value,
    });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedClient) {
      return;
    }
    
    const paymentData = {
      client_id: selectedClient.id,
      amount: parseFloat(paymentDetails.amount),
      payment_method: paymentDetails.payment_method,
      transaction_id: paymentDetails.transaction_id,
      subscription_id: paymentType === 'subscription' ? selectedSubscription : null,
      notes: paymentDetails.notes
    };
    
    createPaymentMutation.mutate(paymentData);
  };
  
  // Format currency input
  const formatCurrency = (value) => {
    // Allow for empty input and input with decimal point
    if (value === '' || value === '.') return value;
    
    // Convert to number and format
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    
    return num.toFixed(2);
  };
  
  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/dashboard/payments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Process Payment</h1>
      </div>
      
      <Tabs value={paymentType} onValueChange={setPaymentType}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="direct" className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            Direct Payment
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center">
            <Receipt className="mr-2 h-4 w-4" />
            Subscription Payment
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="direct">
          <Card>
            <CardHeader>
              <CardTitle>Process Direct Payment</CardTitle>
              <CardDescription>
                Process a one-time payment for a client
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Client Selection */}
                <div className="space-y-2">
                  <Label>Select Client</Label>
                  
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search clients by name, email or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    
                    <Select
                      value={selectedClient?.id || ''}
                      onValueChange={handleClientSelect}
                    >
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedClient && (
                    <div className="bg-blue-50 p-3 rounded-md mt-2">
                      <p className="font-medium">{selectedClient.full_name}</p>
                      <p className="text-sm text-gray-500">{selectedClient.email}</p>
                      <p className="text-sm text-gray-500">{selectedClient.phone}</p>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Payment Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Payment Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5">$</span>
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={paymentDetails.amount}
                          onChange={handlePaymentDetailsChange}
                          className="pl-7"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="payment_method">Payment Method</Label>
                      <Select
                        value={paymentDetails.payment_method}
                        onValueChange={(value) => 
                          setPaymentDetails({...paymentDetails, payment_method: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="transaction_id">Transaction ID</Label>
                    <Input
                      id="transaction_id"
                      name="transaction_id"
                      value={paymentDetails.transaction_id}
                      onChange={handlePaymentDetailsChange}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Unique identifier for this payment transaction
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      name="notes"
                      value={paymentDetails.notes}
                      onChange={handlePaymentDetailsChange}
                      placeholder="Add any additional notes about this payment"
                    />
                  </div>
                </div>
                
                {/* Error message */}
                {createPaymentMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {createPaymentMutation.error?.message || "Error processing payment"}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: '/dashboard/payments' })}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createPaymentMutation.isPending || !selectedClient || !paymentDetails.amount}
                  className="flex items-center"
                >
                  {createPaymentMutation.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Process Payment
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Process Subscription Payment</CardTitle>
              <CardDescription>
                Process a payment for a client's subscription plan
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Client Selection */}
                <div className="space-y-2">
                  <Label>Select Client</Label>
                  
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search clients by name, email or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    
                    <Select
                      value={selectedClient?.id || ''}
                      onValueChange={handleClientSelect}
                    >
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedClient && (
                    <div className="bg-blue-50 p-3 rounded-md mt-2">
                      <p className="font-medium">{selectedClient.full_name}</p>
                      <p className="text-sm text-gray-500">{selectedClient.email}</p>
                      <p className="text-sm text-gray-500">{selectedClient.phone}</p>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Subscription Selection */}
                {selectedClient && (
                  <div className="space-y-2">
                    <Label>Select Subscription</Label>
                    <Select
                      value={selectedSubscription || ''}
                      onValueChange={setSelectedSubscription}
                      disabled={subscriptionsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subscription" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptions && subscriptions.map((subscription) => (
                          <SelectItem key={subscription.id} value={subscription.id}>
                            {subscription.plan_name || `Plan #${subscription.plan_id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {subscriptionsLoading && <p className="text-sm text-gray-500">Loading subscriptions...</p>}
                    {subscriptionsError && <p className="text-sm text-red-500">Error loading subscriptions</p>}
                    {subscriptions && subscriptions.length === 0 && (
                      <Alert variant="warning">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          This client has no active subscriptions. Please select a different client or use direct payment.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {selectedSubscription && subscriptionDetailsLoading && (
                      <p className="text-sm text-gray-500">Loading subscription details...</p>
                    )}
                  </div>
                )}
                
                <Separator />
                
                {/* Payment Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Payment Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5">$</span>
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={paymentDetails.amount}
                          onChange={handlePaymentDetailsChange}
                          className="pl-7"
                          required
                        />
                      </div>
                      {selectedSubscription && subscriptionDetails && (
                        <p className="text-xs text-gray-500">
                          Subscription plan price: ${subscriptionDetails.plan.price}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="payment_method">Payment Method</Label>
                      <Select
                        value={paymentDetails.payment_method}
                        onValueChange={(value) => 
                          setPaymentDetails({...paymentDetails, payment_method: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="transaction_id">Transaction ID</Label>
                    <Input
                      id="transaction_id"
                      name="transaction_id"
                      value={paymentDetails.transaction_id}
                      onChange={handlePaymentDetailsChange}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Unique identifier for this payment transaction
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      name="notes"
                      value={paymentDetails.notes}
                      onChange={handlePaymentDetailsChange}
                      placeholder="Add any additional notes about this payment"
                    />
                  </div>
                </div>
                
                {/* Error message */}
                {createPaymentMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {createPaymentMutation.error?.message || "Error processing payment"}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: '/dashboard/payments' })}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={
                    createPaymentMutation.isPending || 
                    !selectedClient || 
                    !paymentDetails.amount || 
                    (paymentType === 'subscription' && !selectedSubscription)
                  }
                  className="flex items-center"
                >
                  {createPaymentMutation.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Process Payment
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentCreate;