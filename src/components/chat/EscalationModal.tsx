import React, { useState } from 'react';
import { X, CheckCircle, Headphones, Mail, Phone, Clock, AlertCircle } from 'lucide-react';

interface EscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const EscalationModal: React.FC<EscalationModalProps> = ({
  isOpen,
  onClose,
  initialQuery = ''
}) => {
  const [tier, setTier] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [subject, setSubject] = useState(
    initialQuery ? `Support Request: ${initialQuery.slice(0, 40)}...` : 'Assistance with account & plans'
  );
  const [details, setDetails] = useState(initialQuery || '');
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `NST-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(id);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="escalation-modal-title"
    >
      <div
        className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full p-6 text-left relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 id="escalation-modal-title" className="text-base font-semibold text-slate-900">
                Connect with Northstar Human Support
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Route your request directly to a dedicated support engineer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">Priority Ticket Created</h4>
              <p className="text-xs text-slate-500 mt-1">
                Your ticket <span className="font-mono font-bold text-slate-800">#{ticketId}</span> has been dispatched to our engineering desk.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs text-slate-600 text-left space-y-1">
              <div><strong className="text-slate-800">Assigned SLA:</strong> {tier === 'enterprise' ? '1-Hour Critical Response' : tier === 'professional' ? '4-Hour Business Response' : '24-Hour Email Response'}</div>
              <div><strong className="text-slate-800">Confirmation Sent:</strong> Check your registered workspace email</div>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Your Subscription Tier</label>
              <div className="grid grid-cols-3 gap-2">
                {(['starter', 'professional', 'enterprise'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`py-2 px-3 border rounded text-left transition-colors ${
                      tier === t
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="capitalize font-semibold">{t}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {t === 'enterprise' ? '1h SLA · 24/7' : t === 'professional' ? '4h SLA' : '24h SLA'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="ticket-subject" className="block font-medium text-slate-700 mb-1">
                Subject
              </label>
              <input
                id="ticket-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label htmlFor="ticket-details" className="block font-medium text-slate-700 mb-1">
                Issue Description or Escalation Reason
              </label>
              <textarea
                id="ticket-details"
                rows={3}
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe your question or issue in detail..."
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
              />
            </div>

            {/* Direct contact details */}
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Support Hours & Direct Escalation:</span>
              </div>
              <div className="pl-5">
                Professional & Starter: support@northstar.example.com (Mon–Fri 8am–8pm EST)
              </div>
              <div className="pl-5">
                Enterprise Hotline: +1 (800) 555-0199 (24/7/365 dedicated bridge)
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
              >
                Submit Priority Ticket
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
