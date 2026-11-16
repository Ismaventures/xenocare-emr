import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Shield,
  Users,
  Stethoscope,
  Activity,
  FlaskConical,
  Pill,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const demoAccounts = [
  {
    role: 'Super Admin',
    email: 'superadmin@ndchospital.com',
    icon: Shield,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    role: 'Doctor',
    email: 'doctor@ndchospital.com',
    icon: Stethoscope,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    role: 'Nurse',
    email: 'nurse@ndchospital.com',
    icon: Activity,
    color: 'text-pink-600 bg-pink-50',
  },
  {
    role: 'Lab Tech',
    email: 'lab@ndchospital.com',
    icon: FlaskConical,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    role: 'Pharmacist',
    email: 'pharmacy@ndchospital.com',
    icon: Pill,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    role: 'Billing',
    email: 'billing@ndchospital.com',
    icon: CreditCard,
    color: 'text-teal-600 bg-teal-50',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message || 'Invalid email or password');
        setIsLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-full flex flex-col md:flex-row min-h-screen">
        {/* Left Side - Branding & Demo Accounts */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-green-800 via-green-700 to-green-900 relative overflow-hidden flex-col p-8 lg:p-12 justify-center items-center">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-green-600/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-80 h-80 rounded-full bg-green-500/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5 blur-2xl" />

          {/* Logo & Title */}
          <div className="relative z-10 text-center text-white mb-8 mt-8">
            <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl p-3">
              <img
                src={require('../../../assets/ndclogo.png')}
                alt="NDC Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-4xl font-bold tracking-tight">NDC EMR</h2>
            <p className="text-green-200 text-base mt-2">NDC MEDICAL CENTRE</p>
          </div>

          {/* Footer */}
          <div className="relative z-10 text-center mt-6">
            <p className="text-green-200/60 text-xs">
              Secure Healthcare Management System
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-8">
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mb-5 shadow-sm md:hidden">
                <img
                  src={require('../../../assets/ndclogo.png')}
                  alt="NDC Logo"
                  className="w-9 h-9 object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Welcome back
              </h1>
              <p className="text-gray-500 mt-2">
                Please enter your details to sign in.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center">
                <svg
                  className="w-5 h-5 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none bg-gray-50 focus:bg-white text-base"
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none bg-gray-50 focus:bg-white pr-12 text-base"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 mr-2"
                  />
                  Remember me
                </label>
                <a
                  href="#"
                  className="font-medium text-green-600 hover:text-green-700"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-700 text-white py-4 rounded-xl font-semibold hover:bg-green-800 focus:ring-4 focus:ring-green-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-green-700/20 text-base"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-gray-400">
              @Xenolink {new Date().getFullYear()} All rights reserved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
