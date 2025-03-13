import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ClientService } from '@/client/services';
import { Search, Calendar, Clock, CreditCard, Users, Package, Check, ArrowRight, Tag, QrCode, UserPlus } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ClientPlans = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  
  // Fetch available plans
  const { data: plans, isLoading, isError, error } = useQuery({
    queryKey: ['clientPlans', selectedTag],
    queryFn: () => ClientService.getAvailablePlans({ 
      active_only: true,
      tag: selectedTag || undefined
    }),
  });
  
  // Fetch client's active plan instances
  const { data: activePlans, isLoading: activePlansLoading } = useQuery({
    queryKey: ['clientActivePlans'],
    queryFn: () => ClientService.getClientPlanInstances({ active_only: true }),
  });
  
  // Filter plans based on search term
  const filteredPlans = plans?.filter(plan => 
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Extract all unique tags from all plans
  const allTags = plans?.reduce((tags, plan) => {
    if (plan.tags && Array.isArray(plan.tags)) {
      plan.tags.forEach(tag => {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }
    return tags;
  }, []) || [];
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleTagChange = (tag) => {
    // If 'all' is selected, set to null for consistency
    setSelectedTag(tag === 'all' ? null : tag);
  };
  
  // Demo data for when real data is loading
  const demoPlans = [
    {
      id: "123e4567-e89b-12d3-a456-426614174001",
      name: "Monthly Unlimited",
      description: "Unlimited access for one month",
      price: 99.99,
      duration_days: 30,
      entries: null,
      is_active: true,
      tags: ["subscription", "unlimited"]
    },
    {
      id: "123e4567-e89b-12d3-a456-426614174002",
      name: "Family Package",
      description: "Access for up to 4 family members",
      price: 199.99,
      duration_days: 30,
      entries: null,
      is_active: true,
      tags: ["family", "subscription"]
    },
    {
      id: "123e4567-e89b-12d3-a456-426614174003",
      name: "10-Visit Pass",
      description: "10 visits, valid for 60 days",
      price: 79.99,
      duration_days: 60,
      entries: 10,
      is_active: true,
      tags: ["pass", "limited"]
    }
  ];

  // Use demo data if the real data is loading
  const displayPlans = isLoading ? demoPlans : plans || [];
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Available Plans</h1>
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Available Plans</h1>
        <Alert variant="destructive">
          <AlertDescription>
            {error?.message || "Failed to load plans"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Available Plans</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="mb-4 sm:mb-0 sm:mr-4">
            <Link to="/dashboard/client/register-child">
              <UserPlus className="mr-2 h-4 w-4" />
              Register Family Member
            </Link>
          </Button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search plans..."
              className="pl-8"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <Select value={selectedTag || 'all'} onValueChange={handleTagChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Active Plans Section */}
      {!activePlansLoading && activePlans?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Active Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePlans.map(planInstance => (
              <Card key={planInstance.id} className="overflow-hidden">
                <CardHeader className="bg-primary/5">
                  <Badge className="w-fit mb-2" variant={planInstance.is_fully_paid ? "success" : "secondary"}>
                    {planInstance.is_fully_paid ? 'Paid' : 'Payment Pending'}
                  </Badge>
                  <CardTitle>{planInstance.plan.name}</CardTitle>
                  <CardDescription>
                    Valid until: {new Date(planInstance.end_date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    {planInstance.remaining_entries && (
                      <div className="flex items-center text-sm">
                        <CreditCard className="mr-2 h-4 w-4 text-gray-500" />
                        <span>{planInstance.remaining_entries} entries remaining</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm">
                      <Users className="mr-2 h-4 w-4 text-gray-500" />
                      <span>Group: {planInstance.client_group.name}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Button asChild size="sm">
                    <Link to={`/dashboard/client/plan-instances/${planInstance.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/dashboard/client/plan-qr-generator/${planInstance.id}`}>
                      <QrCode className="mr-2 h-4 w-4" />
                      Generate QR
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Available Plans Section */}
      <h2 className="text-xl font-semibold mb-4">All Available Plans</h2>
      {filteredPlans.length === 0 ? (
        <Alert>
          <AlertDescription>
            No plans found matching your search criteria.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map(plan => (
            <Card key={plan.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                {plan.tags && plan.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {plan.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-4">
                  {formatCurrency(plan.price)}
                </div>
                
                <div className="space-y-2">
                  {plan.duration_days && (
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                      <span>{plan.duration_days} days duration</span>
                    </div>
                  )}
                  
                  {plan.duration_hours && (
                    <div className="flex items-center text-sm">
                      <Clock className="mr-2 h-4 w-4 text-gray-500" />
                      <span>{plan.duration_hours} hours per visit</span>
                    </div>
                  )}
                  
                  {plan.entries && (
                    <div className="flex items-center text-sm">
                      <CreditCard className="mr-2 h-4 w-4 text-gray-500" />
                      <span>{plan.entries} entries included</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button asChild size="sm">
                  <Link to={`/dashboard/client/plans/${plan.id}/purchase`}>
                    Purchase
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientPlans; 