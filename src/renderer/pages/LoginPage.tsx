import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import XenoCareLogo from '../components/shared/XenoCareLogo';

const heroImage = require('../../../assets/login/xenocare-african-healthcare.jpg');

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
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message || 'Invalid email or password');
        setIsLoading(false);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Mobile image hero */}
        <div className="relative h-[290px] overflow-hidden bg-[#0E2A47] lg:hidden">
          <img
            src={heroImage}
            alt="African healthcare professionals collaborating in a clinical environment"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081B2E] via-[#0E2A47]/75 to-[#0E2A47]/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#081B2E]/85 via-[#0E2A47]/45 to-transparent" />
          <div className="relative z-10 flex h-full flex-col justify-between p-6">
            <XenoCareLogo variant="white" className="h-auto w-[190px]" />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F97316]/40 bg-[#0E2A47]/80 px-3 py-1 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-[#F97316]" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-white">
                  XenoCare <span className="text-[#F97316]">EMR</span>
                </span>
              </div>
              <h1 className="mt-3 max-w-xs text-3xl font-extrabold leading-tight tracking-tight text-white">
                Powering a Healthier{' '}
                <span className="text-[#F97316]">Nigeria.</span>
              </h1>
              <p className="mt-3 text-xs font-bold tracking-wide text-white/90">
                Powered by <span className="text-[#F97316]">XenoLink.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Desktop image-led brand panel */}
        <div className="relative hidden overflow-hidden bg-[#0E2A47] lg:flex lg:w-[58%]">
          <img
            src={heroImage}
            alt="African healthcare professionals collaborating in a clinical environment"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#071726]/95 via-[#0E2A47]/80 to-[#0E2A47]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071726]/95 via-[#0E2A47]/25 to-[#0E2A47]/35" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#F97316]/20 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
            <XenoCareLogo
              variant="white"
              className="h-auto w-[245px] xl:w-[270px]"
            />

            <div className="max-w-2xl pb-2">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#F97316]/45 bg-[#0E2A47]/85 px-4 py-1.5 shadow-lg shadow-black/20 backdrop-blur-md">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F97316]" />
                <span className="text-xs font-extrabold uppercase tracking-[0.3em] text-white">
                  XenoCare <span className="text-[#F97316]">EMR</span>
                </span>
              </div>
              <h1 className="mt-5 text-5xl font-extrabold leading-[1.06] tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)] xl:text-6xl">
                Powering a Healthier
                <br />
                <span className="text-[#F97316]">Nigeria.</span>
              </h1>
              <p className="mt-6 text-sm font-bold tracking-wide text-white/90">
                Powered by <span className="text-[#F97316]">XenoLink.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Login form panel */}
        <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-[#F4F7FA] px-5 py-10 lg:w-[42%] lg:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-45"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(14,42,71,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(14,42,71,0.05) 1px, transparent 1px)',
              backgroundSize: '42px 42px',
            }}
          />
          <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#F97316]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-[#0E2A47]/10 blur-3xl" />

          <div className="relative z-10 w-full max-w-md">
            <div className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_28px_80px_-28px_rgba(14,42,71,0.32)]">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#0E2A47] via-[#F97316] to-[#0E2A47]" />
              <div className="p-7 sm:p-9">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#F97316]">
                      XenoCare EMR
                    </p>
                    <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight text-[#0E2A47]">
                      Welcome Back
                    </h2>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0E2A47]/5 p-1.5 ring-1 ring-[#0E2A47]/10">
                    <XenoCareLogo
                      variant="brand"
                      compact
                      className="h-full w-full"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                      !
                    </span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#0E2A47]"
                    >
                      Username or email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-base text-[#0E2A47] outline-none transition-all placeholder:text-slate-400 focus:border-[#F97316] focus:bg-white focus:ring-4 focus:ring-[#F97316]/15"
                      placeholder="name@hospital.org"
                      autoComplete="username"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#0E2A47]"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 pr-12 text-base text-[#0E2A47] outline-none transition-all placeholder:text-slate-400 focus:border-[#F97316] focus:bg-white focus:ring-4 focus:ring-[#F97316]/15"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0E2A47]"
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <label className="flex cursor-pointer items-center font-medium text-slate-600">
                      <input
                        type="checkbox"
                        className="mr-2 h-4 w-4 rounded border-slate-300 text-[#0E2A47] focus:ring-[#F97316]"
                      />
                      Remember me
                    </label>
                    <a
                      href="#"
                      className="font-bold text-[#F97316] transition-colors hover:text-[#EA580C]"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0E2A47] py-3.5 text-base font-bold text-white shadow-lg shadow-[#0E2A47]/25 transition-all hover:bg-[#163B63] focus:outline-none focus:ring-4 focus:ring-[#F97316]/30 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="h-5 w-5 animate-spin text-[#F97316]"
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
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>

                <div className="mt-8 border-t border-slate-100 pt-5 text-center text-xs font-bold text-[#0E2A47]">
                  Powered by <span className="text-[#F97316]">XenoLink.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
