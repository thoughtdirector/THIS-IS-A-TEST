import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { OrganizationService } from '../../client/services';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useSearch, useRouterState, useNavigate } from '@tanstack/react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

const PER_PAGE = 10;

const OrganizationList = () => {
  const router = useRouterState();
  const navigate = useNavigate();
  const { page } = useSearch();
  const [activatingOrg, setActivatingOrg] = useState(null);

  const { data: organizations, isLoading, isError, refetch } = useQuery({
    queryKey: ['organizations', page],
    queryFn: () => OrganizationService.getOrganizations({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    placeholderData: (prevData) => prevData,
  });

  const createOrganizationMutation = useMutation({
    mutationFn: OrganizationService.createOrganizationChat,
    onSuccess: (data) => {
      navigate({ to: '/dashboard/chat/', search: { chatId: data.id } });
      toast({
        title: "Organization Created",
        description: "Your new organization has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const activateOrganizationMutation = useMutation({
    mutationFn: (orgId) => OrganizationService.activateOrganization(orgId),
    onSuccess: (data) => {
      localStorage.setItem("organization_id", data.id);
      toast({
        title: "Organization Activated",
        description: `${data.name} has been activated successfully.`,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to activate organization. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setActivatingOrg(null);
    },
  });
  
  const setPage = (newPage) => {
    router.push(`?page=${newPage}`);
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (isError) return <div className="text-center text-red-500 mt-8">Error loading organizations</div>;

  const hasNextPage = organizations?.length === PER_PAGE;
  const hasPreviousPage = page > 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Organizations</h1>
        <Button 
          onClick={() => createOrganizationMutation.mutate()}
          disabled={createOrganizationMutation.isPending}
        >
          {createOrganizationMutation.isPending ? 'Creating...' : 'Create Organization'}
        </Button>
      </div>
      <div className="space-y-6">
        {organizations?.map((organization) => (
          <Card key={organization.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="flex items-center p-6">
              <div className="flex-1 pr-6">
                <h2 className="text-2xl font-semibold mb-2">{organization.name}</h2>
                <p className="text-sm text-gray-500">
                  Created: {new Date(organization.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Link to={`/dashboard/organization/`} search={(prev) => ({ organizationId:organization.id })}>
                  <Button variant="outline" size="sm">
                    View Organization
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" size="sm">
                      Activate Organization
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Activate Organization</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to activate {organization.name}? This will set it as your current active organization.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => activateOrganizationMutation.mutate(organization.id)}>
                        Activate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-center mt-12 space-x-4">
        <Button 
          onClick={() => setPage(page - 1)} 
          disabled={!hasPreviousPage}
          variant="outline"
        >
          Previous
        </Button>
        <span className="flex items-center text-lg">Page {page}</span>
        <Button 
          onClick={() => setPage(page + 1)} 
          disabled={!hasNextPage}
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default OrganizationList;