import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { User, ArrowLeft, UserPlus, Search, RefreshCw, Filter, ChevronDown } from 'lucide-react';
import { DashboardService } from '../../client/services';

// Import ShadCN UI components
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTab, setActiveTab] = useState('individuals');
  const [showInactive, setShowInactive] = useState(false);
  
  // Fetch clients data
  const { 
    data: clients, 
    isLoading: clientsLoading,
    isError: clientsError,
    error: clientsErrorData,
    refetch: refetchClients
  } = useQuery({
    queryKey: ['clients', currentPage, pageSize, showInactive, activeTab],
    queryFn: () => DashboardService.getClients({ 
      skip: currentPage * pageSize, 
      limit: pageSize 
    }),
  });
  
  // Fetch client groups data
  const { 
    data: clientGroups, 
    isLoading: groupsLoading,
    isError: groupsError,
    error: groupsErrorData,
    refetch: refetchGroups
  } = useQuery({
    queryKey: ['clientGroups', currentPage, pageSize],
    queryFn: () => DashboardService.getClientGroups({ 
      skip: currentPage * pageSize, 
      limit: pageSize 
    }),
    enabled: activeTab === 'groups'
  });
  
  // Filter clients based on search term
  const filteredClients = clients ? clients.filter(client => 
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  ) : [];
  
  // Filter client groups based on search term
  const filteredGroups = clientGroups ? clientGroups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(0); // Reset to first page on search
  };
  
  const handlePageChange = (newPage) => {
    if (newPage >= 0) {
      setCurrentPage(newPage);
    }
  };
  
  const handleRefresh = () => {
    if (activeTab === 'individuals') {
      refetchClients();
    } else {
      refetchGroups();
    }
  };
  
  const renderPagination = () => {
    const totalItems = activeTab === 'individuals' ? (clients?.length || 0) : (clientGroups?.length || 0);
    const hasMore = totalItems >= pageSize;
    
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          Showing {Math.min(totalItems, 1 + (currentPage * pageSize))} to {Math.min(totalItems, (currentPage + 1) * pageSize)} of {totalItems}+ entries
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link to="/dashboard/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Client Managementt</h1>
      </div>
        <Button asChild>
          <Link to="/dashboard/clients/register" className="flex items-center">
            <UserPlus className="mr-2 h-4 w-4" />
            Register New Client
          </Link>
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="individuals">Individual Clients</TabsTrigger>
          <TabsTrigger value="groups">Client Groups</TabsTrigger>
        </TabsList>
        
        <TabsContent value="individuals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>All Clients</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="pl-8"
                  />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuCheckboxItem
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                    >
                      Show Inactive Clients
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={pageSize === 10}
                      onCheckedChange={() => setPageSize(10)}
                    >
                      Show 10 per page
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={pageSize === 25}
                      onCheckedChange={() => setPageSize(25)}
                    >
                      Show 25 per page
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={pageSize === 50}
                      onCheckedChange={() => setPageSize(50)}
                    >
                      Show 50 per page
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleRefresh}
                  disabled={clientsLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {clientsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Error loading clients: {clientsErrorData?.message || "Unknown error"}
                  </AlertDescription>
                </Alert>
              ) : clientsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No clients found. Try adjusting your search or filters.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.full_name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.phone}</TableCell>
                          <TableCell>
                            <Badge variant={client.is_active ? "success" : "destructive"}>
                              {client.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {client.is_child ? "Child" : "Adult"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/dashboard/clients/${client.id}`}>
                                  View
                                </Link>
                              </Button>
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/dashboard/clients/${client.id}/edit`}>
                                  Edit
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {renderPagination()}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="groups">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Client Groups</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="pl-8"
                  />
                </div>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleRefresh}
                  disabled={groupsLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                
                <Button asChild>
                  <Link to="/dashboard/client-groups/create" className="flex items-center">
                    <UserPlus className="mr-2 h-4 w-4" />
                    New Group
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {groupsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Error loading client groups: {groupsErrorData?.message || "Unknown error"}
                  </AlertDescription>
                </Alert>
              ) : groupsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No client groups found. Try adjusting your search or create a new group.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Admins</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>{new Date(group.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{group.clients?.length || 0} members</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{group.admins?.length || 0} admins</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/dashboard/client-groups/${group.id}`}>
                                  View
                                </Link>
                              </Button>
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/dashboard/client-groups/${group.id}/edit`}>
                                  Edit
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {renderPagination()}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Clients;