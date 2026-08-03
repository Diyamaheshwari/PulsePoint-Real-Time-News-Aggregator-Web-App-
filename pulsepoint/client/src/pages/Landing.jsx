import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiGlobe, FiMapPin, FiUsers } from 'react-icons/fi';

export default function Landing() {
  return (
    <div className="min-h-screen bg-brand-surface flex flex-col relative font-sans text-brand-primary">
      
      {/* Top Border Accent */}
      <div className="h-1 w-full bg-brand-accent" />

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center px-4 pt-24 pb-16 z-10 max-w-6xl mx-auto w-full">
        
        {/* Subtle Badge */}
        <div className="mb-8 border-b border-brand-border pb-2">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Global Intelligence & Local Connect</span>
        </div>

        {/* Hero Headline */}
        <div className="max-w-4xl text-center space-y-6 mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-serif text-brand-primary leading-[1.1] tracking-tight">
            The World's Most <br className="hidden md:block" />
            <span className="italic text-brand-accent">Actionable</span> Platform.
          </h1>
          <p className="text-base md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Experience news with unmatched clarity. Dive into curated global journalism, discover hyperlocal events on your radar, and connect with niche communities.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-24 w-full sm:w-auto animate-slide-in">
          <Link 
            to="/register"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-brand-primary text-white font-bold text-sm tracking-wide transition-all border border-brand-primary hover:bg-brand-accent hover:border-brand-accent rounded-sm shadow-sm"
          >
            Create an Account
            <FiArrowRight />
          </Link>
          <Link 
            to="/login"
            className="flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-white text-brand-primary border border-brand-border font-bold text-sm tracking-wide transition-all hover:border-brand-primary rounded-sm shadow-sm"
          >
            Member Sign In
          </Link>
        </div>

        {/* Features Section */}
        <div className="w-full max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-serif font-bold text-brand-primary mb-4">Why Join PulsePoint?</h2>
            <div className="w-16 h-1 bg-brand-accent mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl border border-brand-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-brand-surface rounded-full flex items-center justify-center mb-6 border border-brand-border">
                <FiGlobe className="text-brand-accent text-xl" />
              </div>
              <h3 className="text-xl font-bold mb-3">Global News Feed</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Stay updated with curated top headlines from around the world. Filter by country and category to find exactly what matters to your industry.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl border border-brand-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-brand-surface rounded-full flex items-center justify-center mb-6 border border-brand-border">
                <FiMapPin className="text-brand-accent text-xl" />
              </div>
              <h3 className="text-xl font-bold mb-3">Local Radar</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Using real-time geolocation, discover what's happening within a 50km radius. Connect with local happenings and regional updates instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl border border-brand-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-brand-surface rounded-full flex items-center justify-center mb-6 border border-brand-border">
                <FiUsers className="text-brand-accent text-xl" />
              </div>
              <h3 className="text-xl font-bold mb-3">Pulse Communities</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Join or create niche communities. Share thoughts, vote on polls, and engage in high-level discussions with verified professionals.
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
