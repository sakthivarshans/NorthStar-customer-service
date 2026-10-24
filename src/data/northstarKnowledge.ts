import { FAQItem, ProductItem, ProductPlan, SourceCitation } from '../types';

/**
 * Static content derived ONLY from the approved master knowledge base
 * (backend/data/knowledge/northstar_master_knowledge_base.md, v1.0, 2026-10-23).
 * Anything the KB does not specify is shown as "Not specified" — never guessed.
 * Fictional demonstration data: replace with approved company information before production.
 */

export const SUPPORT_EMAIL = 'support@example.com';
export const COMPANY_NAME = 'Northstar Workspace';
export const KB_TITLE = 'Northstar Workspace Master Knowledge Base';
export const KB_VERSION = '1.0';
export const KB_UPDATED = '2026-10-23';
export const NOT_SPECIFIED = 'Not specified';

export const NORTHSTAR_PLANS: ProductPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    targetAudience: 'Evaluation and small-scale use',
    monthlyPrice: 0,
    annualPricePerMonth: null,
    billingPeriod: 'per user / month',
    description: 'Documented limit: a maximum of two active projects.',
    features: ['Maximum of two active projects'],
    limits: { seats: NOT_SPECIFIED, storage: NOT_SPECIFIED, supportSla: NOT_SPECIFIED, apiRateLimit: NOT_SPECIFIED }
  },
  {
    id: 'professional',
    name: 'Professional',
    targetAudience: 'Teams coordinating projects and routine work',
    monthlyPrice: 12,
    annualPricePerMonth: null,
    billingPeriod: 'per user / month, billed monthly',
    description: 'Paid per-user plan for routine team work.',
    features: ['$12 per user per month, billed monthly'],
    limits: { seats: NOT_SPECIFIED, storage: NOT_SPECIFIED, supportSla: NOT_SPECIFIED, apiRateLimit: NOT_SPECIFIED },
    highlighted: true
  },
  {
    id: 'business',
    name: 'Business',
    targetAudience: 'Organizations needing broader coordination and administration',
    monthlyPrice: 25,
    annualPricePerMonth: null,
    billingPeriod: 'per user / month, billed monthly',
    description: 'Exact feature differences from Professional must be checked before purchase.',
    features: ['$25 per user per month, billed monthly'],
    limits: { seats: NOT_SPECIFIED, storage: NOT_SPECIFIED, supportSla: NOT_SPECIFIED, apiRateLimit: NOT_SPECIFIED }
  }
];

export const NORTHSTAR_PRODUCTS: ProductItem[] = [
  {
    id: 'workspace',
    name: 'Northstar Workspace',
    tagline: 'Team workspace, project tracking, workflow automation, and reporting.',
    description:
      'Helps teams organize projects, assign work, track progress, automate repetitive workflows, and review reports.',
    category: 'core',
    features: ['Project organization', 'Task assignment', 'Progress tracking'],
    includedInPlans: ['Starter', 'Professional', 'Business'],
    pricingNote: 'Plan prices above'
  },
  {
    id: 'automate',
    name: 'Automate add-on',
    tagline: 'Adds workflow-automation capability.',
    description:
      'Supported triggers, actions, integrations, execution quotas and error logs are not specified in the knowledge base.',
    category: 'collaboration',
    features: ['Workflow automation', 'Priced per workspace, not per user'],
    includedInPlans: [],
    pricingNote: '$15 per workspace per month'
  },
  {
    id: 'insights',
    name: 'Advanced Insights add-on',
    tagline: 'Adds advanced reporting and insight capabilities.',
    description:
      'Report catalog, metric definitions, refresh frequency and export formats are not specified in the knowledge base.',
    category: 'intelligence',
    features: ['Advanced reporting', 'Priced per workspace, not per user'],
    includedInPlans: [],
    pricingNote: '$20 per workspace per month'
  }
];

export const PRICING_EXAMPLES = [
  '5 Professional users for one month: 5 × $12 = $60',
  '10 Business users for one month: 10 × $25 = $250',
  '5 Professional users + Automate: (5 × $12) + $15 = $75',
  '10 Business users + Advanced Insights: (10 × $25) + $20 = $270',
  '5 Professional users + both add-ons: (5 × $12) + $15 + $20 = $95'
];

