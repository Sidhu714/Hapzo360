import { useState } from 'react';
import { PRICING } from '../../config';
import Modal from '../../components/Modal';
import * as api from './openingsApi';

export default function PaymentModal({ company, onPaid, onClose }) {
  const fee = api.getPostingFee(company);
  const [busy, setBusy] = useState(false);
  const pay = async () => { setBusy(true); await api.payForPosting(company); onPaid(); };
  return (
    <Modal title="Posting fee" onClose={onClose}>
      <p className="text-sm text-stone-600">
        {company.jobsPosted === 0
          ? `Your first job post costs ₹${PRICING.firstJob}. Every new job after that costs ₹${PRICING.additionalJob}.`
          : `Each new job post costs ₹${PRICING.additionalJob}.`}
      </p>
      <div className="my-5 rounded-lg bg-brand-50 p-4 text-center">
        <div className="text-sm text-stone-500">Amount to pay</div>
        <div className="text-3xl font-bold text-brand-800">₹{fee}</div>
      </div>
      <p className="mb-4 text-xs text-stone-500">Demo mode: no money is charged. Replace payForPosting() with a real gateway later.</p>
      <button className="btn-primary w-full" disabled={busy} onClick={pay}>{busy ? 'Processing…' : `Pay ₹${fee}`}</button>
    </Modal>
  );
}
