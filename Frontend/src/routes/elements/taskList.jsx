import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TaskService } from '../../client/services';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useSearch, useRouterState, useNavigate } from '@tanstack/react-router';

const PER_PAGE = 10;

const TaskList = () => {
  const router = useRouterState();
  const navigate = useNavigate();
  const { page = 1, projectId } = useSearch();

  const { data: tasks, isLoading, isError } = useQuery({
    queryKey: ['tasks', page, projectId],
    queryFn: () => TaskService.getTasks({ 
      skip: (page - 1) * PER_PAGE, 
      limit: PER_PAGE,
      projectId: projectId
    }),
    placeholderData: (prevData) => prevData,
  });

  const createTaskMutation = useMutation({
    mutationFn: TaskService.createTaskChat,
    onSuccess: (data) => {
      navigate({ to: '/dashboard/task/', search: { task_id: data.id } });
    },
  });
  
  const setPage = (newPage) => {
    router.push({ search: (prev) => ({ ...prev, page: newPage }) });
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading tasks</div>;

  const hasNextPage = tasks?.length === PER_PAGE;
  const hasPreviousPage = page > 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Tasks</h1>
        <Button 
          onClick={() => createTaskMutation.mutate()}
          disabled={createTaskMutation.isPending}
        >
          {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
        </Button>
      </div>
      <div className="space-y-6">
        {tasks?.map((task) => (
          <Link key={task.id} to={`/dashboard/task/`} search={(prev) => ({ taskId: task.id })} className="block">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="flex items-center p-6">
                <div className="flex-1 pr-6">
                  <h2 className="text-2xl font-semibold mb-2">{task.name}</h2>
                  <p className="text-gray-600 mb-2">{task.description}</p>
                  <div className="flex space-x-2 mb-2">
                    <Badge variant={task.status === 'Completed' ? 'success' : 'default'}>
                      {task.status}
                    </Badge>
                    <Badge variant="secondary">Priority: {task.priority}</Badge>
                    <Badge variant="outline">{task.difficulty}</Badge>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-sm text-gray-500 mb-2">
                    Created: {new Date(task.created_at).toLocaleDateString()}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    View Task
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

export default TaskList;