export const NORTHSTAR_POLICIES = {
  refunds: 'Refund eligibility and processing timelines are not specified. Contact support.',
  cancellation: 'Cancellation steps and effective date are not specified. Review the confirmation screen or contact support.',
  support: `Support email: ${SUPPORT_EMAIL} (fictional demo address). Support hours and response times are not specified.`
};

const faq = (
  id: string,
  category: FAQItem['category'],
  question: string,
  answer: string,
  section: string
): FAQItem => ({ id, category, question, answer, relatedSourceId: section });

export const APPROVED_FAQS: FAQItem[] = [
  faq('faq-1', 'products', 'What is Northstar Workspace?', 'A fictional cloud-based work-management product for project organization, task assignment, progress tracking, automation, and reporting.', '2. Company overview'),
  faq('faq-2', 'products', 'How much is Starter?', '$0 per user per month, with a maximum of two active projects.', '3. Product catalog and pricing'),
  faq('faq-3', 'products', 'How much is Professional?', '$12 per user per month, billed monthly.', '3. Product catalog and pricing'),
  faq('faq-4', 'products', 'How much is Business?', '$25 per user per month, billed monthly. Exact feature entitlements (such as SSO) are not specified, so do not assume them from the plan name.', '3. Product catalog and pricing'),
  faq('faq-5', 'products', 'How much are the add-ons?', 'Automate is $15 per workspace per month and Advanced Insights is $20 per workspace per month. Both are priced per workspace, not per user.', '3. Product catalog and pricing'),
  faq('faq-6', 'billing', 'Is annual billing available?', 'Not specified in the knowledge base. Contact support for current offers.', '5. Billing and payments'),
  faq('faq-7', 'billing', 'Are student or nonprofit discounts available?', 'No such discount is documented. Contact support to confirm any current offers.', '5. Billing and payments'),
  faq('faq-8', 'billing', 'Which payment methods are accepted?', 'Not specified. Check the billing area or contact support.', '5. Billing and payments'),
  faq('faq-9', 'billing', 'Are taxes included?', 'Not specified. Check the final billing screen or invoice.', '5. Billing and payments'),
  faq('faq-10', 'policies', 'What is the refund policy?', `Eligibility and timelines are not specified. Contact ${SUPPORT_EMAIL} with the charge date, amount, account email, and reason. Do not send full card details.`, '6. Cancellation, refunds, and credits'),
  faq('faq-11', 'policies', 'Can I cancel at any time?', `The cancellation process and effective date are not specified. Review the product's confirmation screen or contact ${SUPPORT_EMAIL}.`, '6. Cancellation, refunds, and credits'),
  faq('faq-12', 'policies', 'How long does a refund take?', 'The timeline is not specified. Support must confirm the applicable status and timeline.', '6. Cancellation, refunds, and credits'),
  faq('faq-13', 'policies', 'Does Northstar guarantee uptime?', 'No uptime guarantee is established in the knowledge base.', '2. Company overview'),
  faq('faq-14', 'policies', 'Is Northstar SOC 2 or ISO certified?', 'No certification is established by the knowledge base.', '2. Company overview'),
  faq('faq-15', 'policies', 'Where is data stored and how long is it retained?', 'Hosting locations and retention periods are not specified.', '9. Security, privacy, and data handling'),
  faq('faq-16', 'account', 'Does Northstar support SSO or mobile apps?', 'Availability is not specified.', '7. Product features and limitations'),
  faq('faq-17', 'account', 'Which integrations are supported, and can I export data?', 'The integration catalog and supported export formats are not defined. Please do not guess; confirm with support.', '7. Product features and limitations'),
  faq('faq-18', 'account', 'Who leads customer support?', 'Sofia Alvarez is listed as the fictional Customer Support Lead.', '10. Fictional employee directory'),
  faq('faq-19', 'account', 'What is the support email?', `${SUPPORT_EMAIL}, a fictional demo address, not a live support channel.`, '13. Frequently asked questions')
];

/** Used only by offline demo mode: FAQ entries exposed as citable chunks. */
export const KNOWLEDGE_BASE_CHUNKS: SourceCitation[] = APPROVED_FAQS.map((f, i) => ({
  id: `demo-${f.id}`,
  documentTitle: KB_TITLE,
  documentType: 'md',
  section: f.relatedSourceId || 'FAQ',
  excerpt: `${f.question} ${f.answer}`,
  relevanceScore: 0.8,
  lastUpdated: KB_UPDATED,
  chunkId: `demo-chunk-${i + 1}`
}));
