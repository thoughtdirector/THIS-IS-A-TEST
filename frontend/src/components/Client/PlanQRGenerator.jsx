import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ClientService } from '@/client/services';
import { QrCode, ArrowLeft, UserCheck, Check, Info } from 'lucide-react';
import QRCode from 'react-qr-code';

// Import UI components
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const PlanQRGenerator = () => {
  const navigate = useNavigate();
  const { planInstanceId } = useParams();
  const [selectedPlanInstance, setSelectedPlanInstance] = useState(planInstanceId || '');
  const [selectedClient, setSelectedClient] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [error, setError] = useState('');

  // Fetch the specific plan instance details
  const { 
    data: planInstanceDetails,
    isLoading: planDetailsLoading,
    isError: planDetailsError
  } = useQuery({
    queryKey: ['planInstance', planInstanceId],
    queryFn: () => ClientService.getPlanInstance({ instanceId: planInstanceId }),
    enabled: !!planInstanceId
  });

  // Fetch client groups to select members from
  const {
    data: clientGroups,
    isLoading: clientGroupsLoading,
    isError: clientGroupsError
  } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => ClientService.getClientGroups(),
  });

  // Find all clients from the selected plan instance's client group
  const clientsInSelectedGroup = clientGroups?.find(
    group => planInstanceDetails && group.id === planInstanceDetails.client_group_id
  )?.clients || [];

  // Generate QR code when button is clicked
  const handleGenerateQR = () => {
    if (!selectedClient || !termsAccepted) {
      setError('Please select a person and accept the terms and conditions.');
      return;
    }

    // Create QR code data in the format needed for check-in
    // Format: clientId|planInstanceId
    const qrData = `${selectedClient}|${planInstanceId}`;
    
    // In a real implementation, you might want to encrypt this or use a more secure format
    setQrCodeData(qrData);
    setQrDialogOpen(true);
    setError('');
  };

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link to="/dashboard/client/plans">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Generate Check-in QR Code</h1>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Check-in for Your Plan</CardTitle>
          <CardDescription>
            Generate a QR code that can be used for check-in with this plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {planDetailsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : planDetailsError ? (
            <Alert variant="destructive">
              <AlertDescription>Failed to load plan details</AlertDescription>
            </Alert>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
              <h3 className="font-medium mb-2">Plan Details</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium">Plan:</span> {planInstanceDetails?.plan?.name}</p>
                <p><span className="font-medium">Valid until:</span> {new Date(planInstanceDetails?.end_date).toLocaleDateString()}</p>
                {planInstanceDetails?.remaining_entries && (
                  <p><span className="font-medium">Entries left:</span> {planInstanceDetails.remaining_entries}</p>
                )}
                <p><span className="font-medium">Group:</span> {planInstanceDetails?.client_group?.name}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="client">Select Person</Label>
            {clientGroupsLoading || clientsInSelectedGroup.length === 0 ? (
              <Skeleton className="h-10 w-full" />
            ) : clientGroupsError ? (
              <Alert variant="destructive">
                <AlertDescription>Failed to load clients</AlertDescription>
              </Alert>
            ) : (
              <Select 
                value={selectedClient} 
                onValueChange={setSelectedClient}
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {clientsInSelectedGroup.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="terms" 
              checked={termsAccepted} 
              onCheckedChange={setTermsAccepted} 
            />
            <Label 
              htmlFor="terms" 
              className="text-sm text-muted-foreground font-normal"
            >
              I accept the terms and conditions for using this plan. The QR code 
              generated can only be used by the selected person and is bound 
              to the selected plan.
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleGenerateQR} 
            disabled={!selectedClient || !termsAccepted || planDetailsLoading}
            className="w-full"
          >
            Generate QR Code
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your QR Code</DialogTitle>
            <DialogDescription>
              Show this QR code at the entrance for check-in
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center p-4">
            {qrCodeData && (
              <>
                {/* Real QR code */}
                <div className="bg-white p-6 rounded-lg mb-4">
                  <QRCode 
                    value={qrCodeData}
                    size={180}
                    level="M"
                    className="mx-auto"
                  />
                  <div className="mt-4 text-xs text-center text-muted-foreground break-all">
                    {qrCodeData}
                  </div>
                </div>
                
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Save this QR code or take a screenshot. It can be used for quick check-in.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setQrDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                // In a real app, you would implement a way to 
                // download or share the QR code
                alert("QR code saved!");
              }}
            >
              Download QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanQRGenerator; 