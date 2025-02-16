import React from 'react';
import  useAuth from "../../hooks/useAuth";
import Header from './Header';
import Hero from './Hero';
import Showcase from './Showcase';
import Feature from './Feature';
import Footer from './Footer';
import HowItWorks from './HowItWorks';
import CallToAction from './CallToAction';

function Landing() {
  const { user: currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-400 to-accent-500">
      <div className="flex flex-col min-h-screen">
        <section className="w-full">
          <div className="container mx-auto px-4 flex items-center justify-center">
            <Header />
          </div>
        </section>
        
        <section className="w-full flex-grow flex items-center">
          <div className="container mx-auto px-4 py-8 flex flex-col justify-center space-y-8">
            <Hero />
            <HowItWorks />
            <Showcase />
            <CallToAction />
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}

export default Landing;