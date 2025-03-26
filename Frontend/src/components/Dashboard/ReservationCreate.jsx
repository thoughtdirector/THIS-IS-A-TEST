import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Calendar, Clock, Save, Search, Info } from 'lucide-react';
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
import { DatePicker } from '@/components/ui/date-picker';

import { Separator } from '@/components/ui/separator';

const ReservationCreate = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [reservationDate, setReservationDate] = useState(new Date());
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(1);
  
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
    enabled: !!selectedClient?.id,
  });
  
  // Create reservation mutation
  const createReservationMutation = useMutation({
    mutationFn: ClientService.createReservation,
    onSuccess: () => {
      queryClient.invalidateQueries(['reservations']);
      navigate({ to: '/dashboard/reservations' });
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
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedClient || !reservationDate || !startTime) {
      return;
    }
    
    // Parse the time string to get hours and minutes
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Create a new date object for the reservation datetime
    const reservationDateTime = new Date(reservationDate);
    reservationDateTime.setHours(hours, minutes, 0, 0);
    
    const reservationData = {
      client_id: selectedClient.id,
      date: reservationDateTime.toISOString(),
      duration_hours: parseFloat(duration),
      subscription_id: selectedSubscription
    };
    
    createReservationMutation.mutate(reservationData);
  };
  
  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/dashboard/reservations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Create New Reservation</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Reservation Details</CardTitle>
          <CardDescription>
            Schedule a new reservation for a client
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
                <Label>Subscription (Optional)</Label>
                
                <Select
                  value={selectedSubscription || ''}
                  onValueChange={setSelectedSubscription}
                  disabled={subscriptionsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No Subscription</SelectItem>
                    {subscriptions && subscriptions.map((subscription) => (
                      <SelectItem key={subscription.id} value={subscription.id}>
                        {subscription.plan_name || `Plan #${subscription.plan_id}`} 
                        {subscription.remaining_time ? ` (${subscription.remaining_time.toFixed(1)} hours left)` : ''}
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
                      This client has no active subscriptions. You can still create a reservation without a subscription.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            <Separator />
            
            {/* Date and Time Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date">Reservation Date</Label>
                <DatePicker
                  selected={reservationDate}
                  onSelect={setReservationDate}
                  minDate={new Date()}
                  required
                />
              </div>
              
              {/* <div className="space-y-2">
                <Label htmlFor="time">Start Time</Label>
                <TimeField
                  value={startTime}
                  onChange={setStartTime}
                  required
                />
              </div> */}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (hours)</Label>
              <div className="flex space-x-2 items-center">
                <Input
                  id="duration"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                  className="w-32"
                />
                <span className="text-sm text-gray-500">hours</span>
              </div>
            </div>
            
            {/* Error message */}
            {createReservationMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {createReservationMutation.error?.message || "Error creating reservation"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/dashboard/reservations' })}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createReservationMutation.isPending || !selectedClient}
              className="flex items-center"
            >
              {createReservationMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Reservation
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ReservationCreate;