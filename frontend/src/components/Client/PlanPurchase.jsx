import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClientService, DashboardService } from '@/client/services';
import { ArrowLeft, Plus, Trash, CreditCard, Calendar, Check, AlertCircle } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';

const PlanPurchase = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { planId } = useParams();
  
  const [selectedAddons, setSelectedAddons] = useState({});
  const [totalCost, setTotalCost] = useState(0);
  const [clientGroups, setClientGroups] = useState([]);
  const [selectedClientGroup, setSelectedClientGroup] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  // Fetch plan data
  const { data: planData, isLoading: planLoading, isError, error } = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => DashboardService.getPlan({ planId }),
  });
  
  // Fetch client's groups
  const { data: clientGroupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => ClientService.getClientGroups(),
  });
  
  // Update client groups when data is loaded
  useEffect(() => {
    if (clientGroupsData?.length) {
      setClientGroups(clientGroupsData);
      if (clientGroupsData.length > 0) {
        setSelectedClientGroup(clientGroupsData[0].id);
      }
    }
  }, [clientGroupsData]);
  
  // Calculate total cost when plan data changes or addons are selected
  useEffect(() => {
    if (planData) {
      let cost = planData.price || 0;
      
      // Add selected addons
      Object.entries(selectedAddons).forEach(([name, selected]) => {
        if (selected && planData.addons && planData.addons[name]) {
          cost += planData.addons[name];
        }
      });
      
      setTotalCost(cost);
    }
  }, [planData, selectedAddons]);
  
  // Create plan instance mutation
  const createPlanInstanceMutation = useMutation({
    mutationFn: ClientService.createPlanInstance,
    onSuccess: (data) => {
      toast.success('Plan purchased successfully!');
      queryClient.invalidateQueries(['clientPlans']);
      
      // Redirect to payment processor if needed
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        navigate({ to: '/client/plans' });
      }
    },
    onError: (error) => {
      toast.error('Failed to purchase plan: ' + error.message);
    }
  });
  
  const handleAddonToggle = (addonName) => {
    setSelectedAddons(prev => ({
      ...prev,
      [addonName]: !prev[addonName]
    }));
  };
  
  const handlePurchase = (e) => {
    e.preventDefault();
    
    if (!selectedClientGroup) {
      toast.error('Please select a client group');
      return;
    }
    
    if (!agreeToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }
    
    // Prepare purchased addons object
    const purchasedAddons = {};
    Object.entries(selectedAddons).forEach(([name, selected]) => {
      if (selected) {
        purchasedAddons[name] = 1; // Quantity - can be modified later
      }
    });
    
    // Prepare start date (now)
    const startDate = new Date();
    
    // Calculate end date if applicable
    let endDate = null;
    if (planData.duration_days) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + planData.duration_days);
    }
    
    // Prepare plan instance data
    const planInstanceData = {
      client_group_id: selectedClientGroup,
      plan_id: planId,
      start_date: startDate.toISOString(),
      end_date: endDate ? endDate.toISOString() : null,
      purchased_addons: Object.keys(purchasedAddons).length > 0 ? purchasedAddons : null,
      remaining_entries: planData.entries || null,
      payment_method: paymentMethod
    };
    
    // Call API
    createPlanInstanceMutation.mutate(planInstanceData);
  };
  
  if (planLoading || groupsLoading) {
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
  
  if (!planData) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertDescription>
            Plan not found or you don't have access to this plan.
          </AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link to="/client/plans">Back to Plans</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/client/plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Purchase Plan: {planData.name}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
              <CardDescription>
                Select your options and complete your purchase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="purchaseForm" onSubmit={handlePurchase}>
                <div className="space-y-6">
                  {/* Client Group Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="client-group">Select Group/Family</Label>
                    {clientGroups.length > 0 ? (
                      <RadioGroup 
                        id="client-group" 
                        value={selectedClientGroup}
                        onValueChange={setSelectedClientGroup}
                        className="space-y-2"
                      >
                        {clientGroups.map(group => (
                          <div key={group.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={group.id} id={`group-${group.id}`} />
                            <Label htmlFor={`group-${group.id}`} className="cursor-pointer">
                              {group.name} ({group.clients.length} members)
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <Alert>
                        <AlertDescription>
                          You don't have any client groups. Please create one first.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {/* Add-ons Selection */}
                  {planData.addons && Object.keys(planData.addons).length > 0 && (
                    <div className="space-y-2">
                      <Label>Available Add-ons</Label>
                      <div className="space-y-2">
                        {Object.entries(planData.addons).map(([name, price]) => (
                          <div key={name} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`addon-${name}`} 
                              checked={selectedAddons[name] || false}
                              onCheckedChange={() => handleAddonToggle(name)}
                            />
                            <Label htmlFor={`addon-${name}`} className="cursor-pointer flex-1">
                              {name}
                            </Label>
                            <span className="text-sm font-medium">
                              {formatCurrency(price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <RadioGroup 
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="credit_card" id="credit-card" />
                        <Label htmlFor="credit-card" className="cursor-pointer flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Credit Card (ePayco)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="cursor-pointer">
                          Cash (Pay at Location)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        
        {/* Summary Card */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Base Plan:</span>
                <span className="font-medium">{formatCurrency(planData.price)}</span>
              </div>
              
              {/* Selected Add-ons */}
              {Object.entries(selectedAddons)
                .filter(([_, selected]) => selected)
                .map(([name]) => (
                  <div key={name} className="flex justify-between">
                    <span>{name}:</span>
                    <span className="font-medium">
                      {formatCurrency(planData.addons[name])}
                    </span>
                  </div>
                ))
              }
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(totalCost)}</span>
              </div>
              
              <div className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  {planData.duration_days && (
                    <div className="bg-gray-50 p-2 rounded-md text-center">
                      <span className="text-sm text-gray-500 block">Duration</span>
                      <span className="font-medium">{planData.duration_days} days</span>
                    </div>
                  )}
                  
                  {planData.entries && (
                    <div className="bg-gray-50 p-2 rounded-md text-center">
                      <span className="text-sm text-gray-500 block">Entries</span>
                      <span className="font-medium">{planData.entries}</span>
                    </div>
                  )}
                  
                  {planData.duration_hours && (
                    <div className="bg-gray-50 p-2 rounded-md text-center">
                      <span className="text-sm text-gray-500 block">Hours/Visit</span>
                      <span className="font-medium">{planData.duration_hours}</span>
                    </div>
                  )}
                  
                  {planData.limits?.users && (
                    <div className="bg-gray-50 p-2 rounded-md text-center">
                      <span className="text-sm text-gray-500 block">Max Users</span>
                      <span className="font-medium">{planData.limits.users}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                form="purchaseForm"
                className="w-full"
                disabled={createPlanInstanceMutation.isPending || clientGroups.length === 0}
              >
                {createPlanInstanceMutation.isPending 
                  ? 'Processing...' 
                  : `Proceed to ${paymentMethod === 'credit_card' ? 'Payment' : 'Checkout'}`}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlanPurchase; 