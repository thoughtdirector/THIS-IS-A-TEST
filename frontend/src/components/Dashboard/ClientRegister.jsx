import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save, UserPlus, Users } from 'lucide-react';
import { ClientService, DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

const ClientRegister = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('individual');
  const [client, setClient] = useState({
    full_name: '',
    email: '',
    phone: '',
    is_active: true,
    is_child: false,
    guardian_id: null,
    group_id: null
  });
  const [childClient, setChildClient] = useState({
    full_name: '',
    email: '',
    phone: '',
    is_active: true,
    is_child: true
  });
  
  // Fetch client groups for the dropdown
  const { 
    data: clientGroups, 
    isLoading: groupsLoading,
    isError: groupsError
  } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => DashboardService.getClientGroups({ 
      limit: 100 
    }),
  });
  
  // Fetch clients for guardian selection
  const { 
    data: clients, 
    isLoading: clientsLoading,
    isError: clientsError
  } = useQuery({
    queryKey: ['clients'],
    queryFn: () => DashboardService.getClients({ 
      limit: 100,
      active_only: true 
    }),
  });
  
  // Register client mutation
  const registerClientMutation = useMutation({
    mutationFn: ClientService.registerClient,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['clients']);
      navigate({ to: '/clients' });
    },
  });
  
  // Register child client mutation
  const registerChildMutation = useMutation({
    mutationFn: ClientService.registerChildClient,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['clients']);
      navigate({ to: '/clients' });
    },
  });
  
  const handleClientChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClient({
      ...client,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  const handleChildClientChange = (e) => {
    const { name, value, type, checked } = e.target;
    setChildClient({
      ...childClient,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  const handleSelectChange = (name, value) => {
    setClient({
      ...client,
      [name]: value,
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'individual') {
      registerClientMutation.mutate(client);
    } else if (activeTab === 'child') {
      registerChildMutation.mutate(childClient);
    }
  };
  
  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Register New Client</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual" className="flex items-center">
            <UserPlus className="mr-2 h-4 w-4" />
            Individual Client
          </TabsTrigger>
          <TabsTrigger value="child" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Child/Dependent
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="individual">
          <Card>
            <CardHeader>
              <CardTitle>Register Individual Client</CardTitle>
              <CardDescription>
                Create a new client account for an individual
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={client.full_name}
                      onChange={handleClientChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={client.email}
                      onChange={handleClientChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={client.phone}
                      onChange={handleClientChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Client Group (Optional)</Label>
                    <Select
                      value={client.group_id}
                      onValueChange={(value) => handleSelectChange('group_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>None</SelectItem>
                        {clientGroups && clientGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {groupsLoading && <p className="text-sm text-gray-500">Loading groups...</p>}
                    {groupsError && <p className="text-sm text-red-500">Error loading groups</p>}
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="is_active"
                      name="is_active"
                      checked={client.is_active}
                      onCheckedChange={(checked) => 
                        setClient({...client, is_active: checked})
                      }
                    />
                    <Label htmlFor="is_active">Account is active</Label>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: '/clients' })}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={registerClientMutation.isPending}
                  className="flex items-center"
                >
                  {registerClientMutation.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Register Client
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="child">
          <Card>
            <CardHeader>
              <CardTitle>Register Child/Dependent</CardTitle>
              <CardDescription>
                Register a child or dependent under a guardian's account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="guardian_id">Guardian/Parent</Label>
                  <Select
                    value={childClient.guardian_id}
                    onValueChange={(value) => 
                      setChildClient({...childClient, guardian_id: value})
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a guardian" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients && clients
                        .filter(c => !c.is_child)
                        .map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {clientsLoading && <p className="text-sm text-gray-500">Loading clients...</p>}
                  {clientsError && <p className="text-sm text-red-500">Error loading clients</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="child_full_name">Child's Full Name</Label>
                  <Input
                    id="child_full_name"
                    name="full_name"
                    value={childClient.full_name}
                    onChange={handleChildClientChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="child_email">Email Address (Optional)</Label>
                  <Input
                    id="child_email"
                    name="email"
                    type="email"
                    value={childClient.email}
                    onChange={handleChildClientChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="child_phone">Phone Number (Optional)</Label>
                  <Input
                    id="child_phone"
                    name="phone"
                    value={childClient.phone}
                    onChange={handleChildClientChange}
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="child_is_active"
                    name="is_active"
                    checked={childClient.is_active}
                    onCheckedChange={(checked) => 
                      setChildClient({...childClient, is_active: checked})
                    }
                  />
                  <Label htmlFor="child_is_active">Account is active</Label>
                </div>
                
                {registerChildMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {registerChildMutation.error?.message || "Error registering child client"}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: '/clients' })}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={registerChildMutation.isPending || !childClient.guardian_id}
                  className="flex items-center"
                >
                  {registerChildMutation.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Register Child
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

export default ClientRegister;