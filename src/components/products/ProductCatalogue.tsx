import React, { useState } from 'react';
import {
  NORTHSTAR_PLANS,
  NORTHSTAR_PRODUCTS,
  APPROVED_FAQS
} from '../../data/northstarKnowledge';
import { ProductItem, ProductPlan } from '../../types';
import {
  Check,
  HelpCircle,
  MessageSquare,
  Shield,
  Layers,
  BarChart3,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ProductCatalogueProps {
  onAskSupport: (question: string) => void;
}

export const ProductCatalogue: React.FC<ProductCatalogueProps> = ({ onAskSupport }) => {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const getProductIcon = (category: ProductItem['category']) => {
    switch (category) {
      case 'core':
        return <Layers className="w-5 h-5 text-blue-600" />;
      case 'intelligence':
        return <BarChart3 className="w-5 h-5 text-indigo-600" />;
      case 'collaboration':
        return <Users className="w-5 h-5 text-emerald-600" />;
      case 'security':
        return <Shield className="w-5 h-5 text-slate-800" />;
      default:
        return <Layers className="w-5 h-5 text-blue-600" />;
    }
  };

  const productFaqs = APPROVED_FAQS.filter((f) => f.category === 'products' || f.category === 'billing');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
          Products & Commercial Pricing
        </h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">
          Integrated modules built for enterprise operations. All plans include continuous security patches, data encryption, and access to Northstar customer engineering.
        </p>

        {/* Billing Cycle Switcher */}
        <div className="mt-6 inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              billingCycle === 'annual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual Billing (Save up to 18%)
          </button>
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
        </div>
      </div>

      {/* Pricing Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {NORTHSTAR_PLANS.map((plan: ProductPlan) => {
          const price = billingCycle === 'annual' ? plan.annualPricePerMonth : plan.monthlyPrice;

          return (
            <div
              key={plan.id}
              className={`rounded-xl bg-white border flex flex-col justify-between p-6 transition-all ${
                plan.highlighted
                  ? 'border-blue-600 shadow-md ring-1 ring-blue-600'
                  : 'border-slate-200 shadow-xs'
              }`}
            >
              <div>
                {/* Plan Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
                  {plan.highlighted && (
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Most Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-4">{plan.targetAudience}</p>

                {/* Price Display */}
                <div className="mb-6 pb-6 border-b border-slate-100">
                  {price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
                        ${price}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        / user / month
                      </span>
                    </div>
                  ) : (
                    <div className="text-xl font-bold text-slate-900">
                      Contact support for pricing
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {billingCycle === 'annual' && price
                      ? `Billed annually ($${price * 12}/seat/yr)`
                      : 'Billed monthly, cancel anytime'}
                  </p>
                </div>

                {/* Limits summary */}
                <div className="space-y-2 mb-6 text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Seat Limit:</span>
                    <span className="font-semibold text-slate-800">{plan.limits.seats}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Storage Pool:</span>
                    <span className="font-semibold text-slate-800">{plan.limits.storage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Support SLA:</span>
                    <span className="font-semibold text-slate-800">{plan.limits.supportSla}</span>
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-2.5 mb-6">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Included Capabilities
                  </div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() =>
                  onAskSupport(
                    `Can you explain what is included in the ${plan.name} plan and whether it fits my organization?`
                  )
                }
                className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  plan.highlighted
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask Support About {plan.name}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Product Modules Breakdown */}
      <div className="pt-8 border-t border-slate-200">
        <div className="max-w-2xl mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            Modular Product Suite
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Every Northstar module is documented in our authoritative product specifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {NORTHSTAR_PRODUCTS.map((prod) => (
            <div
              key={prod.id}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs"
            >
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    {getProductIcon(prod.category)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{prod.name}</h3>
                    <p className="text-xs text-slate-500">{prod.tagline}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {prod.description}
                </p>

                <div className="space-y-1.5 mb-4">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Core Specifications
                  </div>
                  {prod.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {prod.pricingNote ? (
                    <strong className="text-slate-700">{prod.pricingNote}</strong>
                  ) : (
                    <span>Included in: {prod.includedInPlans.join(', ')}</span>
                  )}
                </span>
                <button
                  onClick={() =>
                    onAskSupport(
                      `What are the technical capabilities and requirements for ${prod.name}?`
                    )
                  }
                  className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                >
                  <span>Ask Support</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Feature Comparison Matrix */}
      <div className="pt-8 border-t border-slate-200">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6 font-display">
          Plan Comparison Matrix
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-900">
                  <th className="py-3 px-4 w-1/4">Feature / Specification</th>
                  <th className="py-3 px-4 w-1/4">Starter ($29/mo)</th>
                  <th className="py-3 px-4 w-1/4 bg-blue-50/40 text-blue-900">
                    Professional ($79/mo)
                  </th>
                  <th className="py-3 px-4 w-1/4">Enterprise ($199/mo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">User Seats</td>
                  <td className="py-3 px-4">Up to 15 seats</td>
                  <td className="py-3 px-4 bg-blue-50/20 font-medium">Up to 100 seats</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">Pooled Cloud Storage</td>
                  <td className="py-3 px-4 font-mono">50 GB</td>
                  <td className="py-3 px-4 bg-blue-50/20 font-mono font-medium">1 TB</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">Unlimited Dedicated</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">Northstar Cloud Suite</td>
                  <td className="py-3 px-4"><Check className="w-4 h-4 text-emerald-600" /></td>
                  <td className="py-3 px-4 bg-blue-50/20"><Check className="w-4 h-4 text-emerald-600" /></td>
                  <td className="py-3 px-4"><Check className="w-4 h-4 text-emerald-600" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">Northstar Analytics Pro</td>
                  <td className="py-3 px-4 text-slate-400">Optional add-on ($15/seat)</td>
                  <td className="py-3 px-4 bg-blue-50/20"><Check className="w-4 h-4 text-emerald-600" /></td>
                  <td className="py-3 px-4"><Check className="w-4 h-4 text-emerald-600" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">Enterprise Shield (SOC2, HIPAA, KMS)</td>
                  <td className="py-3 px-4 text-slate-400">&mdash;</td>
                  <td className="py-3 px-4 bg-blue-50/20 text-slate-400">&mdash;</td>
                  <td className="py-3 px-4"><Check className="w-4 h-4 text-emerald-600" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">Support Response SLA</td>
                  <td className="py-3 px-4">24-hour email response</td>
                  <td className="py-3 px-4 bg-blue-50/20 font-medium">4-hour business SLA</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">1-hour critical SLA (24/7)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">SAML 2.0 / Okta SSO</td>
                  <td className="py-3 px-4 text-slate-400">&mdash;</td>
                  <td className="py-3 px-4 bg-blue-50/20 text-slate-400">&mdash;</td>
                  <td className="py-3 px-4"><Check className="w-4 h-4 text-emerald-600" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">REST API & Webhooks</td>
                  <td className="py-3 px-4 text-slate-400">&mdash;</td>
                  <td className="py-3 px-4 bg-blue-50/20 font-medium">Included (300 req/min)</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">Custom Throughput</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pricing FAQs */}
      <div className="pt-8 border-t border-slate-200">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-4 font-display">
          Pricing & Commercial FAQs
        </h2>
        <div className="space-y-3 max-w-4xl">
          {productFaqs.map((faq) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <div
                key={faq.id}
                className="bg-white border border-slate-200 rounded-lg p-4 transition-colors"
              >
                <button
                  onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                  className="w-full flex items-center justify-between text-left text-sm font-semibold text-slate-900 focus:outline-none"
                >
                  <span>{faq.question}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                    <p>{faq.answer}</p>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => onAskSupport(faq.question)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Ask Support Agent to elaborate</span>
                      </button>
                    </div>
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
