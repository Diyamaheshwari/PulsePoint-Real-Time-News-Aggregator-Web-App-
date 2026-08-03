import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks';
import axios from 'axios';
import { FiBookOpen, FiMapPin, FiCheckCircle, FiCompass, FiCpu, FiDribbble, FiAlertTriangle, FiGlobe, FiTv, FiSmile } from 'react-icons/fi';

const TOPICS = [
  { id: 'Politics', label: 'Politics', icon: FiBookOpen, color: 'from-blue-500 to-indigo-600' },
  { id: 'Technology', label: 'Tech & Gadgets', icon: FiCpu, color: 'from-cyan-500 to-blue-600' },
  { id: 'Sports', label: 'Sports', icon: FiDribbble, color: 'from-orange-500 to-red-600' },
  { id: 'Business', label: 'Finance & Business', icon: FiCompass, color: 'from-emerald-500 to-teal-600' },
  { id: 'Entertainment', label: 'Entertainment', icon: FiTv, color: 'from-purple-500 to-pink-600' },
  { id: 'Health', label: 'Health & Science', icon: FiSmile, color: 'from-pink-500 to-rose-600' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [language, setLanguage] = useState('en');
  const [radius, setRadius] = useState(10); // Default 10km
  const [geoRequested, setGeoRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const navigate = useNavigate();
  
  // Use geolocation hook when requested
  const { coordinates, error: geoError, loading: geoLoading } = useGeolocation({
    watch: false,
    enableHighAccuracy: true,
  });

  const handleTopicToggle = (topicId) => {
    if (selectedTopics.includes(topicId)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topicId));
    } else {
      setSelectedTopics([...selectedTopics, topicId]);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && selectedTopics.length === 0) {
      setErrorMsg('Please select at least one topic preference');
      return;
    }
    setErrorMsg(null);
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setStep(step - 1);
  };

  const handleRequestLocation = () => {
    setGeoRequested(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    const payload = {
      preferences: selectedTopics,
      language,
      radius,
      location: geoRequested && coordinates ? {
        coordinates: [coordinates.longitude, coordinates.latitude], // [lng, lat] standard in GeoJSON
      } : null,
    };

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/onboarding', payload, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (response.data.success) {
        // Successfully onboarded. Redirect to homepage.
        navigate('/');
      } else {
        setErrorMsg(response.data.message || 'Onboarding failed');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A13] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Visual background lights */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-brand-accent/10 blur-[120px] pointer-events-none" />

      {/* Main glass box container */}
      <div className="w-full max-w-2xl bg-brand-card/70 border border-brand-border/80 rounded-2xl p-8 backdrop-blur-xl shadow-glass flex flex-col relative z-10">
        
        {/* Header Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-sans">
              Welcome to NewsSphere
            </h1>
            <p className="text-slate-400 text-sm mt-1">Let's personalize your news dashboard</p>
          </div>
          <div className="text-xs bg-brand-primary/20 text-brand-primary px-3 py-1 rounded-full border border-brand-primary/30 font-semibold uppercase tracking-wider">
            Step {step} of 3
          </div>
        </div>

        {/* Horizontal Progress Bars */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-brand-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-brand-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-brand-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-slate-800'}`} />
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
            <FiAlertTriangle className="flex-shrink-0 text-lg" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1 Content: Topics */}
        {step === 1 && (
          <div className="flex-1 animate-fade-in">
            <h2 className="text-xl font-semibold text-slate-100 mb-2">What topics interest you the most?</h2>
            <p className="text-slate-400 text-sm mb-6">Select your favorite categories to train your customized AI recommendation feed.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {TOPICS.map((topic) => {
                const Icon = topic.icon;
                const isSelected = selectedTopics.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicToggle(topic.id)}
                    className={`relative p-5 rounded-xl border flex flex-col items-center justify-center text-center gap-3 transition-all duration-300 overflow-hidden ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(59,130,246,0.15)] text-white scale-[1.02]'
                        : 'border-brand-border bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${topic.color} text-white shadow-md`}>
                      <Icon className="text-lg" />
                    </div>
                    <span className="font-semibold text-sm">{topic.label}</span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 text-brand-primary">
                        <FiCheckCircle className="text-base fill-brand-dark" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2 Content: Language & Location */}
        {step === 2 && (
          <div className="flex-1 animate-fade-in">
            <h2 className="text-xl font-semibold text-slate-100 mb-2">Select Your Preferred Language</h2>
            <p className="text-slate-400 text-sm mb-6">We will fetch global articles corresponding to your selection.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`p-4 rounded-xl border flex items-center gap-3 transition-all duration-200 ${
                    language === lang.code
                      ? 'border-brand-primary bg-brand-primary/10 text-white shadow-glass-sm'
                      : 'border-brand-border bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-brand-primary">
                    <FiGlobe className="text-sm" />
                  </div>
                  <span className="font-semibold text-sm">{lang.label}</span>
                </button>
              ))}
            </div>

            <h2 className="text-xl font-semibold text-slate-100 mb-2">Location Awareness (Optional)</h2>
            <p className="text-slate-400 text-sm mb-4">Grant geolocation access to unlock local community feed with posts and events happening around you.</p>

            <div className="p-5 rounded-xl border border-brand-border/60 bg-slate-900/30 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan flex-shrink-0">
                <FiMapPin className="text-xl" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-sm font-semibold text-slate-200">Local Area Radar</h3>
                <p className="text-slate-400 text-xs mt-1">Get custom geo-tagged alerts, local traffic/safety updates, and weather conditions.</p>
              </div>
              <button
                onClick={handleRequestLocation}
                disabled={geoRequested}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  geoRequested
                    ? coordinates
                      ? 'bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-brand-cyan hover:bg-brand-cyan/80 text-brand-dark shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:scale-[1.02]'
                }`}
              >
                {geoRequested ? (
                  coordinates ? (
                    <span className="flex items-center justify-center gap-1">
                      <FiCheckCircle /> Coords Captured
                    </span>
                  ) : geoLoading ? (
                    'Fetching...'
                  ) : (
                    'Permission Denied'
                  )
                ) : (
                  'Grant Location'
                )}
              </button>
            </div>
            
            {geoError && geoRequested && (
              <p className="text-xs text-amber-400/80 mt-2 text-center">
                Could not retrieve precise coordinates ({geoError}). We will fallback to a default location.
              </p>
            )}
          </div>
        )}

        {/* Step 3 Content: Local Feed Range & AI Digest */}
        {step === 3 && (
          <div className="flex-1 animate-fade-in">
            <h2 className="text-xl font-semibold text-slate-100 mb-2">Set Your Local Radar Radius</h2>
            <p className="text-slate-400 text-sm mb-6">Choose how far the local community posts search goes (in kilometers).</p>

            <div className="p-6 rounded-xl border border-brand-border bg-slate-900/40 mb-8 flex flex-col gap-6">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-300">Radar Coverage Distance</span>
                <span className="text-brand-primary text-lg font-bold">{radius} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>1 km (Ultra local)</span>
                <span>50 km</span>
                <span>100 km (Regional)</span>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-brand-border/60 bg-brand-accent/5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent flex-shrink-0">
                <FiCheckCircle className="text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Daily AI Digest Active</h3>
                <p className="text-slate-400 text-xs mt-1">Our system will aggregate the top stories based on your selected interests and generate an AI-tailored daily overview direct to your email inbox.</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-brand-border/80">
          {step > 1 ? (
            <button
              onClick={handlePrevStep}
              className="px-6 py-3 rounded-xl border border-brand-border hover:border-slate-600 bg-transparent hover:bg-slate-900 text-slate-300 font-bold transition-all text-sm"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={handleNextStep}
              className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary/80 hover:scale-[1.02] text-white font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] text-sm"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 hover:scale-[1.02] disabled:opacity-50 text-white font-bold transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] text-sm flex items-center gap-2"
            >
              {loading ? 'Finalizing...' : 'Enter NewsSphere'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
