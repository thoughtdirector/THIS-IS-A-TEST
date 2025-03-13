import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { ClientService } from '../../client/services';
import useAuth from '../../hooks/useAuth';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ChildRegister = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [childClient, setChildClient] = useState({
    id: null,
    full_name: '',
    email: '',
    phone: '',
    identification: '',
    is_active: true,
    is_child: true
    // No need to set guardian_id here as the backend will handle this
  });
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Register child client mutation
  const registerChildMutation = useMutation({
    mutationFn: ClientService.registerChildClient,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['clientPlans']);
      navigate({ to: '/dashboard/client/plans' });
    },
  });
  
  const handleChildClientChange = (e) => {
    const { name, value, type, checked } = e.target;
    setChildClient({
      ...childClient,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agreedToTerms) {
      return; // Don't submit if user hasn't agreed to terms
    }
    registerChildMutation.mutate(childClient);
  };
  
  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/dashboard/client/plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Register Family Member</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Register Family Member</CardTitle>
          <CardDescription>
            Register a child or dependent under your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="child_full_name">Full Name</Label>
              <Input
                id="child_full_name"
                name="full_name"
                value={childClient.full_name}
                onChange={handleChildClientChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="child_identification">Identification Number</Label>
              <Input
                id="child_identification"
                name="identification"
                value={childClient.identification}
                onChange={handleChildClientChange}
                placeholder="Government ID, passport, or birth certificate number"
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
            
            <div className="flex items-start space-x-2 pt-4 border-t">
              <Checkbox
                id="agreement"
                checked={agreedToTerms}
                onCheckedChange={setAgreedToTerms}
                required
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="agreement" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I agree to the terms and conditions
                </Label>
                <p className="text-sm text-muted-foreground flex items-center">
                  <FileText className="h-3 w-3 mr-1" />
                  By registering this family member, I certify that I have the legal authority to do so
                </p>
              </div>
            </div>
            
            {registerChildMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {registerChildMutation.error?.message || "Error registering family member"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/dashboard/client/plans' })}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={registerChildMutation.isPending || !agreedToTerms}
              className="flex items-center"
            >
              {registerChildMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Register Family Member
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ChildRegister; 