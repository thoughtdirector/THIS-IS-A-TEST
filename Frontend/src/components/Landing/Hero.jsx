import React from 'react';
import { motion } from 'framer-motion';

const Hero = () => {
  return (
    <div className="relative w-full max-w-5xl mx-auto py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <h1 className="text-[20rem] font-extrabold text-white select-none whitespace-nowrap">
          CasaEnElArbol
        </h1>
      </motion.div>
      
      <div className="relative z-10 text-center">
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-5xl font-bold text-white mb-6"
        >
          Protect Your Identity
        </motion.h2>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-xl text-white mb-10 max-w-2xl mx-auto"
        >
          CasaEnElArbol provides cutting-edge identity protection services, safeguarding your personal information in the digital age.
        </motion.p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 bg-accent-500 text-white text-lg font-semibold rounded-full hover:bg-accent-600 transition duration-300 shadow-lg"
        >
          Get Started
        </motion.button>
      </div>
    </div>
  );
};

export default Hero;