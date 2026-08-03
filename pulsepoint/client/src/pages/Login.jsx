import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { FiMail, FiLock, FiEye, FiEyeOff, FiCheckCircle, FiActivity } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const { login, isAuthenticated, error, clearErrors } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      setErrorMsg(error);
      clearErrors();
    }
  }, [error, clearErrors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      setErrorMsg('Invalid credentials or network connection issue');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('admin@pulsepoint.in');
    setPassword('Admin@123');
  };

  return (
    <div className="min-h-screen bg-brand-surface bg-grid-pattern flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Background radial effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/5 blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-glass-sm flex flex-col items-center relative z-10">
        
        {/* Brand Area */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-brand-accent font-extrabold shadow-sm">
            <FiActivity className="text-xl" />
          </div>
          <span className="text-2xl font-black font-serif tracking-tight text-brand-primary">
            PulsePoint
          </span>
        </div>

        <h2 className="text-xl font-serif font-bold text-brand-primary text-center mb-1">Welcome Back</h2>
        <p className="text-text-secondary text-sm text-center mb-6">Sign in to access curated news and personalized feeds.</p>

        {errorMsg && (
          <div className="w-full mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-brand-rose text-sm text-center font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          
          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-primary tracking-wide">Email Address</label>
            <div className="relative flex items-center">
              <FiMail className="absolute left-3 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-text-primary tracking-wide">Password</label>
            </div>
            <div className="relative flex items-center">
              <FiLock className="absolute left-3 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-400 hover:text-brand-primary focus:outline-none"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-sm hover:-translate-y-0.5"
          >
            {loading ? 'Validating credentials...' : 'Sign In'}
          </button>

          {/* Demo account autofill */}
          <button
            type="button"
            onClick={handleQuickFill}
            className="w-full bg-white border border-gray-200 text-brand-primary hover:bg-gray-50 font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 mt-2"
          >
            <FiCheckCircle className="text-brand-accent" /> Autofill Admin Credentials
          </button>

        </form>

        <div className="mt-6 text-center text-sm font-medium text-text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-accent hover:text-brand-accentHover font-bold transition-all">
            Get Started
          </Link>
        </div>

      </div>
    </div>
  );
}