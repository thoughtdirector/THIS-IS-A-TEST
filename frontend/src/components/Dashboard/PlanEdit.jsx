import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PlanEdit = () => {
  const { planId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // State for form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    duration_hours: '',
    is_class_plan: false,
    max_classes: '',
    addons: [],
  });
  
  // State for new addon
  const [newAddon, setNewAddon] = useState({
    name: '',
    price: '',
  });
  
  // Fetch plan details
  const { 
    data: plan, 
    isLoading: planLoading,
    isError: planError,
    error: planErrorData
  } = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => DashboardService.getPlan({ id: planId }),
  });
  
  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: (data) => DashboardService.updatePlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['plan', planId]);
      navigate({ to: `/dashboard/plans/${planId}` });
    },
  });
  
  // Initialize form data when plan data is loaded
  useEffect(() => {
    if (plan) {
      // Convert addons object to array
      const addonsArray = Object.entries(plan.addons || {}).map(([name, price]) => ({
        name,
        price: price.toString(),
      }));
      
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price: plan.price ? plan.price.toString() : '',
        duration_days: plan.duration_days ? plan.duration_days.toString() : '',
        duration_hours: plan.duration_hours ? plan.duration_hours.toString() : '',
        is_class_plan: plan.is_class_plan || false,
        max_classes: plan.max_classes ? plan.max_classes.toString() : '',
        addons: addonsArray,
      });
    }
  }, [plan]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  const handleAddAddon = () => {
    if (newAddon.name && newAddon.price) {
      setFormData({
        ...formData,
        addons: [...formData.addons, { ...newAddon }]
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
    setFormData({
      ...formData,
      addons: formData.addons.filter((_, i) => i !== index)
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert to correct data types
    const updateData = {
      id: planId,
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
      duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null,
      is_class_plan: formData.is_class_plan,
      max_classes: formData.max_classes ? parseInt(formData.max_classes) : null,
      // Convert addons array to an object with addon names as keys and prices as values
      addons: formData.addons.reduce((acc, addon) => {
        acc[addon.name] = parseFloat(addon.price);
        return acc;
      }, {}),
    };
    
    updatePlanMutation.mutate(updateData);
  };
  
  if (planLoading) {
    return (
      <div className="container mx-auto py-6 max-w-5xl">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link to={`/dashboard/plans/${planId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Loading Plan...</h1>
        </div>
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (planError || !plan) {
    return (
      <div className="container mx-auto py-6 max-w-5xl">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link to="/dashboard/plans">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Plan</h1>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {planErrorData?.message || "Failed to load plan details"}
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => navigate({ to: '/dashboard/plans' })}
            >
              Return to Plans
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to={`/dashboard/plans/${planId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Plan: {plan.name}</h1>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Plan Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
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
                  value={formData.description}
                  onChange={handleChange}
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
                  value={formData.price}
                  onChange={handleChange}
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
                  value={formData.duration_days}
                  onChange={handleChange}
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
                  value={formData.duration_hours}
                  onChange={handleChange}
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
                    checked={formData.is_class_plan}
                    onCheckedChange={(checked) => 
                      setFormData({...formData, is_class_plan: checked})
                    }
                  />
                  <Label htmlFor="is_class_plan">
                    Enable for class-based subscriptions
                  </Label>
                </div>
              </div>
              
              {formData.is_class_plan && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="max_classes" className="text-right">
                    Max Classes
                  </Label>
                  <Input
                    id="max_classes"
                    name="max_classes"
                    type="number"
                    min="1"
                    value={formData.max_classes}
                    onChange={handleChange}
                    className="col-span-3"
                    required={formData.is_class_plan}
                  />
                </div>
              )}
              
              <Separator className="my-2" />
              
              <div className="col-span-4">
                <Label className="mb-2 block">Add-ons</Label>
                <div className="mb-4">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <Input
                      placeholder="Add-on name"
                      name="name"
                      value={newAddon.name}
                      onChange={handleAddonChange}
                      className="col-span-1"
                    />
                    <Input
                      placeholder="Price per unit"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newAddon.price}
                      onChange={handleAddonChange}
                      className="col-span-1"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddAddon}
                      disabled={!newAddon.name || !newAddon.price}
                      className="col-span-1"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
                
                {formData.addons.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Add-on Name</TableHead>
                        <TableHead>Price per Unit</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.addons.map((addon, index) => (
                        <TableRow key={index}>
                          <TableCell>{addon.name}</TableCell>
                          <TableCell>${parseFloat(addon.price).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAddon(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate({ to: `/dashboard/plans/${planId}` })}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updatePlanMutation.isPending}
                className="flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {updatePlanMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanEdit; 