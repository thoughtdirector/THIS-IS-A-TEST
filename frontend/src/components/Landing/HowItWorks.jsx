import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Bell, Shield, Code, CheckCircle } from 'lucide-react';

const Step = ({ icon: Icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="flex flex-col items-center text-center"
  >
    <div className="bg-accent-500 p-4 rounded-full mb-4">
      <Icon className="w-8 h-8 text-white" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-200">{description}</p>
  </motion.div>
);

const HowItWorks = () => {
  const steps = [
    {
      icon: UserPlus,
      title: "User Registration",
      description: "Sign up for CasaEnElArbol to start protecting your identity across supported platforms."
    },
    {
      icon: Code,
      title: "Simple Platform Integration",
      description: "Our allies easily implement CasaEnElArbol with just one line of code, enhancing their security measures."
    },
    {
      icon: Bell,
      title: "Activity Notifications",
      description: "Receive instant notifications for all activities related to your identity on supported sites."
    },
    {
      icon: Shield,
      title: "Approval Required",
      description: "Critical actions, like credit applications, require your explicit approval to proceed."
    },
    {
      icon: CheckCircle,
      title: "Enhanced Security",
      description: "Enjoy peace of mind knowing your identity is protected across multiple platforms."
    }
  ];

  return (
    <section className="py-16 bg-primary-700 bg-opacity-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-white text-center mb-12">How CasaEnElArbol Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {steps.map((step, index) => (
            <Step key={index} {...step} />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16 text-center"
        >
          <h3 className="text-2xl font-semibold text-white mb-4">For Platforms</h3>
          <div className="bg-primary-600 p-4 rounded-lg inline-block">
            <code className="text-accent-300">
              CasaEnElArbol.notify(user_id, action_type, details);
            </code>
          </div>
          <p className="text-sm text-gray-200 mt-4">
            Implementing CasaEnElArbol is as simple as adding this single line of code to your platform.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;