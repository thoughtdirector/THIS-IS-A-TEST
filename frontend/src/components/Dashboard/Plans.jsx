import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { PlusCircle, Search, RefreshCw, Filter, ChevronDown, Clock, CreditCard, Calendar } from 'lucide-react';
import { DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Plans = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    duration_hours: '',
    is_class_plan: false,
    max_classes: '',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Fetch plans
  const { 
    data: plans, 
    isLoading: plansLoading,
    isError: plansError,
    error: plansErrorData,
    refetch: refetchPlans
  } = useQuery({
    queryKey: ['plans', showInactive],
    queryFn: () => DashboardService.getAllPlans({ 
      active_only: !showInactive 
    }),
  });
  
  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: DashboardService.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries(['plans']);
      setIsDialogOpen(false);
      resetNewPlanForm();
    },
  });
  
  // Filter plans based on search term
  const filteredPlans = plans ? plans.filter(plan => 
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const resetNewPlanForm = () => {
    setNewPlan({
      name: '',
      description: '',
      price: '',
      duration_days: '',
      duration_hours: '',
      is_class_plan: false,
      max_classes: '',
    });
  };
  
  const handleNewPlanChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewPlan({
      ...newPlan,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  const handleCreatePlan = (e) => {
    e.preventDefault();
    
    // Convert to correct data types
    const planData = {
      ...newPlan,
      price: parseFloat(newPlan.price),
      duration_days: newPlan.duration_days ? parseInt(newPlan.duration_days) : null,
      duration_hours: newPlan.duration_hours ? parseInt(newPlan.duration_hours) : null,
      max_classes: newPlan.max_classes ? parseInt(newPlan.max_classes) : null,
    };
    
    createPlanMutation.mutate(planData);
  };
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Membership Plans</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create New Membership Plan</DialogTitle>
              <DialogDescription>
                Define the details of the new membership plan.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlan}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Plan Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={newPlan.name}
                    onChange={handleNewPlanChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    value={newPlan.description}
                    onChange={handleNewPlanChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    Price
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPlan.price}
                    onChange={handleNewPlanChange}
                    className="col-span-3"
                    required
                  />
                </div>
                
                <Separator className="my-2" />
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration_days" className="text-right">
                    Duration (Days)
                  </Label>
                  <Input
                    id="duration_days"
                    name="duration_days"
                    type="number"
                    min="1"
                    value={newPlan.duration_days}
                    onChange={handleNewPlanChange}
                    className="col-span-3"
                    placeholder="e.g., 30 for a monthly plan"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration_hours" className="text-right">
                    Hours per Visit
                  </Label>
                  <Input
                    id="duration_hours"
                    name="duration_hours"
                    type="number"
                    min="1"
                    value={newPlan.duration_hours}
                    onChange={handleNewPlanChange}
                    className="col-span-3"
                    placeholder="Leave empty for unlimited hours"
                  />
                </div>
                
                <Separator className="my-2" />
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="is_class_plan" className="text-right">
                    Class-based Plan
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="is_class_plan"
                      name="is_class_plan"
                      checked={newPlan.is_class_plan}
                      onCheckedChange={(checked) => 
                        setNewPlan({...newPlan, is_class_plan: checked})
                      }
                    />
                    <Label htmlFor="is_class_plan">
                      Enable for class-based subscriptions
                    </Label>
                  </div>
                </div>
                
                {newPlan.is_class_plan && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="max_classes" className="text-right">
                      Max Classes
                    </Label>
                    <Input
                      id="max_classes"
                      name="max_classes"
                      type="number"
                      min="1"
                      value={newPlan.max_classes}
                      onChange={handleNewPlanChange}
                      className="col-span-3"
                      required={newPlan.is_class_plan}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetNewPlanForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPlanMutation.isPending}
                >
                  {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search plans..."
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
                checked={showInactive}
                onCheckedChange={setShowInactive}
              >
                Show Inactive Plans
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetchPlans()}
            disabled={plansLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {plansError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Error loading plans: {plansErrorData?.message || "Unknown error"}
          </AlertDescription>
        </Alert>
      ) : plansLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No plans found. Try adjusting your search or create a new plan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className={!plan.is_active ? "opacity-70" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription className="mt-1">{plan.description}</CardDescription>
                  </div>
                  <Badge variant={plan.is_active ? "default" : "secondary"}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-4">
                  ${plan.price.toFixed(2)}
                </div>
                
                <div className="space-y-2">
                  {plan.duration_days && (
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                      <span>{plan.duration_days} days duration</span>
                    </div>
                  )}
                  
                  {plan.duration_hours && (
                    <div className="flex items-center text-sm">
                      <Clock className="mr-2 h-4 w-4 text-gray-500" />
                      <span>{plan.duration_hours} hours per visit</span>
                    </div>
                  )}
                  
                  {plan.is_class_plan && (
                    <div className="flex items-center text-sm">
                      <CreditCard className="mr-2 h-4 w-4 text-gray-500" />
                      <span>{plan.max_classes} classes included</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/plans/${plan.id}/edit`}>
                    Edit
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={`/plans/${plan.id}`}>
                    View Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Plans;