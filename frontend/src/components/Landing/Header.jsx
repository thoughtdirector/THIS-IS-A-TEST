import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', href: '#' },
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <header className="w-full py-4">
      <nav className="container mx-auto px-4 flex justify-between items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <a href="#" className="text-2xl font-bold text-white">CasaEnElArbol</a>
        </motion.div>

        {/* Desktop Menu */}
        <motion.ul 
          className="hidden md:flex space-x-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {navItems.map((item) => (
            <li key={item.name}>
              <a 
                href={item.href} 
                className="text-white hover:text-accent-300 transition duration-300"
              >
                {item.name}
              </a>
            </li>
          ))}
        </motion.ul>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-white focus:outline-none"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Sign In / Sign Up Buttons */}
        <motion.div 
          className="hidden md:flex items-center space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <a 
            href="login" 
            className="text-white hover:text-accent-300 transition duration-300"
          >
            Sign In
          </a>
          <a 
            href="signup" 
            className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-full transition duration-300"
          >
            Sign Up
          </a>
        </motion.div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden absolute top-16 left-0 right-0 bg-primary-700 py-4"
        >
          <ul className="flex flex-col items-center space-y-4">
            {navItems.map((item) => (
              <li key={item.name}>
                <a 
                  href={item.href} 
                  className="text-white hover:text-accent-300 transition duration-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              </li>
            ))}
            <li>
              <a 
                href="#signin" 
                className="text-white hover:text-accent-300 transition duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </a>
            </li>
            <li>
              <a 
                href="#signup" 
                className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-full transition duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </a>
            </li>
          </ul>
        </motion.div>
      )}
    </header>
  );
};

export default Header;