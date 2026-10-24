import React, { useState } from 'react';
import { X, Headphones, Mail, AlertCircle } from 'lucide-react';
import { SUPPORT_EMAIL } from '../../data/northstarKnowledge';

interface EscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

/**
 * There is no ticketing system connected, so this modal never claims a ticket was created.
 * It prepares a well-formed email draft (per the KB's "useful support request" guidance).
 */
export const EscalationModal: React.FC<EscalationModalProps> = ({ isOpen, onClose, initialQuery = '' }) => {
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [accountEmail, setAccountEmail] = useState('');

  if (!isOpen) return null;

  const body = [
    `Account email / workspace: ${accountEmail || '(please add)'}`,
    '',
    'What I expected and what happened:',
    details || initialQuery || '(please describe)',
    '',
    'Approximate date/time and time zone:',
    'Exact non-sensitive error message:',
    'Steps to reproduce:',
    '',
    '(Do not include passwords, one-time codes, API keys or full card numbers.)'
  ].join('\n');
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject || 'Support request')}&body=${encodeURIComponent(body)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="esc-title">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 id="esc-title" className="text-sm font-bold text-slate-900">Contact human support</h3>
              <p className="text-xs text-slate-500">Prepare an email to {SUPPORT_EMAIL}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded p-3 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            This does not create a ticket. {SUPPORT_EMAIL} is a fictional demo address, and support hours and response times are not specified.
          </p>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <label className="block">
            <span className="font-medium text-slate-700">Account email and workspace</span>
            <input value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} className="mt-1 w-full border border-slate-300 rounded px-3 py-2" />
          </label>
          <label className="block">
            <span className="font-medium text-slate-700">Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" className="mt-1 w-full border border-slate-300 rounded px-3 py-2" />
          </label>
          <label className="block">
            <span className="font-medium text-slate-700">What happened?</span>
            <textarea value={details || initialQuery} onChange={(e) => setDetails(e.target.value)} rows={4} className="mt-1 w-full border border-slate-300 rounded px-3 py-2" />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md">Close</button>
          <a href={mailto} className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Open email draft
          </a>
        </div>
      </div>
    </div>
  );
};
