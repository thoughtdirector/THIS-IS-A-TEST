import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield } from 'lucide-react';

const CallToAction = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-8 md:p-12 shadow-xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-8 md:mb-0 md:mr-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Protect Your Identity Today
              </h2>
              <p className="text-xl text-gray-200 mb-6">
                Join thousands of users who trust CasaEnElArbol to safeguard their personal information.
              </p>
              <ul className="text-gray-200 mb-6">
                <li className="flex items-center mb-2">
                  <Shield className="w-5 h-5 mr-2 text-accent-400" />
                  Real-time protection across multiple platforms
                </li>
                <li className="flex items-center mb-2">
                  <Shield className="w-5 h-5 mr-2 text-accent-400" />
                  Instant alerts for suspicious activities
                </li>
                <li className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-accent-400" />
                  Easy-to-use dashboard to manage your security
                </li>
              </ul>
            </div>
            <div className="w-full md:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full md:w-auto bg-accent-500 hover:bg-accent-600 text-white text-xl font-semibold py-4 px-8 rounded-full transition duration-300 flex items-center justify-center"
              >
                Get Started Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </motion.button>
              <p className="text-center text-gray-300 mt-4">
                No credit card required
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CallToAction;