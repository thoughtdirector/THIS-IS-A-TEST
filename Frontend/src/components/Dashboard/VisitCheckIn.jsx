import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { QrCode, Search, UserCheck, Clock, ArrowLeft, ScanLine, Loader2, Clipboard, Camera } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
  const navigate = useNavigate();
  
  // Park Entry Form state
  const [entryData, setEntryData] = useState({
    // Child information
    child_name: '',
    child_age: '',
    
    // Adult information
    adult_name: '',
    identification_number: '',
    relationship: '',
    phone_number: '',
    email: '',
    
    // Date and time
    entry_date: new Date().toISOString().split('T')[0],
    entry_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    
    // Location
    city: '',
    
    // Authorizations
    authorize_entry: 'yes',
    authorize_photos: 'yes',
    authorize_marketing: 'yes',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

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
    const userOffset = new Date().getTimezoneOffset()*60*1000;
    const checkIn = new Date(checkInTime);
    
    const now = new Date();
    const diffMs = now - checkIn;
   
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMins}m`;
  };
  
  const handleClientSelect = (client) => {
    setSelectedClient(client);
    
    // If park entry form is the active tab, pre-fill with client data
    if (activeTab === 'parkEntry') {
      setEntryData(prev => ({
        ...prev,
        adult_name: client.full_name || '',
        email: client.email || '',
        phone_number: client.phone || '',
      }));
    }
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
  
  // Handle form input changes for park entry form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEntryData({
      ...entryData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  // Handle radio button changes for park entry form
  const handleRadioChange = (name, value) => {
    setEntryData({
      ...entryData,
      [name]: value,
    });
  };
  
  // Handle park entry form submission
  const handleParkEntrySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      // In a real implementation, we would call an API endpoint here
      // For now, we'll just simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful submission
      alert('Entry form submitted successfully!');
      
      // Reset form
      setEntryData({
        child_name: '',
        child_age: '',
        adult_name: '',
        identification_number: '',
        relationship: '',
        phone_number: '',
        email: '',
        entry_date: new Date().toISOString().split('T')[0],
        entry_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        city: '',
        authorize_entry: 'yes',
        authorize_photos: 'yes',
        authorize_marketing: 'yes',
      });
      
      // Navigate to client plans
      navigate({ to: '/dashboard/client/plans' });
    } catch (err) {
      setFormError(err.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link to="/dashboard">
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
                Check-in a client via QR code, manual selection, or use the park entry form
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                  <TabsTrigger value="qr">QR Code</TabsTrigger>
                  <TabsTrigger value="parkEntry">
                    <Clipboard className="mr-2 h-4 w-4" />
                    Entry Form
                  </TabsTrigger>
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
                
                {/* Park Entry Form Tab */}
                <TabsContent value="parkEntry">
                  <div className="space-y-4 mt-4 max-h-[500px] overflow-y-auto pr-2">
                    {/* Company logo placeholder */}
                    <div className="flex justify-center mb-4">
                      <div className="w-40 h-20 bg-gray-200 flex items-center justify-center rounded">
                        <Camera className="h-6 w-6 text-gray-400" />
                        <span className="ml-2 text-gray-500">Logo</span>
                      </div>
                    </div>
                    
                    <form onSubmit={handleParkEntrySubmit}>
                      {/* Authorization question */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">
                          Por medio de la presente, el (la) firmante, mayor de edad identificado como aparece al pie de su nombre:
                        </Label>
                        <div className="pl-4">
                          <RadioGroup
                            value={entryData.authorize_entry}
                            onValueChange={(value) => handleRadioChange('authorize_entry', value)}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="authorize-yes" />
                              <Label htmlFor="authorize-yes" className="text-xs">¿Autoriza en calidad de responsable al menor de edad el ingreso al parque?</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="authorize-no" />
                              <Label htmlFor="authorize-no" className="text-xs">No autorizo</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      {/* Child information */}
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="child_name" className="text-xs">Nombre del menor de edad</Label>
                          <Input
                            id="child_name"
                            name="child_name"
                            value={entryData.child_name}
                            onChange={handleInputChange}
                            required
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="child_age" className="text-xs">Edad del niño</Label>
                          <Input
                            id="child_age"
                            name="child_age"
                            type="number"
                            min="0"
                            max="17"
                            value={entryData.child_age}
                            onChange={handleInputChange}
                            required
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      {/* Adult information */}
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="adult_name" className="text-xs">Nombre completo del adulto</Label>
                          <Input
                            id="adult_name"
                            name="adult_name"
                            value={entryData.adult_name}
                            onChange={handleInputChange}
                            required
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="identification_number" className="text-xs">Número de documento de identidad</Label>
                          <Input
                            id="identification_number"
                            name="identification_number"
                            value={entryData.identification_number}
                            onChange={handleInputChange}
                            required
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="relationship" className="text-xs">Parentesco del menor</Label>
                          <Input
                            id="relationship"
                            name="relationship"
                            value={entryData.relationship}
                            onChange={handleInputChange}
                            required
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone_number" className="text-xs">Número de celular</Label>
                          <Input
                            id="phone_number"
                            name="phone_number"
                            value={entryData.phone_number}
                            onChange={handleInputChange}
                            required
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-xs">Correo electrónico</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={entryData.email}
                            onChange={handleInputChange}
                            required
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      {/* Date and Time */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="entry_date" className="text-xs">Fecha de ingreso</Label>
                          <Input
                            id="entry_date"
                            name="entry_date"
                            type="date"
                            value={entryData.entry_date}
                            onChange={handleInputChange}
                            required
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="entry_time" className="text-xs">Hora de ingreso</Label>
                          <Input
                            id="entry_time"
                            name="entry_time"
                            type="time"
                            value={entryData.entry_time}
                            onChange={handleInputChange}
                            required
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="city" className="text-xs">Ciudad de domicilio</Label>
                        <Input
                          id="city"
                          name="city"
                          value={entryData.city}
                          onChange={handleInputChange}
                          required
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <Separator className="my-3" />
                      
                      {/* Important Note */}
                      <Alert variant="warning" className="my-3 bg-yellow-50 border-yellow-200 text-xs py-2">
                        <AlertDescription className="font-bold text-center">
                          NOTA: LA CONTABILIZACIÓN DEL TIEMPO CORRE POR SU CUENTA, NO DAMOS AVISO DEL TIEMPO TRANSCURRIDO.
                        </AlertDescription>
                      </Alert>
                      
                      <Separator className="my-3" />
                      
                      {/* Additional Authorizations */}
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs">¿Autoriza a la casa en el árbol para el uso de fotografías o videos capturados en el parque?</Label>
                          <RadioGroup
                            value={entryData.authorize_photos}
                            onValueChange={(value) => handleRadioChange('authorize_photos', value)}
                            className="flex flex-row space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="photos-yes" />
                              <Label htmlFor="photos-yes" className="text-xs">Si</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="photos-no" />
                              <Label htmlFor="photos-no" className="text-xs">No</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">¿Autoriza al parque el envío de mails y mensajes de texto?</Label>
                          <RadioGroup
                            value={entryData.authorize_marketing}
                            onValueChange={(value) => handleRadioChange('authorize_marketing', value)}
                            className="flex flex-row space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="marketing-yes" />
                              <Label htmlFor="marketing-yes" className="text-xs">Si</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="marketing-no" />
                              <Label htmlFor="marketing-no" className="text-xs">No</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                      
                      {formError && (
                        <Alert variant="destructive" className="mt-3">
                          <AlertDescription>{formError}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="pt-3 text-center">
                        <p className="font-semibold text-sm">BIENVENIDOS Y GRACIAS POR SUS RESPUESTAS</p>
                      </div>
                      
                      <div className="flex justify-end mt-4">
                        <Button 
                          type="submit"
                          disabled={isSubmitting}
                          className="flex items-center"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <Clipboard className="mr-2 h-4 w-4" />
                              Registrar Ingreso
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
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