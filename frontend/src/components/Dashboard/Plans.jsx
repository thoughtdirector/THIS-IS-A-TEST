import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { PlusCircle, ArrowLeft, Search, RefreshCw, Filter, ChevronDown, Clock, CreditCard, Calendar, Trash2, Plus } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    addons: [],
  });
  const [newAddon, setNewAddon] = useState({
    name: '',
    price: '',
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
      addons: [],
    });
    setNewAddon({
      name: '',
      price: '',
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
      // Convert addons array to an object with addon names as keys and prices as values
      addons: newPlan.addons.reduce((acc, addon) => {
        acc[addon.name] = parseFloat(addon.price);
        return acc;
      }, {}),
    };
    
    createPlanMutation.mutate(planData);
  };

  const handleAddAddon = () => {
    if (newAddon.name && newAddon.price) {
      setNewPlan({
        ...newPlan,
        addons: [...newPlan.addons, { ...newAddon }]
      });
      setNewAddon({ name: '', price: '' });
    }
  };

  const handleAddonChange = (e) => {
    const { name, value } = e.target;
    setNewAddon({
      ...newAddon,
      [name]: value,
    });
  };

  const handleRemoveAddon = (index) => {
    setNewPlan({
      ...newPlan,
      addons: newPlan.addons.filter((_, i) => i !== index)
    });
  };
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link to="/dashboard/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Membership Plans</h1>
        </div>
        <Button asChild>
          <Link to="/dashboard/plans/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Plan
          </Link>
        </Button>
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
                  <Link to={`/dashboard/plans/${plan.id}/edit`}>
                    Edit
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={`/dashboard/plans/${plan.id}`}>
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