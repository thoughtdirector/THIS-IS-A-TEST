import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

const projectData = {
  "projects": [
    {
      "project": "Create a marketing campaign",
      "answer": "Sure! We will need to complete the following tasks",
      "tasks": [
        { "name": "hiring", "time": "10h", "cost": "50$", "priority": "high", "objective": "Create a design", "agent": { "name": "Alice", "image": "/api/placeholder/100/100" } },
        { "name": "content creation", "time": "5m", "cost": "2$", "priority": "high", "objective": "Write engaging copy for the campaign", "agent": { "name": "GPT-4o", "image": "/api/placeholder/100/100" } },
        { "name": "social media strategy", "time": "8h", "cost": "80$", "priority": "medium", "objective": "Develop a plan for posting and engaging on various social platforms", "agent": { "name": "Charlie", "image": "/api/placeholder/100/100" } },
        { "name": "budget allocation", "time": "5h", "cost": "30$", "priority": "medium", "objective": "Determine how to distribute the marketing budget effectively", "agent": { "name": "David", "image": "/api/placeholder/100/100" } },
        { "name": "audience research", "time": "5m", "cost": "1$", "priority": "high", "objective": "Identify target audience and create personas", "agent": { "name": "Perplexity AI", "image": "/api/placeholder/100/100" } },
        { "name": "advertisement production", "time": "20m", "cost": "0.5$", "priority": "high", "objective": "Create ads for various platforms", "agent": { "name": "DALL-E 3", "image": "/api/placeholder/100/100" } },
        { "name": "campaign launch", "time": "10h", "cost": "60$", "priority": "high", "objective": "Roll out the campaign across all channels", "agent": { "name": "Grace", "image": "/api/placeholder/100/100" } },
        { "name": "performance analysis", "time": "30m", "cost": "3$", "priority": "medium", "objective": "Track metrics and evaluate the campaign's success", "agent": { "name": "Custom AI Agent", "image": "/api/placeholder/100/100" } },
        { "name": "competitor analysis", "time": "15m", "cost": "7$", "priority": "medium", "objective": "Analyze competitors' marketing strategies", "agent": { "name": "Claude-3.5", "image": "/api/placeholder/100/100" } }
      ]
    },
    {
      "project": "Develop a mobile application",
      "answer": "Certainly! Here are the tasks we need to complete",
      "tasks": [
        { "name": "requirements gathering", "time": "10h", "cost": "50$", "priority": "high", "objective": "Collect user needs and app requirements", "agent": { "name": "Diana", "image": "/api/placeholder/100/100" } },
        { "name": "UI/UX design", "time": "30m", "cost": "1$", "priority": "high", "objective": "Design user-friendly interfaces", "agent": { "name": "Midjourney", "image": "/api/placeholder/100/100" } },
        { "name": "development", "time": "2h", "cost": "15$", "priority": "high", "objective": "Write code for both front-end and back-end", "agent": { "name": "o1", "image": "/api/placeholder/100/100" } },
        { "name": "testing", "time": "15m", "cost": "4$", "priority": "medium", "objective": "Test the application for bugs and issues", "agent": { "name": "Custom Testing AI Agent", "image": "/api/placeholder/100/100" } },
        { "name": "integration", "time": "10h", "cost": "70$", "priority": "medium", "objective": "Integrate third-party services and APIs", "agent": { "name": "Harry", "image": "/api/placeholder/100/100" } },
        { "name": "app store compliance", "time": "10m", "cost": "3$", "priority": "medium", "objective": "Ensure the app meets app store requirements", "agent": { "name": "GPT-4", "image": "/api/placeholder/100/100" } },
        { "name": "deployment", "time": "8h", "cost": "60$", "priority": "high", "objective": "Launch the app in app stores", "agent": { "name": "Jack", "image": "/api/placeholder/100/100" } },
        { "name": "post-launch support", "time": "20m", "cost": "0.5$", "priority": "medium", "objective": "Provide maintenance and address issues reported by users", "agent": { "name": "Custom Support AI", "image": "/api/placeholder/100/100" } },
        { "name": "user feedback analysis", "time": "5m", "cost": "1$", "priority": "medium", "objective": "Analyze user feedback and suggestions for improvements", "agent": { "name": "Sentiment AI", "image": "/api/placeholder/100/100" } }
      ]
    },
    {
      "project": "Organize a corporate event",
      "answer": "Of course! Here are the steps to organize the event",
      "tasks": [
        { "name": "venue selection", "time": "10h", "cost": "100$", "priority": "high", "objective": "Find and book a suitable location", "agent": { "name": "George", "image": "/api/placeholder/100/100" } },
        { "name": "catering", "time": "12h", "cost": "150$", "priority": "high", "objective": "Arrange food and beverages for attendees", "agent": { "name": "Hannah", "image": "/api/placeholder/100/100" } },
        { "name": "invitation management", "time": "10m", "cost": "2$", "priority": "medium", "objective": "Send invitations and manage RSVPs", "agent": { "name": "Custom Event Management AI", "image": "/api/placeholder/100/100" } },
        { "name": "event schedule", "time": "5m", "cost": "3$", "priority": "medium", "objective": "Plan the agenda for the event", "agent": { "name": "o1", "image": "/api/placeholder/100/100" } },
        { "name": "logistics coordination", "time": "10h", "cost": "80$", "priority": "high", "objective": "Arrange transportation and accommodation for key attendees", "agent": { "name": "Kevin", "image": "/api/placeholder/100/100" } },
        { "name": "AV setup", "time": "6h", "cost": "50$", "priority": "medium", "objective": "Set up audiovisual equipment for presentations", "agent": { "name": "Lily", "image": "/api/placeholder/100/100" } },
        { "name": "speaker management", "time": "8h", "cost": "70$", "priority": "medium", "objective": "Coordinate with speakers and prepare their materials", "agent": { "name": "Michael", "image": "/api/placeholder/100/100" } },
        { "name": "post-event feedback", "time": "5m", "cost": "3$", "priority": "low", "objective": "Collect and analyze feedback from attendees", "agent": { "name": "Sentiment AI", "image": "/api/placeholder/100/100" } },
        { "name": "virtual attendance setup", "time": "20m", "cost": "3$", "priority": "medium", "objective": "Set up virtual attendance options for remote participants", "agent": { "name": "Custom Virtual Event AI", "image": "/api/placeholder/100/100" } }
      ]
    },
    {
      "project": "Launch a new product",
      "answer": "Here are the tasks to launch the new product",
      "tasks": [
        { "name": "market research", "time": "30m", "cost": "120$", "priority": "high", "objective": "Study market trends and customer needs", "agent": { "name": "Perplexity AI", "image": "/api/placeholder/100/100" } },
        { "name": "prototype development", "time": "25h", "cost": "300$", "priority": "high", "objective": "Create a prototype of the product", "agent": { "name": "Peter", "image": "/api/placeholder/100/100" } },
        { "name": "product testing", "time": "20h", "cost": "150$", "priority": "high", "objective": "Test the prototype with a sample audience", "agent": { "name": "Quincy", "image": "/api/placeholder/100/100" } },
        { "name": "branding", "time": "15m", "cost": "80$", "priority": "medium", "objective": "Develop branding for the product", "agent": { "name": "Flux/Gemini Agent", "image": "/api/placeholder/100/100" } },
        { "name": "pricing strategy", "time": "10m", "cost": "50$", "priority": "medium", "objective": "Determine the pricing for the product", "agent": { "name": "Custom Pricing AI", "image": "/api/placeholder/100/100" } },
        { "name": "marketing campaign", "time": "20m", "cost": "200$", "priority": "high", "objective": "Create marketing materials and plan campaign", "agent": { "name": "GPT-4o", "image": "/api/placeholder/100/100" } },
        { "name": "distribution planning", "time": "10h", "cost": "70$", "priority": "medium", "objective": "Plan logistics for product distribution", "agent": { "name": "Ursula", "image": "/api/placeholder/100/100" } },
        { "name": "product launch event", "time": "12h", "cost": "150$", "priority": "high", "objective": "Organize the launch event", "agent": { "name": "Victor", "image": "/api/placeholder/100/100" } },
        { "name": "competitive analysis", "time": "15m", "cost": "3$", "priority": "medium", "objective": "Analyze competitor products and strategies", "agent": { "name": "Claude-3.5", "image": "/api/placeholder/100/100" } }
      ]
    },
    {
      "project": "Redesign company website",
      "answer": "Here are the tasks required to redesign the company website",
      "tasks": [
        { "name": "requirements analysis", "time": "10h", "cost": "80$", "priority": "high", "objective": "Gather requirements from stakeholders", "agent": { "name": "Ethan", "image": "/api/placeholder/100/100" } },
        { "name": "wireframe creation", "time": "15m", "cost": "1$", "priority": "high", "objective": "Design wireframes for the new layout", "agent": { "name": "Figma AI", "image": "/api/placeholder/100/100" } },
        { "name": "graphic design", "time": "30m", "cost": "4$", "priority": "high", "objective": "Create visual elements and graphics", "agent": { "name": "Flux", "image": "/api/placeholder/100/100" } },
        { "name": "content migration", "time": "20m", "cost": "7$", "priority": "medium", "objective": "Transfer content from the old website", "agent": { "name": "Custom Content Migration AI", "image": "/api/placeholder/100/100" } },
        { "name": "SEO optimization", "time": "10m", "cost": "50$", "priority": "medium", "objective": "Ensure the new website is optimized for search engines", "agent": { "name": "SEO Optimization AI", "image": "/api/placeholder/100/100" } },
        { "name": "development", "time": "2h", "cost": "400$", "priority": "high", "objective": "Code the new website", "agent": { "name": "Dev Team w/ Claude-3.5", "image": "/api/placeholder/100/100" } },
        { "name": "testing", "time": "30m", "cost": "100$", "priority": "medium", "objective": "Conduct usability and functionality testing", "agent": { "name": "Custom Testing AI", "image": "/api/placeholder/100/100" } },
        { "name": "launch", "time": "5h", "cost": "40$", "priority": "high", "objective": "Deploy the redesigned website", "agent": { "name": "Lily", "image": "/api/placeholder/100/100" } },
        { "name": "accessibility audit", "time": "15m", "cost": "60$", "priority": "medium", "objective": "Ensure the website meets accessibility standards", "agent": { "name": "Jose", "image": "/api/placeholder/100/100" } }
      ]
    },
    {
      "project": "Develop an AI-powered customer service chatbot",
      "answer": "Here's a plan to develop an efficient AI-powered customer service chatbot",
      "tasks": [
        { "name": "requirements gathering", "time": "8h", "cost": "60$", "priority": "high", "objective": "Define chatbot functionality and integration points", "agent": { "name": "Emma", "image": "/api/placeholder/100/100" } },
        { "name": "data collection", "time": "30m", "cost": "2$", "priority": "high", "objective": "Gather and organize customer service data for training", "agent": { "name": "Custom Data Collection AI", "image": "/api/placeholder/100/100" } },
        { "name": "rag system", "time": "1h", "cost": "5$", "priority": "high", "objective": "Develop RAG system", "agent": { "name": "o1", "image": "/api/placeholder/100/100" } },
        { "name": "chatbot interface design", "time": "15m", "cost": "1$", "priority": "medium", "objective": "Design user-friendly chatbot interface", "agent": { "name": "DALL-E 3", "image": "/api/placeholder/100/100" } },
        { "name": "integration", "time": "20h", "cost": "100$", "priority": "high", "objective": "Integrate chatbot with existing customer service systems", "agent": { "name": "Alex", "image": "/api/placeholder/100/100" } },
        { "name": "testing and refinement", "time": "30m", "cost": "3$", "priority": "medium", "objective": "Test chatbot performance and refine responses", "agent": { "name": "Custom Testing AI", "image": "/api/placeholder/100/100" } },
        { "name": "deployment", "time": "5h", "cost": "40$", "priority": "high", "objective": "Deploy chatbot to production environment", "agent": { "name": "DevOps AI", "image": "/api/placeholder/100/100" } },
        { "name": "monitoring and optimization", "time": "15m", "cost": "2$", "priority": "medium", "objective": "Set up monitoring and continuously optimize performance", "agent": { "name": "Analytics AI", "image": "/api/placeholder/100/100" } }
      ]
    },
      {
        "project": "Implement an AI-driven content creation strategy",
        "answer": "Here's a plan to implement an AI-driven content creation strategy",
        "tasks": [
          { "name": "content audit", "time": "1m", "cost": "1$", "priority": "high", "objective": "Analyze existing content and identify gaps", "agent": { "name": "Content AI", "image": "/api/placeholder/100/100" } },
          { "name": "audience research", "time": "1m", "cost": "2$", "priority": "high", "objective": "Identify target audience and content preferences", "agent": { "name": "Perplexity AI", "image": "/api/placeholder/100/100" } },
          { "name": "topic generation", "time": "1m", "cost": "0.5$", "priority": "medium", "objective": "Generate content ideas and topics", "agent": { "name": "GPT-4", "image": "/api/placeholder/100/100" } },
          { "name": "content creation", "time": "5m", "cost": "10$", "priority": "high", "objective": "Produce various types of content (articles, videos, infographics)", "agent": { "name": "Multi-modal AI", "image": "/api/placeholder/100/100" } },
          { "name": "SEO optimization", "time": "5m", "cost": "3$", "priority": "medium", "objective": "Optimize content for search engines", "agent": { "name": "SEO AI", "image": "/api/placeholder/100/100" } },
          { "name": "content scheduling", "time": "5m", "cost": "1$", "priority": "low", "objective": "Create a content calendar and schedule posts", "agent": { "name": "Scheduling AI", "image": "/api/placeholder/100/100" } },
          { "name": "performance analysis", "time": "2m", "cost": "2$", "priority": "medium", "objective": "Analyze content performance and engagement", "agent": { "name": "Analytics AI", "image": "/api/placeholder/100/100" } },
          { "name": "strategy refinement", "time": "2m", "cost": "60$", "priority": "medium", "objective": "Refine strategy based on performance insights", "agent": { "name": "Sophia", "image": "/api/placeholder/100/100" } }
        ]
      },
      
    ]
  }

