import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ProjectService } from '../../client/services';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useSearch, useRouterState, useNavigate } from '@tanstack/react-router'

const PER_PAGE = 10;

const ProjectList = () => {
  const router = useRouterState();
  const navigate = useNavigate();
  const { page } = useSearch();

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

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading projects</div>;

  const hasNextPage = projects?.length === PER_PAGE;
  const hasPreviousPage = page > 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Projects</h1>
        <Button 
          onClick={() => createProjectMutation.mutate()}
          disabled={createProjectMutation.isPending}
        >
          {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
        </Button>
      </div>
      <div className="space-y-6">
        {projects?.map((project) => (
          <Link key={project.id} to={`/dashboard/project/`} search={(prev) => ({ projectId:project.id })} className="block">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="flex items-center p-6">
                <div className="flex-1 pr-6">
                  <h2 className="text-2xl font-semibold mb-2">{project.name}</h2>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-sm text-gray-500 mb-2">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    View Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
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

export default ProjectList;