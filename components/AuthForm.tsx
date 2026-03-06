
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { aiService } from '../services/ai';
import { EyeIcon, EyeOffIcon } from './Icons';

interface AuthFormProps {
  mode: 'login' | 'register';
  isDarkMode: boolean;
  onAuthSuccess: (user: User) => void;
  onSwitchMode: (newMode: 'login' | 'register') => void;
}

type RegisterStep = 'INFO' | 'SUCCESS';

export const AuthForm: React.FC<AuthFormProps> = ({ mode, isDarkMode, onAuthSuccess, onSwitchMode }) => {
  const [loginMethod, setLoginMethod] = useState<'username' | 'email'>('username');
  const [step, setStep] = useState<RegisterStep>('INFO');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  
  const [authError, setAuthError] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePassword = (pass: string) => {
    return pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    const lowerEmail = authEmail.toLowerCase().trim();
    if (!lowerEmail.endsWith('@gmail.com')) {
      setAuthError('Access Denied: Only @gmail.com addresses are permitted for registration.');
      setIsSubmitting(false);
      return;
    }

    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (!validatePassword(authPassword)) {
      setAuthError('Password must be 8+ characters with uppercase and numbers.');
      setIsSubmitting(false);
      return;
    }

    setVerifyingEmail(true);
    try {
      const riskCheck = await aiService.validateEmailRisk(authEmail);
      setVerifyingEmail(false);
      if (!riskCheck.isSafe) {
        setAuthError(riskCheck.reason || "This email does not meet our security standards. Please use a verified provider.");
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      setVerifyingEmail(false);
    }

    try {
      const result = await db.register(authUsername, authEmail, authPassword);
      if (result.success && result.user) {
        setStep('SUCCESS');
        setTimeout(() => onAuthSuccess(result.user!), 1500);
      } else {
        setAuthError(result.error || 'Registration failed.');
      }
    } catch (err) {
      setAuthError('Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    const identifier = loginMethod === 'username' ? authUsername : authEmail;
    try {
      const result = await db.login(identifier, authPassword, loginMethod);
      if (result.success && result.user) {
        onAuthSuccess(result.user);
      } else {
        setAuthError(result.error || 'Invalid credentials.');
      }
    } catch (err) {
      setAuthError('Login service unavailable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsSubmitting(true);
    try {
      const result = await db.signInWithGoogle();
      if (!result.success) {
        if (result.error?.toLowerCase().includes('provider is not enabled')) {
          setAuthError('Google Auth is not enabled. Follow the setup guide below.');
          setShowSetupGuide(true);
        } else {
          setAuthError(result.error || 'Google connection failed.');
        }
        setIsSubmitting(false);
      }
    } catch (err) {
      setAuthError('Identity services currently offline.');
      setIsSubmitting(false);
    }
  };

  if (step === 'SUCCESS') {
    return (
      <div className="max-w-md mx-auto py-20 text-center animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-emerald-500/20">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 className="text-3xl font-serif font-bold mb-2">Welcome!</h2>
        <p className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Entry granted to the StoryVerse Collective.</p>
      </div>
    );
  }

  return (
    <section className="max-w-md mx-auto py-6 md:py-10 text-center px-4">
      <div className="mb-8 flex flex-col items-center">
        <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3">
          {mode === 'login' ? 'Welcome Back' : 'Join StoryVerse'}
        </h2>
      </div>
      
      {authError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm rounded-xl font-bold flex flex-col gap-1 text-left animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            <span className="text-[10px] uppercase opacity-60">Authentication Alert</span>
          </div>
          <p className="ml-8 leading-tight">{authError}</p>
        </div>
      )}

      <div className={`p-6 md:p-8 rounded-2xl shadow-xl space-y-6 text-left ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'}`}>
        {mode === 'login' && (
          <>
            <div className={`flex p-1 rounded-xl mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <button 
                onClick={() => setLoginMethod('username')}
                className={`flex-1 py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all ${loginMethod === 'username' ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-500'}`}
              >
                Username
              </button>
              <button 
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all ${loginMethod === 'email' ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-500'}`}
              >
                Email
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">{loginMethod === 'username' ? 'Username' : 'Email Address'}</label>
                <input 
                  type={loginMethod === 'username' ? "text" : "email"} 
                  required
                  disabled={isSubmitting}
                  value={loginMethod === 'username' ? authUsername : authEmail}
                  onChange={(e) => loginMethod === 'username' ? setAuthUsername(e.target.value) : setAuthEmail(e.target.value)}
                  className={`w-full p-3 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-white' : 'bg-white border-slate-200 focus:border-indigo-500'}`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    disabled={isSubmitting}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className={`w-full p-3 pr-10 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-white' : 'bg-white border-slate-200 focus:border-indigo-500'}`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2">
                {isSubmitting && !verifyingEmail ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Login'}
              </button>
            </form>
          </>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Username</label>
              <input type="text" required value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} className={`w-full p-3 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-white' : 'bg-white border-slate-200 focus:border-indigo-500'}`} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Email Address (@gmail.com only)</label>
              <input type="email" required placeholder="e.g. name@gmail.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className={`w-full p-3 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-white' : 'bg-white border-slate-200 focus:border-indigo-500'}`} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Create Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className={`w-full p-3 pr-10 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-white' : 'bg-white border-slate-200 focus:border-indigo-500'}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><EyeIcon /></button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Confirm Password</label>
              <input type="password" required value={authConfirmPassword} onChange={(e) => setAuthConfirmPassword(e.target.value)} className={`w-full p-3 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-white' : 'bg-white border-slate-200 focus:border-indigo-500'}`} />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 overflow-hidden relative">
              {verifyingEmail ? (
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   <span>Securing Identity...</span>
                </div>
              ) : isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}

        <div className="relative py-4">
           <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
           <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className={`px-4 ${isDarkMode ? 'bg-slate-900 text-slate-600' : 'bg-white text-slate-400'}`}>Secure Options</span></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}`}
        >
           {isSubmitting && mode === 'login' ? (
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
           ) : (
             <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
           )}
           <span className="text-xs font-bold">Sign in with Google</span>
        </button>

        <button 
          onClick={() => setShowSetupGuide(!showSetupGuide)}
          className={`w-full mt-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${showSetupGuide ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}`}
        >
          {showSetupGuide ? 'Close Setup Guide' : 'Need help with Google Auth?'}
          <svg className={`w-3 h-3 transition-transform ${showSetupGuide ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
        </button>

        {showSetupGuide && (
          <div className="mt-4 p-5 rounded-2xl bg-indigo-50 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-800 animate-in slide-in-from-bottom-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4">Google Cloud Engineering Guide</h4>
            
            <ol className="space-y-4 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium list-decimal ml-4">
              <li>
                Visit the <a href="https://console.cloud.google.com/" target="_blank" className="text-indigo-600 dark:text-indigo-400 font-bold underline">Google Cloud Console</a>.
              </li>
              <li>
                Create a project and go to <strong>APIs & Services {" > "} Credentials</strong>.
              </li>
              <li>
                Click <strong>+ CREATE CREDENTIALS</strong> and select <strong>OAuth client ID</strong>.
              </li>
              <li>
                Select <strong>Web application</strong>. Paste this exact URI into <strong>Authorized redirect URIs</strong>:
                <div className={`mt-2 p-3 rounded-xl border font-mono text-[9px] break-all select-all flex items-center justify-between ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <span>https://uvjavqzhhqxkfuklkxdo.supabase.co/auth/v1/callback</span>
                  <svg className="w-3 h-3 ml-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 01-2 2h8a2 2 0 012-2v-2" /></svg>
                </div>
              </li>
              <li>
                Copy the <strong>Client ID</strong> and <strong>Secret</strong> into your <strong>Supabase Dashboard</strong> under <strong>Auth {" > "} Providers {" > "} Google</strong>.
              </li>
            </ol>
            
            <div className="mt-6 pt-4 border-t border-indigo-100 dark:border-slate-800 flex flex-col gap-2">
               <p className="text-[9px] font-bold text-slate-400 uppercase">Pro Tip</p>
               <p className="text-[10px] italic">Ensure you also configure the "OAuth consent screen" in Google Cloud before creating credentials.</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-sm">
        {mode === 'login' ? (
          <p className="text-slate-500">
            Need an account? {' '}
            <button onClick={() => onSwitchMode('register')} className="text-indigo-600 font-bold hover:underline">Register</button>
          </p>
        ) : (
          <p className="text-slate-500">
            Already have an account? {' '}
            <button onClick={() => onSwitchMode('login')} className="text-indigo-600 font-bold hover:underline">Login</button>
          </p>
        )}
      </div>
    </section>
  );
};
