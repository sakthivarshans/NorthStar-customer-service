import React, { useState } from 'react';
import { APPROVED_FAQS, NORTHSTAR_POLICIES } from '../../data/northstarKnowledge';
import { FAQItem } from '../../types';
import {
  Search,
  BookOpen,
  CreditCard,
  Shield,
  FileText,
  Headphones,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  CheckCircle,
  HelpCircle,
  Mail,
  Phone
} from 'lucide-react';

interface HelpCenterProps {
  onAskSupport: (question: string) => void;
  onOpenEscalation: () => void;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({
  onAskSupport,
  onOpenEscalation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeFaq, setActiveFaq] = useState<FAQItem | null>(null);

  const categories = [
    { id: 'all', label: 'All Articles', icon: BookOpen },
    { id: 'products', label: 'Products & Features', icon: FileText },
    { id: 'billing', label: 'Billing & Subscriptions', icon: CreditCard },
    { id: 'account', label: 'Account & Security', icon: Shield },
    { id: 'policies', label: 'Policies & Compliance', icon: BookOpen }
  ];

  const filteredFaqs = APPROVED_FAQS.filter((faq) => {
    const matchesCat = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Search */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
          Northstar Help Center
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Approved FAQs and policies from the Northstar knowledge base.
        </p>

        <div className="mt-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs, cancellation policies, refund terms, security..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid: FAQs List + Selected Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: FAQ List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>
              Showing {filteredFaqs.length} verified {filteredFaqs.length === 1 ? 'article' : 'articles'}
            </span>
            <span className="italic text-slate-400">Official company dataset</span>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
              <p className="text-sm">No knowledge articles match "{searchQuery}".</p>
              <button
                onClick={() => onAskSupport(searchQuery)}
                className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask Support Agent to research this</span>
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isSelected = activeFaq?.id === faq.id;
              return (
                <div
                  key={faq.id}
                  onClick={() => setActiveFaq(faq)}
                  className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/40 border-blue-600 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                        {faq.question}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {faq.answer}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="capitalize">{faq.category} Policy</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAskSupport(faq.question);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Ask Agent</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Active FAQ Detail or Policy Spotlight */}
        <div className="lg:col-span-5 space-y-6">
          {activeFaq ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
              <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Approved Knowledge Base Document</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-snug mb-3">
                {activeFaq.question}
              </h2>
              <div className="text-xs text-slate-700 leading-relaxed space-y-2 border-t border-slate-100 pt-3">
                <p>{activeFaq.answer}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <button
                  onClick={() => onAskSupport(activeFaq.question)}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask Support Agent to Retrieve Sources</span>
                </button>
                <button
                  onClick={() => setActiveFaq(null)}
                  className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-xs text-slate-600">
              <h3 className="font-semibold text-slate-800 text-sm mb-2">
                Knowledge Base Guidance
              </h3>
              <p className="leading-relaxed mb-4">
                Selecting an article shows the approved answer from the knowledge base. Details the knowledge base does not specify are marked as such.
              </p>
              <div className="space-y-2">
                <div className="font-medium text-slate-700">Quick policies:</div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="font-semibold text-slate-900">Refunds</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{NORTHSTAR_POLICIES.refunds}</div>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="font-semibold text-slate-900">Cancellation</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{NORTHSTAR_POLICIES.cancellation}</div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Support Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Need Specialized Help?</h3>
                <p className="text-xs text-slate-500">Reach human support engineers</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              For account access recovery, contractual negotiations, or technical incidents requiring diagnostic log review.
            </p>
            <div className="space-y-2 text-xs mb-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>support@example.com (fictional demo address)</span>
              </div>
            </div>
            <button
              onClick={onOpenEscalation}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
            >
              Contact Support by Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
