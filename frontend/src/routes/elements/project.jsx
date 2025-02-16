import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useSearch, useRouterState } from '@tanstack/react-router'
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectService } from '../../client/services';
import ChatList from '../../components/Chat/chatList';
import TaskList from './taskList';


const Project = () => {
    const { projectId } = useSearch()
   
    const { data: project, isLoading, isError } = useQuery({
        queryKey: ['projects', projectId],
        queryFn: () => ProjectService.getProject({projectId:projectId}),
        placeholderData: (prevData) => prevData,
    });

    if (isLoading) return <div>Loading...</div>;
    if (isError) return <div>Error loading projects</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/dashboard/projectlist" className="mb-4 block">
        <Button variant="outline" className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go back to projects
        </Button>
      </Link>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{project.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-gray-700">{project.description}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="chats" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="chats">
          <ChatList projectId={project.id} />
        </TabsContent>
        <TabsContent value="tasks">
          <TaskList />
        </TabsContent> 
      </Tabs>
    </div>
  );
};

export default Project;