const AnimatedText = ({ text, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    {text}
  </motion.div>
);

const AnimatedProjectDisplay = () => {
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);

  const currentProject = projectData.projects[currentProjectIndex];

  const rotateProject = () => {
    setShowTasks(false);
    setShowAnswer(false);
    setTimeout(() => {
      setCurrentProjectIndex((prevIndex) => (prevIndex + 1) % projectData.projects.length);
      setTimeout(() => setShowAnswer(true), 700);
      setTimeout(() => setShowTasks(true), 1200);
    }, 500);
  };

  useEffect(() => {
    setShowAnswer(true);
    setTimeout(() => setShowTasks(true), 700);

    let intervalId;
    if (!isPaused) {
      intervalId = setInterval(rotateProject, 6000);
    }
    return () => clearInterval(intervalId);
  }, [isPaused, currentProjectIndex]);

  const handleNextProject = () => {
    rotateProject();
  };

  return (
    <Card 
      className="w-full max-w-3xl mx-auto relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute top-4 right-4 z-10">
        <Button onClick={handleNextProject} size="sm">
          <ChevronRight className="mr-2 h-4 w-4" /> Next Project
        </Button>
      </div>
      <CardContent className="p-6 h-[500px] overflow-y-auto" ref={containerRef}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProject.project}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatedText text={<h2 className="text-2xl font-bold mb-4">{currentProject.project}</h2>} />
            {showAnswer && (
              <AnimatedText text={<p className="mb-4">{currentProject.answer}</p>} delay={0.5} />
            )}
            {showTasks && (
              <ul className="space-y-4">
                {currentProject.tasks.map((task, index) => (
                  <AnimatedText
                    key={task.name}
                    text={
                      <li className="flex items-start">
                        <div className="flex-grow">
                          <h3 className="font-semibold">{task.name}</h3>
                          <p className="text-sm text-gray-600 ml-4">
                            Time: {task.time} | Cost: {task.cost} | Priority: {task.priority}
                          </p>
                          <p className="mt-1">{task.objective}</p>
                        </div>
                        <div className="ml-4 flex flex-col items-center w-24">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={task.agent.image} alt={task.agent.name} />
                            <AvatarFallback>{task.agent.name[0]}</AvatarFallback>
                          </Avatar>
                          <p className="mt-2 text-sm text-center truncate w-full" title={task.agent.name}>{task.agent.name}</p>
                          <p className="text-xs text-gray-500">Agent</p>
                        </div>
                      </li>
                    }
                    delay={1 + index * 0.2}
                  />
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default AnimatedProjectDisplay;