import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardService } from '@/client/services';
import { ArrowLeft, Plus, Trash } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

const PlanEdit = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { planId } = useParams();
  
  const [plan, setPlan] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    duration_hours: '',
    entries: '',
    is_active: true,
    addons: [],
    limits: {
      users: '',
      time: ''
    }
  });
  
  const [newAddon, setNewAddon] = useState({
    name: '',
    price: '',
  });

  // Fetch plan data
  const { data: planData, isLoading } = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => DashboardService.getPlan({ planId }),
  });

  // Update state when plan data is loaded
  useEffect(() => {
    if (planData) {
      setPlan({
        name: planData.name,
        description: planData.description,
        price: planData.price,
        duration_days: planData.duration_days || '',
        duration_hours: planData.duration_hours || '',
        entries: planData.entries || '',
        is_active: planData.is_active,
        addons: planData.addons && Object.keys(planData.addons).length > 0 
          ? Object.entries(planData.addons).map(([name, price]) => ({ name, price })) 
          : [],
        limits: planData.limits || { users: '', time: '' }
      });
    }
  }, [planData]);

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: DashboardService.updatePlan,
    onSuccess: () => {
      toast.success('Plan updated successfully');
      queryClient.invalidateQueries(['plans']);
      queryClient.invalidateQueries(['plan', planId]);
      navigate({ to: '/dashboard/plans' });
    },
    onError: (error) => {
      toast.error('Failed to update plan: ' + error.message);
    }
  });

  const handlePlanChange = (e) => {
    const { name, value } = e.target;
    setPlan(prev => ({ ...prev, [name]: value }));
  };

  const handleActiveToggle = (checked) => {
    setPlan(prev => ({ ...prev, is_active: checked }));
  };

  const handleLimitsChange = (e) => {
    const { name, value } = e.target;
    setPlan(prev => ({
      ...prev,
      limits: {
        ...prev.limits,
        [name]: value
      }
    }));
  };

  const handleUpdatePlan = (e) => {
    e.preventDefault();
    
    // Convert addons array to object
    const addonsObject = {};
    plan.addons.forEach(addon => {
      addonsObject[addon.name] = parseFloat(addon.price);
    });
    
    // Prepare data for API
    const updateData = {
      name: plan.name,
      description: plan.description,
      price: parseFloat(plan.price),
      is_active: plan.is_active,
      addons: addonsObject,
      limits: plan.limits
    };
    
    // Only add these fields if they have values
    if (plan.duration_days) updateData.duration_days = parseInt(plan.duration_days);
    if (plan.duration_hours) updateData.duration_hours = parseInt(plan.duration_hours);
    if (plan.entries) updateData.entries = parseInt(plan.entries);
    
    // Call API
    updatePlanMutation.mutate({
      planId,
      requestBody: updateData
    });
  };

  const handleAddAddon = () => {
    if (newAddon.name && newAddon.price) {
      setPlan(prev => ({
        ...prev,
        addons: [...prev.addons, { ...newAddon }]
      }));
      setNewAddon({ name: '', price: '' });
    }
  };

  const handleAddonChange = (e) => {
    const { name, value } = e.target;
    setNewAddon(prev => ({ ...prev, [name]: value }));
  };

  const handleRemoveAddon = (index) => {
    setPlan(prev => ({
      ...prev,
      addons: prev.addons.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link to="/dashboard/plans">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Loading plan data...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/dashboard/plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Plan</h1>
      </div>

      <form onSubmit={handleUpdatePlan}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Edit the plan's basic details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={plan.name}
                  onChange={handlePlanChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={plan.description}
                  onChange={handlePlanChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={plan.price}
                  onChange={handlePlanChange}
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="is_active" 
                  checked={plan.is_active}
                  onCheckedChange={handleActiveToggle}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </CardContent>
          </Card>

          {/* Plan Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Parameters</CardTitle>
              <CardDescription>
                Set the duration and entry limits for this plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration_days">Duration (Days)</Label>
                <Input
                  id="duration_days"
                  name="duration_days"
                  type="number"
                  min="0"
                  value={plan.duration_days}
                  onChange={handlePlanChange}
                  placeholder="Leave empty if not applicable"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration_hours">Hours per Visit</Label>
                <Input
                  id="duration_hours"
                  name="duration_hours"
                  type="number"
                  min="0"
                  value={plan.duration_hours}
                  onChange={handlePlanChange}
                  placeholder="Leave empty if not applicable"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="entries">Number of Entries</Label>
                <Input
                  id="entries"
                  name="entries"
                  type="number"
                  min="0"
                  value={plan.entries}
                  onChange={handlePlanChange}
                  placeholder="Leave empty if unlimited"
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label htmlFor="users">Max Users</Label>
                <Input
                  id="users"
                  name="users"
                  type="number"
                  min="0"
                  value={plan.limits.users}
                  onChange={handleLimitsChange}
                  placeholder="Leave empty if unlimited"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Time Limit (hours)</Label>
                <Input
                  id="time"
                  name="time"
                  type="number"
                  min="0"
                  value={plan.limits.time}
                  onChange={handleLimitsChange}
                  placeholder="Leave empty if unlimited"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add-ons Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Add-ons</CardTitle>
            <CardDescription>
              Additional services or features that can be added to this plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 mb-4">
              <div className="flex-1">
                <Label htmlFor="addon-name">Add-on Name</Label>
                <Input
                  id="addon-name"
                  name="name"
                  value={newAddon.name}
                  onChange={handleAddonChange}
                />
              </div>
              <div className="w-32">
                <Label htmlFor="addon-price">Price ($)</Label>
                <Input
                  id="addon-price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAddon.price}
                  onChange={handleAddonChange}
                />
              </div>
              <Button type="button" onClick={handleAddAddon} className="flex gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            
            {plan.addons.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Add-on</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.addons.map((addon, index) => (
                    <TableRow key={index}>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell>${parseFloat(addon.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAddon(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Alert>
                <AlertDescription>
                  No add-ons added yet. Add some using the form above.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-4">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => navigate({ to: '/dashboard/plans' })}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updatePlanMutation.isPending}
            >
              {updatePlanMutation.isPending ? 'Updating...' : 'Update Plan'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default PlanEdit; 