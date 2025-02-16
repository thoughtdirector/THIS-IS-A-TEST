import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, ArrowLeft, User, Bot, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useSearch, useRouterState, useNavigate } from '@tanstack/react-router';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { ChatService } from '../../client/services';

const LinkButton = ({ path }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      window.open(path, '_blank');
    } else {
      navigate({ to: path });
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      className="mt-2"
    >
      {path.startsWith('http://') || path.startsWith('https://') ? (
        <>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Link
        </>
      ) : (
        <>Go to link</>
      )}
    </Button>
  );
};

const Chatbot = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [formInputs, setFormInputs] = useState({});
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scrollAreaRef = useRef(null);

  const { chatId, projectId } = useSearch();

  const { data: chat, isLoading, isError } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => ChatService.getChat({ chatId: chatId, projectId: projectId }),
    placeholderData: (prevData) => prevData,
  });

  const mutation = useMutation({
    mutationFn: (content) => ChatService.createMessage({ chatId: chatId, content: content, projectId: projectId }),
    onMutate: () => {
      setIsWaitingForResponse(true);
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['chat', chatId], (oldChat) => ({
        ...oldChat,
        messages: [...oldChat.messages, ...newMessage],
      }));
      setInputMessage('');
      setFormInputs({});
      setIsWaitingForResponse(false);
    },
    onError: () => {
      toast({
        title: 'Error sending message',
        description: 'Unable to send the message. Please try again.',
        variant: 'destructive',
      });
      setIsWaitingForResponse(false);
    },
  });

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      mutation.mutate(inputMessage);
    }
  };

  const handleFormSubmit = (inputRequest) => {
    const formData = inputRequest.reduce((acc, input) => {
      acc[input.field] = formInputs[input.field] || '';
      return acc;
    }, {});
    mutation.mutate(formData);
  };

  const handleInputChange = (field, value) => {
    setFormInputs((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (chat?.messages) {
      chat.messages.forEach((message) => {
        if (message.metadata?.type === 'user_input') {
          Object.keys(message.content).forEach((key) => {
            handleInputChange(key, message.content[key]);
          });
        }
      });
    }
  }, [chat?.messages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chat?.messages]);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (isError) return <div className="text-center text-red-500">Error loading chat</div>;

  const renderMessage = (message) => {
    if (message.metadata?.type === 'input_request') {
      return (
        <div>
          <ReactMarkdown>{message.content.message}</ReactMarkdown>
          <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(message.content.input_request); }}>
            {message.content.input_request.map((input, index) => (
              <div key={index} className="mb-4">
                <Label htmlFor={input.field} className="block text-sm font-medium text-gray-700">
                  {input.label}
                </Label>
                {input.description && <p className="text-xs text-gray-500 mb-1">{input.description}</p>}
                {input.type === 'textarea' ? (
                  <Textarea
                    id={input.field}
                    value={formInputs[input.field] || ''}
                    onChange={(e) => handleInputChange(input.field, e.target.value)}
                    className="mt-1 block w-full"
                  />
                ) : (
                  <Input
                    id={input.field}
                    type={input.type === 'text' ? 'text' : input.type}
                    value={formInputs[input.field] || ''}
                    onChange={(e) => handleInputChange(input.field, e.target.value)}
                    className="mt-1 block w-full"
                  />
                )}
              </div>
            ))}
            <Button 
              type="submit" 
              disabled={mutation.isLoading || message !== chat.messages[chat.messages.length - 1]}
              className="w-full"
            >
              {mutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit
            </Button>
          </form>
        </div>
      );
    }
    else if (message.metadata?.type === "user_input"){
      return <div className="text-sm text-gray-500">Form data submitted</div>
    }

    if (typeof message.content === 'string') {
      // Split the content by <link> tags
      const parts = message.content.split(/(<link>.*?<\/link>)/);
      return (
        <div>
          {parts.map((part, index) => {
            if (part.startsWith('<link>') && part.endsWith('</link>')) {
              const path = part.slice(6, -7); // Remove <link> and </link> tags
              return <LinkButton key={index} path={path} />;
            } else {
              return (
                <ReactMarkdown
                  key={index}
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <SyntaxHighlighter
                          {...props}
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                        >{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                      ) : (
                        <code {...props} className={className}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {part}
                </ReactMarkdown>
              );
            }
          })}
        </div>
      );
    }

    return <p>{JSON.stringify(message.content)}</p>;
  };

  const lastMessage = chat.messages[chat.messages.length - 1];
  const isLastMessageInputRequest = lastMessage?.metadata?.type === 'input_request';
  const isFormPresent = chat.messages.some(message => message.metadata?.type === 'input_request');

  return (
    <div className="max-w-4xl mx-auto p-4 h-[90vh] flex flex-col bg-gray-50">
      <Card className="flex-1 mb-4 overflow-hidden shadow-lg">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="space-y-4 p-4">
            {chat.messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className={`${message.role === 'user' ? 'bg-blue-500' : 'bg-green-500'}`}>
                    <AvatarFallback>{message.role === 'user' ? <User /> : <Bot />}</AvatarFallback>
                  </Avatar>
                  <div className={`rounded-lg p-3 ${message.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-white border border-gray-200'}`}>
                    {renderMessage(message)}
                  </div>
                </div>
              </div>
            ))}
            {isWaitingForResponse && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <Avatar className="bg-green-500">
                    <AvatarFallback><Bot /></AvatarFallback>
                  </Avatar>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex space-x-2">
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
          disabled={isLastMessageInputRequest || isWaitingForResponse}
        />
        <Button 
          type="submit" 
          disabled={mutation.isLoading || isLastMessageInputRequest || isWaitingForResponse}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {mutation.isLoading || isWaitingForResponse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">
            {isLastMessageInputRequest ? "Please fill in the form" : (isWaitingForResponse ? "Sending..." : "Send")}
          </span>
        </Button>
      </form>
    </div>
  );
};

export default Chatbot;