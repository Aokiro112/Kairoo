'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  KeyRound, 
  Check, 
  AlertCircle,
  Fingerprint
} from 'lucide-react';
import { HackerAILogo } from '@/components/HackerAILogo';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const passwordStrength = getPasswordStrength(password);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setErrorMessage('');
    
    // Simulate instant Google OAuth redirect & session creation
    setTimeout(() => {
      localStorage.setItem('kairo_user', JSON.stringify({
        name: 'Mayank Tharwani',
        email: 'mayanktharwani9@gmail.com',
        provider: 'google',
        role: 'Security Operator',
        tier: 'Community'
      }));
      router.push('/chat');
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name or operator handle.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long.');
        return;
      }
      if (!termsAccepted) {
        setErrorMessage('Please accept the Terms of Service and Privacy Policy to continue.');
        return;
      }
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const displayName = mode === 'register' ? name : (email.split('@')[0] || 'Operator');
      localStorage.setItem('kairo_user', JSON.stringify({
        name: displayName,
        email: email.trim(),
        provider: 'credentials',
        role: 'Security Operator',
        tier: 'Community'
      }));
      setSuccessMessage(mode === 'register' ? 'Account created successfully! Redirecting...' : 'Authenticated successfully! Redirecting...');
      setTimeout(() => {
        router.push('/chat');
      }, 500);
    }, 900);
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    localStorage.setItem('kairo_user', JSON.stringify({
      name: 'Mayank Tharwani',
      email: 'mayanktharwani9@gmail.com',
      provider: 'demo',
      role: 'Lead Penetration Tester',
      tier: 'Security Pro'
    }));
    setTimeout(() => {
      router.push('/chat');
    }, 400);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotSuccess(false);
      setShowForgotModal(false);
      setForgotEmail('');
    }, 2500);
  };

  return (
    <div className="min-h-screen w-full bg-[#090909] text-[#F4F4F0] flex flex-col justify-between font-sans antialiased selection:bg-[#F4F4F0] selection:text-[#090909] relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none brutalist-grid opacity-30 z-0" />
      
      {/* Decorative Technical Editorial Badges */}
      <div className="hidden xl:flex fixed left-6 top-32 flex-col gap-1 text-[10px] font-mono tracking-widest text-[#686865] select-none z-10">
        <span>SECURITY PROTOCOL</span>
        <span>ED25519 ENCRYPTED</span>
        <span>ZERO TELEMETRY</span>
      </div>

      <div className="hidden xl:flex fixed right-6 top-32 flex-col items-end gap-1 text-[10px] font-mono tracking-widest text-[#686865] select-none z-10 text-right">
        <span>IDENTITY SERVICE</span>
        <span>STATUS : ACTIVE</span>
        <span>VERSION 2.4.0</span>
      </div>

      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center w-full relative z-10 px-4 sm:px-6 py-12 sm:py-16 max-w-lg mx-auto">
        
        {/* Auth Container Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full border border-[#2A2A28] bg-[#0E0E0E] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Card Top Branding */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#161616] border border-[#2A2A28] mb-3">
              <HackerAILogo className="w-5 h-5 text-[#F4F4F0]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F4F4F0] font-sans">
              {mode === 'login' ? 'Sign in to Kairo' : 'Create an operator account'}
            </h1>
            <p className="text-xs text-[#A3A3A0] mt-1">
              {mode === 'login' 
                ? 'Enter your credentials to access your autonomous security workspace.' 
                : 'Get started with autonomous vulnerability research and code auditing.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#141414] border border-[#222222] mb-6 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
              }}
              className={`py-2 rounded-lg font-medium transition-all ${
                mode === 'login'
                  ? 'bg-[#202020] text-[#F4F4F0] shadow-sm font-semibold'
                  : 'text-[#686865] hover:text-[#F4F4F0]'
              }`}
            >
              01 / SIGN IN
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
              }}
              className={`py-2 rounded-lg font-medium transition-all ${
                mode === 'register'
                  ? 'bg-[#202020] text-[#F4F4F0] shadow-sm font-semibold'
                  : 'text-[#686865] hover:text-[#F4F4F0]'
              }`}
            >
              02 / REGISTER
            </button>
          </div>

          {/* Google OAuth Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-[#2A2A28] bg-[#141414] hover:bg-[#1A1A1A] hover:border-[#444444] active:scale-98 transition-all flex items-center justify-center gap-3 text-sm font-medium text-[#F4F4F0] mb-5 select-none disabled:opacity-50"
          >
            {/* Google G SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
          </button>

          {/* Section Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="w-full border-t border-[#1D1D1B]" />
            <span className="bg-[#0E0E0E] px-3 text-[10px] font-mono text-[#686865] uppercase tracking-wider shrink-0">
              OR CONTINUE WITH EMAIL
            </span>
            <div className="w-full border-t border-[#1D1D1B]" />
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="p-3 mb-4 rounded-lg bg-[#FF5C5C]/10 border border-[#FF5C5C]/30 text-[#FF5C5C] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 mb-4 rounded-lg bg-[#B8FF3D]/10 border border-[#B8FF3D]/30 text-[#B8FF3D] text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Name Input (Register mode only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-mono text-[#A3A3A0] mb-1.5">
                  OPERATOR NAME / HANDLE
                </label>
                <div className="relative flex items-center border border-[#2A2A28] bg-[#141414] rounded-xl px-3.5 py-2.5 focus-within:border-[#F4F4F0]/40 transition-colors">
                  <User className="w-4 h-4 text-[#686865] mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mayank Tharwani"
                    className="w-full bg-transparent text-sm text-[#F4F4F0] placeholder-[#5A5A58] focus:outline-none font-sans"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-xs font-mono text-[#A3A3A0] mb-1.5">
                WORK EMAIL
              </label>
              <div className="relative flex items-center border border-[#2A2A28] bg-[#141414] rounded-xl px-3.5 py-2.5 focus-within:border-[#F4F4F0]/40 transition-colors">
                <Mail className="w-4 h-4 text-[#686865] mr-2.5 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@company.com"
                  className="w-full bg-transparent text-sm text-[#F4F4F0] placeholder-[#5A5A58] focus:outline-none font-sans"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-[#A3A3A0]">
                  {mode === 'login' ? 'MASTER KEY / PASSWORD' : 'CREATE PASSWORD'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-[#A3A3A0] hover:text-[#F4F4F0] transition-colors"
                  >
                    Forgot key?
                  </button>
                )}
              </div>
              <div className="relative flex items-center border border-[#2A2A28] bg-[#141414] rounded-xl px-3.5 py-2.5 focus-within:border-[#F4F4F0]/40 transition-colors">
                <Lock className="w-4 h-4 text-[#686865] mr-2.5 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent text-sm text-[#F4F4F0] placeholder-[#5A5A58] focus:outline-none font-sans tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#686865] hover:text-[#F4F4F0] p-1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter (Register mode only) */}
              {mode === 'register' && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength >= step
                            ? passwordStrength === 4
                              ? 'bg-[#B8FF3D]'
                              : passwordStrength >= 2
                              ? 'bg-[#FF9F43]'
                              : 'bg-[#FF5C5C]'
                            : 'bg-[#222222]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-[#686865] flex justify-between">
                    <span>STRENGTH: {passwordStrength === 4 ? 'VERY STRONG' : passwordStrength >= 2 ? 'MEDIUM' : 'WEAK'}</span>
                    <span>MIN 8 CHARS</span>
                  </div>
                </div>
              )}
            </div>

            {/* Checkboxes: Remember Me (Login) or Terms (Register) */}
            {mode === 'login' ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#2A2A28] bg-[#141414] text-[#F4F4F0] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#F4F4F0]"
                />
                <label htmlFor="rememberMe" className="text-xs text-[#A3A3A0] cursor-pointer select-none">
                  Remember session on this workstation
                </label>
              </div>
            ) : (
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-[#2A2A28] bg-[#141414] text-[#F4F4F0] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#F4F4F0]"
                />
                <label htmlFor="terms" className="text-[11px] text-[#A3A3A0] leading-tight select-none">
                  I agree to the{' '}
                  <Link href="/terms" prefetch={true} className="text-[#F4F4F0] underline hover:text-white">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" prefetch={true} className="text-[#F4F4F0] underline hover:text-white">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#F4F4F0] text-[#090909] font-bold text-sm hover:bg-white active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 select-none cursor-pointer mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-[#090909] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Operator Account'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

          </form>

          {/* Quick Demo Login Pill */}
          <div className="mt-6 pt-5 border-t border-[#1D1D1B] text-center">
            <div className="text-[11px] font-mono text-[#686865] mb-2">DEVELOPER / TEST ACCESS</div>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2 px-3 rounded-lg border border-[#2A2A28] bg-[#111111] hover:bg-[#181818] hover:border-[#3E3E3E] active:scale-98 text-xs font-mono text-[#A3A3A0] hover:text-[#F4F4F0] flex items-center justify-center gap-2 transition-all"
            >
              <Fingerprint className="w-3.5 h-3.5 text-[#B8FF3D]" />
              <span>Instant Demo Access (Mayank Tharwani)</span>
            </button>
          </div>

        </motion.div>

        {/* Security Commitments Under Card */}
        <div className="mt-6 text-center text-[11px] font-mono text-[#686865] flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#B8FF3D]" />
          <span>ZERO TELEMETRY GUARANTEE • TLS 1.3 ENCRYPTED SESSIONS</span>
        </div>

      </main>

      {/* Forgot Key Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111111] border border-[#2A2A28] rounded-xl max-w-sm w-full p-6 text-[#F4F4F0] shadow-2xl relative"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-[#686865] mb-2">
                <KeyRound className="w-4 h-4 text-[#B8FF3D]" />
                <span>KEY RECOVERY</span>
              </div>
              <h3 className="text-lg font-bold text-[#F4F4F0] mb-1">Reset Master Key</h3>
              <p className="text-xs text-[#A3A3A0] mb-4 leading-relaxed">
                Enter your registered work email to receive an ephemeral recovery magic link.
              </p>

              {forgotSuccess ? (
                <div className="p-3 rounded-lg bg-[#B8FF3D]/10 border border-[#B8FF3D]/30 text-[#B8FF3D] text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Recovery link sent! Check your inbox.</span>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="operator@company.com"
                    className="w-full bg-[#161616] border border-[#2A2A28] rounded-lg px-3 py-2 text-xs text-[#F4F4F0] placeholder-[#5A5A58] focus:outline-none focus:border-[#F4F4F0]"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-lg bg-[#F4F4F0] text-[#090909] text-xs font-bold hover:bg-white transition-colors"
                    >
                      Send Recovery Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-3 py-2 rounded-lg border border-[#2A2A28] bg-[#161616] text-xs text-[#A3A3A0] hover:text-[#F4F4F0] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090909] text-[#F4F4F0] flex items-center justify-center font-mono text-xs">LOADING AUTH...</div>}>
      <AuthContent />
    </Suspense>
  );
}
