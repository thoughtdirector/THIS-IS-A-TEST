import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClientService } from '@/client/services';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  ArrowLeft, Calendar, Clock, CreditCard, Package, Check, AlertCircle, 
  CreditCard as CreditCardIcon, Wallet, ReceiptText, Loader2, Info, ChevronDown,
  DollarSign, Percent
} from 'lucide-react';

// Import UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from '@tanstack/react-router';
// import { useToast } from "@/components/ui/use-toast";

const PlanPurchase = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // const { toast } = useToast();
  
  // State
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [addonQuantities, setAddonQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentType, setPaymentType] = useState('full'); // 'full' or 'partial'
  const [downPaymentAmount, setDownPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // Fetch plan details
  const {
    data: plan,
    isLoading: planLoading,
    error: planError
  } = useQuery({
    queryKey: ['clientPlan', planId],
    queryFn: () => ClientService.getPlanById(planId),
  });
  
  // Fetch client groups (for selection)
  const {
    data: clientGroups,
    isLoading: groupsLoading,
    error: groupsError
  } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => ClientService.getClientGroups(),
  });
  
  // Initialize addon quantities and down payment when plan loads
  useEffect(() => {
    if (plan) {
      // Initialize addon quantities
      if (plan.addons) {
        const initialAddonQuantities = {};
        Object.keys(plan.addons).forEach(addonName => {
          initialAddonQuantities[addonName] = 0;
        });
        setAddonQuantities(initialAddonQuantities);
      }
      
      // Set default down payment amount (50% of total)
      const total = calculateTotal();
      setDownPaymentAmount((total * 0.5).toFixed(2));
    }
  }, [plan]);
  
  // Calculate total price
  const calculateTotal = () => {
    if (!plan) return 0;
    
    let total = plan.price;
    
    // Add addon costs
    Object.entries(addonQuantities).forEach(([addonName, quantity]) => {
      if (quantity > 0 && plan.addons[addonName]) {
        total += plan.addons[addonName] * quantity;
      }
    });
    
    return total;
  };
  
  // Create plan instance mutation
  const createPlanInstanceMutation = useMutation({
    mutationFn: (planInstanceData) => ClientService.createPlanInstance(planInstanceData),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['clientActivePlans']);
      
      // toast({
      //   title: "Plan purchased successfully",
      //   description: "Your plan has been created and is being processed.",
      // });
      
      // Handle payment URL if returned
      if (data.payment_url) {
        // Redirect to ePayco payment gateway
        setTimeout(() => {
          window.location.href = data.payment_url;
        }, 1500);
      } else {
        // Navigate to plan instance details
        setTimeout(() => {
          navigate({ to: `/dashboard/client/plan-instances/${data.id}` });
        }, 1500);
      }
      
      setProcessingPayment(false);
    },
    onError: (error) => {
      console.error('Failed to create plan instance:', error);
      
      // toast({
      //   variant: "destructive",
      //   title: "Error processing purchase",
      //   description: error.message || "There was a problem with your purchase. Please try again.",
      // });
      
      setProcessingPayment(false);
    }
  });
  
  // Handle form submission
  const handlePurchase = () => {
    if (!selectedGroupId || !agreeToTerms) {
      // toast({
      //   variant: "destructive",
      //   title: "Invalid form",
      //   description: "Please fill in all required fields and agree to the terms.",
      // });
      return;
    }
    
    setProcessingPayment(true);
    
    // Filter out addons with quantity 0
    const purchasedAddons = {};
    Object.entries(addonQuantities).forEach(([addonName, quantity]) => {
      if (quantity > 0) {
        purchasedAddons[addonName] = quantity;
      }
    });
    
    // Calculate end date based on plan duration (if available)
    let endDate = null;
    if (plan.duration_days) {
      const end = new Date(startDate);
      end.setDate(end.getDate() + plan.duration_days);
      endDate = end.toISOString().split('T')[0];
    }
    
    // Create plan instance with payment details
    const totalAmount = calculateTotal();
    const planInstanceData = {
      client_group_id: selectedGroupId,
      plan_id: planId,
      start_date: new Date(startDate).toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : null,
      purchased_addons: purchasedAddons,
      payment_method: paymentMethod,
      payment_notes: paymentNotes,
      // Add payment type and down payment amount if paying partially
      payment_type: paymentType,
      payment_amount: paymentType === 'partial' ? parseFloat(downPaymentAmount) : totalAmount
    };
    
    createPlanInstanceMutation.mutate(planInstanceData);
  };
  
  // Handle addon quantity change
  const handleAddonChange = (addonName, value) => {
    setAddonQuantities(prev => ({
      ...prev,
      [addonName]: parseInt(value, 10)
    }));
  };
  
  // Handle down payment amount change
  const handleDownPaymentChange = (e) => {
    const value = parseFloat(e.target.value);
    const total = calculateTotal();
    
    // Ensure down payment is between 10% and 90% of total
    if (value < total * 0.1) {
      setDownPaymentAmount((total * 0.1).toFixed(2));
    } else if (value > total * 0.9) {
      setDownPaymentAmount((total * 0.9).toFixed(2));
    } else {
      setDownPaymentAmount(value.toFixed(2));
    }
  };
  
  // Calculate remaining balance
  const calculateRemainingBalance = () => {
    const total = calculateTotal();
    return paymentType === 'partial' ? total - parseFloat(downPaymentAmount) : 0;
  };
  
  if (planLoading || groupsLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link to="/dashboard/client/plans">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-full max-w-md mb-2" />
                <Skeleton className="h-4 w-full max-w-sm" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full mt-4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  if (planError || groupsError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {planError?.message || groupsError?.message || "Failed to load data"}
          </AlertDescription>
        </Alert>
        
        <Button asChild variant="secondary">
          <Link to="/dashboard/client/plans">Go back to plans</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/dashboard/client/plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Purchase Plan</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan Details Section */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plan Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Base Price</span>
                  <span className="text-xl font-bold">{formatCurrency(plan.price)}</span>
                </div>
                
                {plan.duration_days && (
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {plan.duration_days} days
                    </span>
                  </div>
                )}
                
                {plan.duration_hours && (
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Time per Visit</span>
                    <span className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      {plan.duration_hours} hours
                    </span>
                  </div>
                )}
                
                {plan.entries && (
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Included Entries</span>
                    <span className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                      {plan.entries} entries
                    </span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Addon Selection */}
              {Object.keys(plan.addons || {}).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Available Add-ons</h3>
                  
                  <div className="space-y-4">
                    {Object.entries(plan.addons).map(([addonName, addonPrice]) => (
                      <div key={addonName} className="flex justify-between items-center">
                        <div className="flex-1">
                          <Label>{addonName}</Label>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(addonPrice)} each
                          </p>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            min="0"
                            value={addonQuantities[addonName] || 0}
                            onChange={(e) => handleAddonChange(addonName, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Separator />
              
              {/* Client Group Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Select Client Group</h3>
                
                {clientGroups && clientGroups.length > 0 ? (
                  <Select 
                    value={selectedGroupId} 
                    onValueChange={setSelectedGroupId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client group" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientGroups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} 
                          {/* ({group.clients.length} members) */}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert className="mb-4">
                    <AlertDescription>
                      You don't have any client groups. Please create a client group first.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <Separator />
              
              {/* Start Date */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Start Date</h3>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {plan.duration_days && startDate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    End date: {formatDate(new Date(new Date(startDate).getTime() + plan.duration_days * 24 * 60 * 60 * 1000))}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Payment Summary Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Price</span>
                  <span>{formatCurrency(plan.price)}</span>
                </div>
                
                {Object.entries(addonQuantities).map(([addonName, quantity]) => {
                  if (quantity > 0) {
                    const addonPrice = plan.addons[addonName];
                    return (
                      <div key={addonName} className="flex justify-between">
                        <span>{addonName} × {quantity}</span>
                        <span>{formatCurrency(addonPrice * quantity)}</span>
                      </div>
                    );
                  }
                  return null;
                })}
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
              
              <Separator />
              
              {/* Payment Type */}
              <div>
                <h3 className="font-semibold mb-2">Payment Type</h3>
                <RadioGroup value={paymentType} onValueChange={setPaymentType}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="full" id="payment_full" />
                    <Label htmlFor="payment_full" className="flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Pay in Full
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id="payment_partial" />
                    <Label htmlFor="payment_partial" className="flex items-center">
                      <Percent className="mr-2 h-4 w-4" />
                      Pay Down Payment
                    </Label>
                  </div>
                </RadioGroup>
                
                {paymentType === 'partial' && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="down_payment">Down Payment Amount</Label>
                    <div className="flex space-x-2 items-center">
                      <Input
                        id="down_payment"
                        type="number"
                        min={calculateTotal() * 0.1}
                        max={calculateTotal() * 0.9}
                        value={downPaymentAmount}
                        onChange={handleDownPaymentChange}
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Down payment must be between 10% and 90% of total</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Remaining balance: {formatCurrency(calculateRemainingBalance())}
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Payment Method */}
              <div>
                <h3 className="font-semibold mb-2">Payment Method</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="credit_card" id="payment_credit_card" />
                    <Label htmlFor="payment_credit_card" className="flex items-center">
                      <CreditCardIcon className="mr-2 h-4 w-4" />
                      Credit Card
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="cash" id="payment_cash" />
                    <Label htmlFor="payment_cash" className="flex items-center">
                      <Wallet className="mr-2 h-4 w-4" />
                      Cash
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="invoice" id="payment_invoice" />
                    <Label htmlFor="payment_invoice" className="flex items-center">
                      <ReceiptText className="mr-2 h-4 w-4" />
                      Invoice
                    </Label>
                  </div>
                </RadioGroup>
                
                {/* Payment method details */}
                <div className="mt-2">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="payment-details">
                      <AccordionTrigger className="text-sm text-muted-foreground">
                        Payment Method Details
                      </AccordionTrigger>
                      <AccordionContent>
                        {paymentMethod === 'credit_card' && (
                          <div className="text-sm space-y-2">
                            <p>You'll be redirected to our secure payment gateway powered by ePayco.</p>
                            <p>You can pay with major credit cards including Visa, Mastercard, and American Express.</p>
                            <p>Your plan will be activated immediately after payment is confirmed.</p>
                          </div>
                        )}
                        {paymentMethod === 'cash' && (
                          <div className="text-sm space-y-2">
                            <p>Pay in person at our location.</p>
                            <p>Your plan will be activated after payment is received.</p>
                            <p>Please bring the exact amount in cash.</p>
                          </div>
                        )}
                        {paymentMethod === 'invoice' && (
                          <div className="text-sm space-y-2">
                            <p>An invoice will be sent to your email address.</p>
                            <p>Your plan will be activated once payment is received.</p>
                            <p>Please include the invoice number with your payment.</p>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                
                {/* Additional payment notes */}
                <div className="mt-4">
                  <Label htmlFor="payment_notes">Additional Notes</Label>
                  <Input
                    id="payment_notes"
                    placeholder="Optional payment notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* Terms and Conditions */}
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={agreeToTerms}
                  onCheckedChange={setAgreeToTerms}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground"
                  >
                    I agree to the terms and conditions of this purchase
                  </Label>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handlePurchase} 
                disabled={!selectedGroupId || !agreeToTerms || processingPayment}
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Complete Purchase</>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Security & Payment Information */}
          <Card className="mt-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Secure Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-2">
                <p className="flex items-center">
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                  Your payment is processed securely via ePayco
                </p>
                <p className="flex items-center">
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                  We don't store your card details
                </p>
                <p className="flex items-center">
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                  SSL encrypted payment processing
                </p>
                <div className="flex space-x-2 mt-2">
                  <img src="/assets/images/visa.svg" alt="Visa" className="h-6" />
                  <img src="/assets/images/mastercard.svg" alt="Mastercard" className="h-6" />
                  <img src="/assets/images/amex.svg" alt="Amex" className="h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlanPurchase; 