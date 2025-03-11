import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PlanCreate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
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

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: DashboardService.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries(['plans']);
      navigate({ to: '/dashboard/plans' });
    },
  });

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
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4" onClick={() => navigate({ to: '/dashboard/plans' })}>
          <div>
            <ArrowLeft className="h-4 w-4" />
          </div>
        </Button>
        <h1 className="text-2xl font-bold">Create New Plan</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
          <CardDescription>
            Define the details of your new membership plan.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreatePlan}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={newPlan.name}
                    onChange={handleNewPlanChange}
                    required
                    placeholder="e.g., Monthly Membership"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    value={newPlan.description}
                    onChange={handleNewPlanChange}
                    required
                    placeholder="Brief description of the plan"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPlan.price}
                    onChange={handleNewPlanChange}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 gap-4">
                <h3 className="text-md font-medium">Plan Duration & Limits</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="duration_days">Duration (Days)</Label>
                  <Input
                    id="duration_days"
                    name="duration_days"
                    type="number"
                    min="1"
                    value={newPlan.duration_days}
                    onChange={handleNewPlanChange}
                    placeholder="e.g., 30 for a monthly plan"
                  />
                  <p className="text-sm text-gray-500">How many days this plan is valid for</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration_hours">Hours per Visit</Label>
                  <Input
                    id="duration_hours"
                    name="duration_hours"
                    type="number"
                    min="1"
                    value={newPlan.duration_hours}
                    onChange={handleNewPlanChange}
                    placeholder="Leave empty for unlimited hours"
                  />
                  <p className="text-sm text-gray-500">Maximum hours allowed per visit, or leave empty for unlimited</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_class_plan"
                    name="is_class_plan"
                    checked={newPlan.is_class_plan}
                    onCheckedChange={(checked) => 
                      setNewPlan({...newPlan, is_class_plan: checked})
                    }
                  />
                  <Label htmlFor="is_class_plan">This is a class-based plan</Label>
                </div>
                
                {newPlan.is_class_plan && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="max_classes">Maximum Classes</Label>
                    <Input
                      id="max_classes"
                      name="max_classes"
                      type="number"
                      min="1"
                      value={newPlan.max_classes}
                      onChange={handleNewPlanChange}
                      required={newPlan.is_class_plan}
                      placeholder="e.g., 10 classes"
                    />
                    <p className="text-sm text-gray-500">Maximum number of classes included in this plan</p>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 gap-4">
                <h3 className="text-md font-medium">Add-ons (Optional)</h3>
                <p className="text-sm text-gray-500">Define additional services or products that can be added to this plan</p>
                
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Input
                      placeholder="Add-on name"
                      name="name"
                      value={newAddon.name}
                      onChange={handleAddonChange}
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      placeholder="Price per unit"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newAddon.price}
                      onChange={handleAddonChange}
                    />
                  </div>
                  <div className="col-span-3">
                    <Button 
                      type="button" 
                      onClick={handleAddAddon}
                      disabled={!newAddon.name || !newAddon.price}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
                
                {newPlan.addons.length > 0 && (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Add-on Name</TableHead>
                          <TableHead>Price per Unit</TableHead>
                          <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newPlan.addons.map((addon, index) => (
                          <TableRow key={index}>
                            <TableCell>{addon.name}</TableCell>
                            <TableCell>${parseFloat(addon.price).toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAddon(index)}
                                type="button"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 border-t p-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate({ to: '/dashboard/plans' })}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createPlanMutation.isPending}
            >
              {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      {createPlanMutation.isError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            Error creating plan: {createPlanMutation.error?.message || "Unknown error"}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PlanCreate; 