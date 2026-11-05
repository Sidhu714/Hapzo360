import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';

import { CheckCircle2, Clock } from 'lucide-react';
import { auth } from '../../config/firebase';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslatedJob } from '../../hooks/useTranslatedJob';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import * as api from './openingsApi';

const OTP_EXPIRY_SECONDS = 30;

export default function ApplyModal({ job, onClose }) {
  const { t } = useLanguage();
  const v = useTranslatedJob(job, ['title']);
  const positionContact = job.positions?.[0] || {};
  const contactName = positionContact.contactName || job.contactName || '';
  const contactPhone = positionContact.contactPhone || job.contactPhone || '';

  const [f, setF] = useState({ name: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null); // Holds random code
  const [confirmation, setConfirmation] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [verified, setVerified] = useState(false);
  const [done, setDone] = useState(false);
  const [timer, setTimer] = useState(0); // 30s Countdown timer

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      signOut(auth).catch(() => {});
    };
  }, []);

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const sendOtp = async () => {
    if (!f.name.trim()) {
      setErr('Please enter your name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(f.phone)) {
      setErr(t('apply.phoneError'));
      return;
    }

    setErr('');
    setBusy(true);

    try {
      // Simulate network response delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate a new random 6-digit OTP code
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(randomCode);

      setConfirmation(true);
      setOtp('');
      setTimer(OTP_EXPIRY_SECONDS); // Start 30s countdown
    } catch (error) {
      console.error('OTP send error:', error);
      setErr('Unable to send OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (timer === 0) {
      setErr('OTP has expired. Please request a new one.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setErr('Enter the 6-digit OTP.');
      return;
    }

    setErr('');
    setBusy(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (otp !== generatedOtp) {
        throw new Error('Incorrect OTP. Please enter the active code shown above.');
      }

      setIdToken('demo-id-token-for-testing');
      setVerified(true);
    } catch (error) {
      console.error('OTP verification error:', error);
      setErr(error.message || 'OTP verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!termsAccepted) {
      setErr('Please agree to the Hapzo360 Terms & Conditions before submitting your application.');
      return;
    }

    if (!verified) {
      if (confirmation) verifyOtp();
      else setErr('Please verify your phone number first.');
      return;
    }

    setErr('');
    setBusy(true);

    try {
      await api.submitApplication({
        jobId: job.id,
        jobTitle: job.title,
        ...f,
        idToken,
      });
      setDone(true);
      signOut(auth).catch(() => {});
    } catch (error) {
      console.error('Application submission error:', error);
      setErr('Unable to submit your application. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setConfirmation(null);
    setGeneratedOtp(null);
    setOtp('');
    setErr('');
    setTimer(0);
  };

  return (
    <Modal title={t('apply.title')} onClose={onClose}>
      <p className="mb-4 text-sm text-stone-500">
        {v.title} · {job.companyName}
      </p>

      {done ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <p className="mt-3 font-medium text-stone-800">{t('apply.done')}</p>
          {(contactName || contactPhone) && (
            <section className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
              <h3 className="font-semibold text-stone-900">{t('apply.contactTitle')}</h3>
              <p className="mt-2 text-sm text-stone-700">{contactName}</p>
              {contactPhone && <a className="mt-1 inline-block text-sm font-semibold text-brand-700" href={`tel:${contactPhone}`}>{contactPhone}</a>}
            </section>
          )}
          <button className="btn-outline mt-5" onClick={onClose}>
            OK
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field
            label={t('apply.name')}
            required
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            disabled={!!confirmation || verified}
          />

          <Field
            label={t('apply.phone')}
            required
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="98765 43210"
            value={f.phone}
            onChange={(e) =>
              setF({ ...f, phone: e.target.value.replace(/\D/g, '') })
            }
            disabled={!!confirmation || verified}
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm leading-5 text-stone-600">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-800"
            />
            <span>
              I agree to the Hapzo360{' '}
              <Link to="/terms-and-conditions" target="_blank" rel="noreferrer" className="font-semibold text-emerald-800 underline underline-offset-2">
                Terms &amp; Conditions
              </Link>{' '}
              for job applications.
            </span>
          </label>

          {!verified && (
            <>
              {!confirmation ? (
                <button
                  type="button"
                  className="btn-outline w-full"
                  onClick={sendOtp}
                  disabled={busy}
                >
                  {busy ? 'Sending OTP...' : 'Send OTP'}
                </button>
              ) : (
                <>
                  {/* Generated Demo OTP Box with Expiry Timer */}
                  <div className={`rounded-lg border p-3 text-center transition-colors ${
                    timer > 0 ? 'border-dashed border-amber-300 bg-amber-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <p className="text-xs font-medium text-stone-600">
                      Demo OTP Code (Sent to +91 {f.phone})
                    </p>
                    
                    {timer > 0 ? (
                      <>
                        <p className="mt-1 text-2xl font-extrabold tracking-widest text-amber-950 font-mono">
                          {generatedOtp}
                        </p>
                        <p className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold text-amber-800">
                          <Clock size={13} /> Expires in {timer}s
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-red-600">
                        OTP Expired — Please click "Resend OTP"
                      </p>
                    )}
                  </div>

                  <Field
                    label="Enter OTP"
                    required
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, ''))
                    }
                    disabled={timer === 0}
                  />

                  <button
                    type="button"
                    className="btn-outline w-full"
                    onClick={verifyOtp}
                    disabled={busy || timer === 0}
                  >
                    {busy ? 'Verifying...' : 'Verify OTP'}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      className="text-blue-600 underline disabled:text-stone-400 disabled:no-underline font-medium"
                      disabled={busy}
                      onClick={sendOtp}
                    >
                      Resend OTP {timer > 0 ? `(${timer}s)` : ''}
                    </button>

                    <button
                      type="button"
                      className="text-blue-600 underline"
                      disabled={busy}
                      onClick={restart}
                    >
                      Change number
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {verified && (
            <p className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 size={18} />
              Phone number verified successfully
            </p>
          )}

          {err && (
            <p role="alert" className="text-sm text-red-600">
              {err}
            </p>
          )}

          {verified && (
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={busy}
            >
              {busy ? 'Submitting...' : t('apply.submit')}
            </button>
          )}
        </form>
      )}
    </Modal>
  );
}
