import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiActivity } from 'react-icons/fi';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const { register, isAuthenticated, error, clearErrors } = useAuth();
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
    if (!username || !email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (!acceptTerms) {
      setErrorMsg('You must agree to the Terms of Service');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await register({ username, email, password });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface bg-grid-pattern flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Background radial effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-accent/5 blur-[120px] pointer-events-none" />

      {/* Register Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-glass-sm flex flex-col items-center relative z-10 animate-fade-in">
        
        {/* Brand Area */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-brand-accent font-extrabold shadow-sm">
            <FiActivity className="text-xl" />
          </div>
          <span className="text-2xl font-black font-serif tracking-tight text-brand-primary">
            PulsePoint
          </span>
        </div>

        <h2 className="text-xl font-serif font-bold text-brand-primary text-center mb-1">Create Your Account</h2>
        <p className="text-text-secondary text-sm text-center mb-6">Join our network for localized community feeds.</p>

        {errorMsg && (
          <div className="w-full mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-brand-rose text-sm text-center font-medium animate-fade-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-primary tracking-wide">Username</label>
            <div className="relative flex items-center">
              <FiUser className="absolute left-3 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="choose_username"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
              />
            </div>
          </div>

          {/* Email */}
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

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-primary tracking-wide">Password</label>
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

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-primary tracking-wide">Confirm Password</label>
            <div className="relative flex items-center">
              <FiLock className="absolute left-3 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
              />
            </div>
          </div>

          {/* Accept Terms */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary font-medium hover:text-text-primary mt-1 select-none">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary w-4 h-4"
            />
            I accept the Terms of Service & Editorial Guidelines
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !acceptTerms}
            className="w-full mt-4 bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-all shadow-sm hover:-translate-y-0.5"
          >
            {loading ? 'Creating secure account...' : 'Create Account'}
          </button>

        </form>

        <div className="mt-6 text-center text-sm font-medium text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-accent hover:text-brand-accentHover font-bold transition-all">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}
