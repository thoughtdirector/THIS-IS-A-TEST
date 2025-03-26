import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChatService } from '../../client/services';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useSearch, useRouterState, useNavigate } from '@tanstack/react-router'

const PER_PAGE = 10;

const ChatList = () => {
  const router = useRouterState();
  const navigate = useNavigate();
  const { page, projectId } = useSearch();

  const { data: chats, isLoading, isError } = useQuery({
    queryKey: ['chats', page],
    queryFn: () => ChatService.getChats({ projectId: projectId, skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    placeholderData: (prevData) => prevData,
  });

  const createChatMutation = useMutation({
    mutationFn: () => ChatService.createChat({projectId:projectId}),
    onSuccess: (data) => {
      navigate({
        to: '/dashboard/chat/',
        search: { chatId: data.id, projectId: projectId },
      });
    },
  });

  const handleStartChat = () => {
    createChatMutation.mutate();
  };

  const setPage = (newPage) => {
    router.push(`?page=${newPage}`);
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading chats</div>;

  const hasNextPage = chats?.length === PER_PAGE;
  const hasPreviousPage = page > 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Project Chats</h1>
      <div className="mb-6">
        <Button onClick={handleStartChat} disabled={createChatMutation.isLoading}>
          {createChatMutation.isLoading ? 'Creating...' : 'Start Chat'}
        </Button>
      </div>
      <div className="space-y-6">
        {chats?.map((chat) => (
          <Link key={chat.id} to={`/dashboard/chat/`} search={(prev) => ({ chatId: chat.id, projectId: projectId })} className="block">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="flex items-center p-6">
                <div className="flex-1 pr-6">
                  <h2 className="text-2xl font-semibold mb-2">{chat.name}</h2>
                  <p className="text-base text-gray-600">
                    
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-sm text-gray-500 mb-2">
                    Created: {new Date(chat.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Messages: {chat.messages.length}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    View Chat
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

export default ChatList;
