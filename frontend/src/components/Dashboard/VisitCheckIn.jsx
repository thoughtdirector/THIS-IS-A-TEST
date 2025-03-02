import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { QrCode, Search, UserCheck, Clock, ArrowLeft, ScanLine, Loader2 } from 'lucide-react';
import { DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const VisitCheckIn = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('manual');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const searchInputRef = useRef(null);

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
  
  // Fetch active visits (to show who's already checked in)
  const { 
    data: activeVisits, 
    isLoading: visitsLoading,
    isError: visitsError,
    error: visitsErrorData,
    refetch: refetchVisits
  } = useQuery({
    queryKey: ['activeVisits'],
    queryFn: () => DashboardService.getAllActiveVisits({ limit: 100 }),
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });
  
  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: DashboardService.checkInClient,
    onSuccess: () => {
      queryClient.invalidateQueries(['activeVisits']);
      setSelectedClient(null);
      setSearchTerm('');
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    },
  });

  // QR code check mutation
  const checkQrMutation = useMutation({
    mutationFn: DashboardService.checkQrCode,
    onSuccess: () => {
      queryClient.invalidateQueries(['activeVisits']);
      setQrCodeInput('');
      setIsQrDialogOpen(false);
    },
  });
  
  // Filter clients based on search term
  const filteredClients = clients ? clients.filter(client => 
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  ) : [];
  
  // Get client IDs that already have active visits
  const activeClientIds = activeVisits 
    ? activeVisits.map(visit => visit.client_id)
    : [];
  
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const getTimeElapsed = (checkInTime) => {
    if (!checkInTime) return '';
    const checkIn = new Date(checkInTime);
    const now = new Date();
    const diffMs = now - checkIn;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMins}m`;
  };
  
  const handleClientSelect = (client) => {
    setSelectedClient(client);
  };
  
  const handleCheckIn = () => {
    if (selectedClient) {
      checkInMutation.mutate({ 
        client_id: selectedClient.id,
        check_in: new Date().toISOString()
      });
    }
  };
  
  const handleQrCodeSubmit = (e) => {
    e.preventDefault();
    if (qrCodeInput && qrCodeInput.includes('|')) {
      const [clientId, qrCodeId] = qrCodeInput.split('|');
      checkQrMutation.mutate({
        client_id: clientId,
        qr_code_id: qrCodeId
      });
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedClient(null);
  };
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Check-In System</h1>
        </div>
        <Button 
          variant="outline"
          onClick={() => refetchVisits()}
          disabled={visitsLoading}
          className="flex items-center"
        >
          <Clock className="mr-2 h-4 w-4" />
          Refresh Active Visits
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current active visits */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2 h-5 w-5" />
                Currently Checked-In Clients
              </CardTitle>
              <CardDescription>
                Clients currently using the facility
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visitsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Error loading active visits: {visitsErrorData?.message || "Unknown error"}
                  </AlertDescription>
                </Alert>
              ) : visitsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !activeVisits || activeVisits.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No clients currently checked in.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Check-In Time</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeVisits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell className="font-medium">
                          {visit.client_name || `Client #${visit.client_id}`}
                        </TableCell>
                        <TableCell>{formatTime(visit.check_in)}</TableCell>
                        <TableCell>{getTimeElapsed(visit.check_in)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Check-in interface */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Client Check-In</CardTitle>
              <CardDescription>
                Check-in a client via QR code or manual selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                  <TabsTrigger value="qr">QR Code</TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-4">
                  <div className="relative mt-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search clients by name, email or phone..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="pl-8"
                      ref={searchInputRef}
                    />
                  </div>
                  
                  <div className="border rounded-md h-64 overflow-y-auto">
                    {clientsError ? (
                      <Alert variant="destructive" className="m-2">
                        <AlertDescription>
                          Error loading clients: {clientsErrorData?.message || "Unknown error"}
                        </AlertDescription>
                      </Alert>
                    ) : clientsLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : filteredClients.length === 0 ? (
                      <div className="text-center p-4 text-gray-500">
                        No clients found. Try a different search term.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredClients.map((client) => {
                          const isActive = selectedClient?.id === client.id;
                          const isCheckedIn = activeClientIds.includes(client.id);
                          
                          return (
                            <div 
                              key={client.id}
                              className={`p-3 cursor-pointer flex justify-between items-center ${
                                isActive ? 'bg-primary/10' : 'hover:bg-gray-50'
                              } ${isCheckedIn ? 'opacity-50' : ''}`}
                              onClick={() => !isCheckedIn && handleClientSelect(client)}
                            >
                              <div>
                                <div className="font-medium">{client.full_name}</div>
                                <div className="text-xs text-gray-500">{client.email}</div>
                              </div>
                              {isCheckedIn ? (
                                <Badge variant="outline">Already Checked In</Badge>
                              ) : (
                                <Badge variant={isActive ? "default" : "outline"}>
                                  {isActive ? "Selected" : "Select"}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="qr">
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <QrCode className="h-16 w-16 text-gray-400" />
                    <p className="text-center text-gray-500 max-w-xs">
                      Scan a client's QR code to quickly check them in or out
                    </p>
                    <Button 
                      onClick={() => setIsQrDialogOpen(true)}
                      className="mt-4"
                    >
                      <ScanLine className="mr-2 h-4 w-4" />
                      Scan QR Code
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            {activeTab === 'manual' && (
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleCheckIn}
                  disabled={!selectedClient || checkInMutation.isPending || activeClientIds.includes(selectedClient?.id)}
                >
                  {checkInMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking In...
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Check In Client
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
      
      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Enter the QR code data or use a scanner connected to your device.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQrCodeSubmit}>
            <div className="py-4">
              <Input
                placeholder="Enter QR code data (format: clientId|qrCodeId)"
                value={qrCodeInput}
                onChange={(e) => setQrCodeInput(e.target.value)}
                className="mb-4"
                autoFocus
              />
              <Alert>
                <AlertDescription>
                  QR codes should contain the client ID and QR code ID separated by a pipe character (|).
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsQrDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!qrCodeInput.includes('|') || checkQrMutation.isPending}
              >
                {checkQrMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisitCheckIn;