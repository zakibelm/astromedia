import React from 'react';
import Header from './Header';
import Hero from './Hero';
import Features from './Features';
import Footer from './Footer';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-[#10051a] text-white">
      <Header onStart={onStart} />
      <main>
        <Hero onStart={onStart} />
        <Features />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
