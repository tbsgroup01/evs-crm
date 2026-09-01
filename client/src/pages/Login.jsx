import React, { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Rocket,
  Shield,
  TrendingUp,

} from 'lucide-react';
import { AuthContext } from '../App';

import globe from '../assets/globe.png'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const Login = () => {
  const { login } = useContext(AuthContext);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [lightModeOpen, setLightModeOpen] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@evgcrm.com',
      password: 'password123'
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post('/api/v1/auth/login', data);
      const user = res.data.data.user;
      const token = res.data.data.token;
      login(user, token);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setErrorMsg('Google Single Sign-On is managed by your Administrator.');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 font-sans text-slate-900 selection:bg-blue-500 selection:text-white">

      {/* LEFT SIDE: Brand Showcase */}
      <div className="relative lg:w-[48%] xl:w-[45%] bg-gradient-to-b from-blue-50/90 via-indigo-50/40 to-blue-600 flex flex-col justify-center p-8 sm:p-12 overflow-hidden min-h-[500px] lg:min-h-screen space-y-10">

        {/* Background Decorative Wave Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-600 via-blue-600/90 to-transparent pointer-events-none" />

        {/* SVG Decorative Curved Waves */}
        <svg className="absolute bottom-0 left-0 w-full h-80 text-blue-600 pointer-events-none" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none">
          <path fill="currentColor" fillOpacity="0.85" d="M0,224L60,213.3C120,203,240,181,360,192C480,203,600,245,720,250.7C840,256,960,224,1080,208C1200,192,1320,192,1380,192L1440,192L1440,600L1380,600C1320,600,1200,600,1080,600C600,600,480,600,360,600C240,600,120,600,60,600L0,600Z"></path>
        </svg>

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center gap-3">

          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">EVG CRM</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Lead to Success</span>
          </div>
        </div>

        {/* Headline & Description */}
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Welcome Back!
          </h1>
          <div className="w-12 h-1 bg-blue-600 rounded-full my-3" />
          <p className="text-slate-600 text-sm sm:text-base max-w-md leading-relaxed">
            Sign in to your EVG CRM account and continue managing leads, cases and grow your business.
          </p>
        </div>

        {/* Feature Highlights List */}
        <div className="relative z-10 space-y-4 text-white">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur text-blue-600 flex items-center justify-center shadow-md shrink-0">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white leading-snug">Smart Lead Management</h4>
              <p className="text-xs text-blue-100/90 leading-tight">Track, manage and convert leads efficiently.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur text-blue-600 flex items-center justify-center shadow-md shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white leading-snug">Secure &amp; Reliable</h4>
              <p className="text-xs text-blue-100/90 leading-tight">Your data is protected with enterprise-grade security.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur text-blue-600 flex items-center justify-center shadow-md shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white leading-snug">Real-time Insights</h4>
              <p className="text-xs text-blue-100/90 leading-tight">Get real-time reports and insights to make better decisions.</p>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT SIDE: Login Form Container */}
      <div className="relative flex-1 flex flex-col justify-between items-center p-6 sm:p-10 lg:p-12 bg-slate-50">

        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />




        {/* Center Login Card Container */}
        <div className="w-full max-w-md my-auto py-6 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 sm:p-10 transition-all">

            {/* Card Header & Blue Circle Icon */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-blue-600 shadow-inner">
                <img src={globe} alt="globe" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                EVG CRM Portal
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                Sign in to your corporate workspace
              </p>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-start gap-2.5 animate-fadeIn">
                <span className="shrink-0 text-red-500 font-bold">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Field 1: Corporate Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="name@evgcrm.com"
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50/70 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${errors.email
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Field 2: Account Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Account Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-11 py-3 bg-slate-50/70 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${errors.password
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Options Row: Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 accent-blue-600"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    setErrorMsg('Please contact your administrator to reset your corporate password.');
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot Password?
                </a>
              </div>

              {/* Main Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.005] active:scale-[0.995] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-medium">or</span>
              </div>
            </div>



            {/* Footer Support Text */}
            <p className="text-center text-xs text-slate-500 mt-6">
              Don't have an account?{' '}
              <a
                href="#admin"
                onClick={(e) => {
                  e.preventDefault();
                  setErrorMsg('Please contact your administrator at admin@evgcrm.com to register a new user account.');
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Contact Administrator
              </a>
            </p>

          </div>
        </div>



      </div>

    </div>
  );
};

export default Login;

