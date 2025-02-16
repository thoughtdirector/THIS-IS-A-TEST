import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, Lock, Activity } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 flex flex-col items-center text-center"
  >
    <Icon className="w-12 h-12 text-accent-400 mb-4" />
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-200">{description}</p>
  </motion.div>
);

const Showcase = () => {
  const features = [
    {
      icon: Shield,
      title: "Real-time Protection",
      description: "Continuous monitoring and instant alerts for any suspicious activity related to your identity."
    },
    {
      icon: AlertCircle,
      title: "Fraud Alerts",
      description: "Immediate notifications about potential fraud attempts or unauthorized use of your personal information."
    },
    {
      icon: Lock,
      title: "Data Encryption",
      description: "State-of-the-art encryption to keep your sensitive data safe from cyber threats and breaches."
    },
    {
      icon: Activity,
      title: "Credit Monitoring",
      description: "Regular credit report checks and alerts for any significant changes or inquiries."
    }
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Why Choose CasaEnElArbol?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Showcase;