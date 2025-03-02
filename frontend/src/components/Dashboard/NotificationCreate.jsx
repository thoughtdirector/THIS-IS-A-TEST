import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Bell, Send, Search, Users, Share2 } from 'lucide-react';
import { DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const NotificationCreate = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [notificationType, setNotificationType] = useState('single');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedClientGroup, setSelectedClientGroup] = useState(null);
  const [isBroadcast, setIsBroadcast] = useState(false);
  
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
  
  // Fetch client groups
  const { 
    data: clientGroups, 
    isLoading: groupsLoading,
    isError: groupsError,
    error: groupsErrorData
  } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => DashboardService.getClientGroups({ 
      limit: 100
    }),
    enabled: notificationType === 'group'
  });
  
  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: DashboardService.createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      navigate({ to: '/' });
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
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (message.trim() === '') {
      return;
    }
    
    let notificationData = {
      message: message,
      is_broadcast: isBroadcast
    };
    
    if (!isBroadcast) {
      if (notificationType === 'single' && selectedClient) {
        notificationData.target_client_id = selectedClient.id;
      } else if (notificationType === 'group' && selectedClientGroup) {
        notificationData.target_group_id = selectedClientGroup;
      } else {
        // Error - no recipient selected
        return;
      }
    }
    
    createNotificationMutation.mutate(notificationData);
  };
  
  // Calculate potential recipients count
  const getRecipientsCount = () => {
    if (isBroadcast) {
      return clients ? clients.length : 0;
    } else if (notificationType === 'single') {
      return selectedClient ? 1 : 0;
    } else if (notificationType === 'group' && selectedClientGroup) {
      const group = clientGroups?.find(g => g.id === selectedClientGroup);
      return group ? group.clients.length : 0;
    }
    return 0;
  };
  
  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Send Notification</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Create New Notification</CardTitle>
          <CardDescription>
            Send messages to individual clients or groups
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Broadcast Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="broadcast-mode"
                checked={isBroadcast}
                onCheckedChange={setIsBroadcast}
              />
              <Label htmlFor="broadcast-mode" className="font-medium">
                Broadcast to All Clients
              </Label>
              {isBroadcast && (
                <Badge variant="secondary" className="ml-2">
                  {clients ? clients.length : 0} Recipients
                </Badge>
              )}
            </div>
            
            {/* Recipient Selection (only if not broadcast) */}
            {!isBroadcast && (
              <>
                <Tabs value={notificationType} onValueChange={setNotificationType}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single" className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      Individual Client
                    </TabsTrigger>
                    <TabsTrigger value="group" className="flex items-center">
                      <Share2 className="mr-2 h-4 w-4" />
                      Client Group
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="single">
                    <div className="space-y-3 mt-3">
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
                  </TabsContent>
                  
                  <TabsContent value="group">
                    <div className="space-y-3 mt-3">
                      <Label>Select Client Group</Label>
                      <Select
                        value={selectedClientGroup || ''}
                        onValueChange={setSelectedClientGroup}
                        disabled={groupsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client group" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientGroups && clientGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name} ({group.clients.length} clients)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {groupsLoading && <p className="text-sm text-gray-500">Loading client groups...</p>}
                      {groupsError && <p className="text-sm text-red-500">Error loading client groups</p>}
                      
                      {selectedClientGroup && clientGroups && (
                        <div className="bg-blue-50 p-3 rounded-md mt-2">
                          <div className="flex justify-between items-center">
                            <p className="font-medium">
                              {clientGroups.find(g => g.id === selectedClientGroup)?.name}
                            </p>
                            <Badge>
                              {clientGroups.find(g => g.id === selectedClientGroup)?.clients.length} recipients
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                
                <Separator />
              </>
            )}
            
            {/* Message Content */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="message">Message</Label>
                <span className="text-xs text-gray-500">
                  {message.length} / 500 characters
                </span>
              </div>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your notification message here..."
                required
                maxLength={500}
                className="min-h-[120px]"
              />
            </div>
            
            {/* Recipients summary */}
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-primary mr-2" />
                <span className="font-medium">Notification Summary</span>
              </div>
              <div className="mt-2 text-sm">
                <p>Recipients: <strong>{getRecipientsCount()}</strong></p>
                <p>Type: <strong>{isBroadcast ? 'Broadcast' : notificationType === 'single' ? 'Individual' : 'Group'}</strong></p>
                <p>Message Length: <strong>{message.length}</strong> characters</p>
              </div>
            </div>
            
            {/* Error message */}
            {createNotificationMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {createNotificationMutation.error?.message || "Error sending notification"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/' })}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={
                createNotificationMutation.isPending || 
                message.trim() === '' || 
                (!isBroadcast && notificationType === 'single' && !selectedClient) ||
                (!isBroadcast && notificationType === 'group' && !selectedClientGroup)
              }
              className="flex items-center"
            >
              {createNotificationMutation.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Notification
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default NotificationCreate;