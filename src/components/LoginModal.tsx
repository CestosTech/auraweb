import React, { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, ConfirmationResult } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean; onClose: () => void; initialMode?: 'login' | 'register';
  restaurants: unknown[]; drivers?: unknown[]; supermarkets?: unknown[];
  onOpenRestaurantPortal: (restaurantId: string) => void;
  onOpenDriverPortal?: (driverId?: string) => void; onOpenAdminPortal?: () => void;
  onOpenRestaurantOnboarding?: () => void; onOpenDriverJoin?: () => void;
  onOpenSupermarketPortal?: (supermarketId: string) => void; onOpenSupermarketOnboarding?: () => void;
}
const normalizeLiberianPhone = (raw: string) => {
  let value = raw.trim();
  if (!/^[+0-9\s().-]+$/.test(value)) return null;
  value = value.replace(/[\s().-]/g, '');
  if (value.startsWith('+')) {
    if (!value.startsWith('+231')) return null;
    value = value.slice(4);
  } else if (value.startsWith('00')) {
    if (!value.startsWith('00231')) return null;
    value = value.slice(5);
  } else if (value.length === 12 && value.startsWith('231')) {
    value = value.slice(3);
  }
  if (value.length === 10 && value.startsWith('0')) value = value.slice(1);
  return /^[1-9]\d{8}$/.test(value) ? `+231${value}` : null;
};
const localLiberianInput = (raw: string) => {
  const value = raw.trim().replace(/[\s().-]/g, '');
  if (value.startsWith('+231')) return value.slice(4);
  if (value.startsWith('00231')) return value.slice(5);
  if (value.length === 12 && value.startsWith('231')) return value.slice(3);
  return raw;
};
export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { setUserDirectly } = useAuth();
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [requestedPhone, setRequestedPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) { verifier.current?.clear(); verifier.current = null; setConfirmation(null); setRequestedPhone(''); setCode(''); setError(''); }
    return () => { verifier.current?.clear(); verifier.current = null; };
  }, [isOpen]);
  if (!isOpen) return null;
  const finish = () => { setUserDirectly({} as any); onClose(); };
  const failure = (value: unknown) => {
    const code = (value as { code?: string })?.code;
    const messages: Record<string, string> = {
      'auth/unauthorized-domain': 'This domain needs authorization in Firebase Authentication.',
      'auth/captcha-check-failed': 'Phone verification was blocked. Check the reCAPTCHA and try again.',
      'auth/invalid-app-credential': 'Phone verification could not validate this website. Check Firebase authorized domains and web API key restrictions.',
      'auth/missing-app-credential': 'Phone verification could not start. Refresh the page and try again.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
      'auth/popup-closed-by-user': 'Google sign-in was closed. Try again when ready.',
      'auth/invalid-verification-code': 'The SMS code is incorrect.',
      'auth/code-expired': 'The code expired. Request a new code.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
      'auth/quota-exceeded': 'The SMS sending limit has been reached. Try again later or use a Firebase test number.',
      'auth/billing-not-enabled': 'Phone SMS is not enabled for this Firebase project. Contact support or use another sign-in method.',
      'auth/invalid-phone-number': 'Enter a valid Liberian phone number.',
    };
    setError(code && messages[code] || 'Sign-in could not be completed. Please try again.');
  };
  const google = async () => {
    if (busy) return; setBusy(true); setError('');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); finish(); }
    catch (value) { failure(value); } finally { setBusy(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      if (confirmation) {
        if (!/^\d{6}$/.test(code.trim())) { setError('Enter the six-digit SMS code.'); return; }
        await confirmation.confirm(code.trim()); finish();
      } else {
        const liberianPhone = normalizeLiberianPhone(phone);
        if (!liberianPhone) { setError('Enter a valid Liberian phone number. The +231 prefix is added automatically.'); return; }
        if (!container.current) throw new Error('Verification control unavailable');
        verifier.current?.clear();
        verifier.current = new RecaptchaVerifier(auth, container.current, { size: 'normal' });
        const result = await signInWithPhoneNumber(auth, liberianPhone, verifier.current);
        setRequestedPhone(liberianPhone);
        setConfirmation(result);
      }
    } catch (value) { failure(value); verifier.current?.clear(); verifier.current = null; }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[500] bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Sign in to Aura">
    <form onSubmit={submit} className="bg-white rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center"><h2 className="font-bold text-xl">Sign in to Aura</h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close">✕</button></div>
      <button type="button" disabled={busy} onClick={google} className="w-full border rounded-xl p-3 font-semibold">Continue with Google</button>
      <button type="button" disabled={busy || !!confirmation} onClick={() => setPhoneMode(!phoneMode)} className="w-full p-2">Continue with phone</button>
      {phoneMode && <>
        <label className="block">Phone number<div className="mt-1 flex overflow-hidden rounded-xl border"><span className="flex items-center border-r bg-gray-50 px-3 text-gray-700">+231</span><input required type="tel" autoComplete="tel-national" inputMode="tel" placeholder="770 400 338" disabled={busy || !!confirmation} value={phone} onChange={e => setPhone(localLiberianInput(e.target.value))} className="min-w-0 flex-1 p-3 outline-none" /></div></label>
        {confirmation && <><p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Verification code requested for <strong>{requestedPhone}</strong>. Check your SMS messages.</p><label className="block">6-digit SMS code<input required autoComplete="one-time-code" inputMode="numeric" value={code} disabled={busy} onChange={e => setCode(e.target.value)} className="border rounded-xl p-3 w-full" /></label><p className="text-sm text-gray-600">If it does not arrive, confirm SMS delivery is enabled for Liberia (+231), then try again later or use a different number.</p></>}
        <p className="text-sm text-gray-600">Firebase sends an SMS to verify your number. Message rates may apply. Google uses phone numbers for abuse prevention.</p>
        <button disabled={busy} className="w-full rounded-xl bg-[#06C167] text-white font-bold p-3">{busy ? 'Please wait…' : confirmation ? 'Verify code' : 'Send SMS code'}</button>
        {confirmation && <button type="button" disabled={busy} onClick={() => { setConfirmation(null); setRequestedPhone(''); setCode(''); }} className="w-full p-2">Use a different number</button>}
      </>}
      <p className="text-xs text-gray-600 leading-relaxed">Read our <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms &amp; Conditions</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>.</p>
      <div ref={container} />
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </form>
  </div>;
};
