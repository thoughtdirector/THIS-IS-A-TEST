import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ProjectService } from '../../client/services';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useSearch, useRouterState, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';

const PER_PAGE = 6;

const Dashboard = () => {
  const router = useRouterState();
  const navigate = useNavigate();
  const { page = 1 } = useSearch();

  const { data: projects, isLoading, isError } = useQuery({
    queryKey: ['projects', page],
    queryFn: () => ProjectService.getProjects({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    placeholderData: (prevData) => prevData,
  });

  const createProjectMutation = useMutation({
    mutationFn: ProjectService.createProjectChat,
    onSuccess: (data) => {
      navigate({ to: '/dashboard/chat/', search: { chatId: data.id } });
    },
  });
  
  const setPage = (newPage) => {
    router.push(`?page=${newPage}`);
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
    </div>
  );
  
  if (isError) return (
    <div className="text-center text-red-500 mt-8">
      Error loading projects. Please try again later.
    </div>
  );
  console.log(projects)
  const hasNextPage = projects?.length === PER_PAGE;
  const hasPreviousPage = page > 1;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Your Projects</h1>
        <Button onClick={() => createProjectMutation.mutate()} disabled={createProjectMutation.isLoading}>
          {createProjectMutation.isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          New Project
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((project) => (
          <Card key={project.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">{project.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-gray-600">{project.description}</p>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-sm text-gray-500">Last updated: {new Date(project.updated_at).toLocaleDateString()}</span>
              <Link to="/dashboard/project/" search={{ projectId: project.id }}>
                <Button variant="outline" size="sm">Open</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-center mt-8 space-x-2">
        <Button
          onClick={() => setPage(page - 1)}
          disabled={!hasPreviousPage}
          variant="outline"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={() => setPage(page + 1)}
          disabled={!hasNextPage}
          variant="outline"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;