import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save, UserPlus, Users } from 'lucide-react';
import { ClientService, DashboardService } from '../../client/services';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
import ChildRegister from '@/components/Client/ChildRegister';

const ClientRegister = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('individual');
  const [client, setClient] = useState({
    username: '',
    password: '',
    confirm_password: '',
    client_name: '',
    email: '',
    address: '',
    phone: '',
    client_type: '',
    document_id: '',
    client_group_id: null,
    active: false,
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
      navigate({ to: '/dashboard/clients' });
    },
  });
  
  // Register child client mutation
  const registerChildMutation = useMutation({
    mutationFn: ClientService.registerChildClient,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['clients']);
      navigate({ to: '/dashboard/clients' });
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
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Register New Client</h1>
        <p className="text-sm text-muted-foreground">
          Fill in the form below to register a new client
        </p>
      </div>

      <Tabs defaultValue="client">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="client">Individual Client</TabsTrigger>
          <TabsTrigger value="child">Child/Dependent</TabsTrigger>
        </TabsList>
        
        <TabsContent value="client">
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
                  onClick={() => navigate({ to: '/dashboard/clients' })}
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
          <ChildRegister />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientRegister;