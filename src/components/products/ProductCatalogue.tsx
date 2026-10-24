import React, { useState } from 'react';
import {
  NORTHSTAR_PLANS,
  NORTHSTAR_PRODUCTS,
  APPROVED_FAQS,
  PRICING_EXAMPLES,
  NOT_SPECIFIED,
  SUPPORT_EMAIL
} from '../../data/northstarKnowledge';
import { ProductItem, ProductPlan } from '../../types';
import { Check, MessageSquare, Shield, Layers, BarChart3, Users, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface ProductCatalogueProps {
  onAskSupport: (question: string) => void;
}

const MATRIX_ROWS = ['Seat limit', 'Storage', 'SSO', 'Audit logs', 'Support response time', 'Uptime SLA'];

export const ProductCatalogue: React.FC<ProductCatalogueProps> = ({ onAskSupport }) => {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const icon = (category: ProductItem['category']) => {
    const cls = 'w-5 h-5';
    if (category === 'intelligence') return <BarChart3 className={`${cls} text-indigo-600`} />;
    if (category === 'collaboration') return <Users className={`${cls} text-emerald-600`} />;
    if (category === 'security') return <Shield className={`${cls} text-slate-800`} />;
    return <Layers className={`${cls} text-blue-600`} />;
  };

  const faqs = APPROVED_FAQS.filter((f) => f.category === 'products' || f.category === 'billing');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">Products & Pricing</h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">
          Prices are fictional demo prices in US dollars. Taxes, discounts, credits and proration are not included.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {NORTHSTAR_PLANS.map((plan: ProductPlan) => (
          <div
            key={plan.id}
            className={`rounded-xl bg-white border flex flex-col justify-between p-6 ${
              plan.highlighted ? 'border-blue-600 shadow-md ring-1 ring-blue-600' : 'border-slate-200 shadow-xs'
            }`}
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h2>
              <p className="text-xs text-slate-500 mb-4">{plan.targetAudience}</p>
              <div className="mb-4 pb-4 border-b border-slate-100 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">${plan.monthlyPrice}</span>
                <span className="text-xs text-slate-500 font-medium">/ {plan.billingPeriod}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">{plan.description}</p>
              {plan.features.map((f) => (
                <div key={f} className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onAskSupport(`What is included in the ${plan.name} plan and what limits apply?`)}
              className="mt-6 w-full py-2.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Support About {plan.name}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-slate-200">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-display mb-6">Product and add-ons</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {NORTHSTAR_PRODUCTS.map((prod) => (
            <div key={prod.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    {icon(prod.category)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{prod.name}</h3>
                    <p className="text-xs text-slate-500">{prod.tagline}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{prod.description}</p>
                {prod.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <strong className="text-slate-700">{prod.pricingNote}</strong>
                <button onClick={() => onAskSupport(`What are the capabilities of ${prod.name}?`)} className="text-blue-600 hover:text-blue-800 font-medium">
                  Ask Support &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display mb-3">Pricing examples</h2>
          <ul className="space-y-1.5 text-xs text-slate-700 font-mono">
            {PRICING_EXAMPLES.map((e) => <li key={e}>{e}</li>)}
          </ul>
          <p className="text-[11px] text-slate-500 mt-3">Arithmetic examples only, not quotes or invoice guarantees.</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 flex gap-3">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Plan features beyond price are not defined in the approved knowledge base, so they are marked "{NOT_SPECIFIED}" below
            rather than guessed. Please confirm with {SUPPORT_EMAIL} before purchasing.
          </p>
        </div>
      </div>

      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">Plan comparison</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-900">
                <th className="py-3 px-4">Feature</th>
                {NORTHSTAR_PLANS.map((p) => (
                  <th key={p.id} className="py-3 px-4">{p.name} (${p.monthlyPrice}/user/mo)</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-4 font-medium text-slate-900">Active projects</td>
                <td className="py-3 px-4">Maximum of two</td>
                <td className="py-3 px-4 text-slate-400">{NOT_SPECIFIED}</td>
                <td className="py-3 px-4 text-slate-400">{NOT_SPECIFIED}</td>
              </tr>
              {MATRIX_ROWS.map((row) => (
                <tr key={row}>
                  <td className="py-3 px-4 font-medium text-slate-900">{row}</td>
                  {NORTHSTAR_PLANS.map((p) => <td key={p.id} className="py-3 px-4 text-slate-400">{NOT_SPECIFIED}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 font-display mb-4">Pricing & billing FAQs</h2>
        <div className="space-y-3 max-w-4xl">
          {faqs.map((faq) => {
            const open = expandedFaq === faq.id;
            return (
              <div key={faq.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <button
                  onClick={() => setExpandedFaq(open ? null : faq.id)}
                  className="w-full flex items-center justify-between text-left text-sm font-semibold text-slate-900"
                  aria-expanded={open}
                >
                  <span>{faq.question}</span>
                  {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {open && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                    <p>{faq.answer}</p>
                    <button onClick={() => onAskSupport(faq.question)} className="mt-3 text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>Ask the support assistant</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
