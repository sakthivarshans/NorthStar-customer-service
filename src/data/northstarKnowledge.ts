import { FAQItem, ProductItem, ProductPlan, SourceCitation } from '../types';

/**
 * Single authoritative source of truth for Northstar Technologies Inc.
 * Covers product catalog, pricing matrices, cancellation and refund policies,
 * SLA levels, and grounded knowledge base chunks for retrieval.
 */

export const NORTHSTAR_PRODUCTS: ProductItem[] = [
  {
    id: 'cloud-suite',
    name: 'Northstar Cloud Suite',
    tagline: 'Unified workflow automation and real-time document collaboration.',
    description: 'Enterprise operations hub connecting documents, task workflows, and cross-functional teams with live co-authoring, version rollback, and verified audit trails.',
    category: 'core',
    features: [
      'Real-time collaborative editing with granular permissions',
      'Automated multi-step approval pipelines and triggers',
      'Full compliance audit trail with immutable change log',
      '99.95% uptime SLA backed by enterprise credit policy',
      'Integration with Google Workspace, Slack, and Microsoft 365'
    ],
    includedInPlans: ['starter', 'professional', 'enterprise']
  },
  {
    id: 'analytics-pro',
    name: 'Northstar Analytics Pro',
    tagline: 'Operational intelligence and automated anomaly detection.',
    description: 'Real-time telemetry and KPI dashboarding platform providing executive rollups, pipeline forecasting, and automated root-cause alerts.',
    category: 'intelligence',
    features: [
      'Custom drag-and-drop KPI dashboards with scheduled PDF/Slack digest delivery',
      'Automated metric anomaly detection with threshold alerts',
      'SQL query console and pre-built analytical templates',
      'Historical trend projection and capacity planning models',
      'Export to CSV, Parquet, and live BI connector feeds'
    ],
    includedInPlans: ['professional', 'enterprise'],
    pricingNote: 'Available as an add-on for Starter at $15/seat/month'
  },
  {
    id: 'team-sync',
    name: 'Northstar Team Sync',
    tagline: 'Team presence, threaded messaging, and smart calendar sync.',
    description: 'Instant collaboration channel supporting focused thread branching, team availability signals, and deep calendar coordination.',
    category: 'collaboration',
    features: [
      'Threaded messaging with focused focus modes and mute rules',
      'Real-time availability and smart timezone scheduling',
      'Native video conferencing integrations (Zoom, Google Meet, Teams)',
      'Cross-organization guest channels with restricted permissions',
      'Searchable message history with file preview'
    ],
    includedInPlans: ['starter', 'professional', 'enterprise']
  },
  {
    id: 'enterprise-shield',
    name: 'Northstar Enterprise Shield',
    tagline: 'Dedicated tenant isolation, KMS encryption, and SOC 2 Type II compliance.',
    description: 'Hardened security and governance layer for regulated industries requiring data sovereignty, customer-managed keys, and strict access controls.',
    category: 'security',
    features: [
      'Customer-Managed Encryption Keys (CMEK / KMS)',
      'SOC 2 Type II, ISO 27001, and HIPAA BAA compliance documentation',
      'Role-Based Access Control (RBAC) with SCIM user provisioning',
      'Automated Data Loss Prevention (DLP) filters for sensitive credentials',
      'Dedicated single-tenant infrastructure with geo-fenced hosting'
    ],
    includedInPlans: ['enterprise'],
    pricingNote: 'Exclusive to Enterprise plan'
  }
];

export const NORTHSTAR_PLANS: ProductPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    targetAudience: 'For early-stage teams & fast-moving startups',
    monthlyPrice: 29,
    annualPricePerMonth: 24, // $288 billed annually (approx 17% savings)
    billingPeriod: 'per user / month',
    description: 'Essential collaboration tools and cloud storage for emerging teams getting started with structured operations.',
    features: [
      'Up to 15 team members',
      '50 GB pooled cloud storage',
      'Northstar Cloud Suite & Team Sync included',
      'Standard email support (24-hour response SLA)',
      'Standard 30-day activity history',
      'Two-factor authentication (2FA)'
    ],
    limits: {
      seats: 'Up to 15 seats',
      storage: '50 GB pooled',
      supportSla: '24-hour email response SLA',
      apiRateLimit: '60 requests / minute'
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    targetAudience: 'For scaling companies needing operational analytics',
    monthlyPrice: 79,
    annualPricePerMonth: 65, // $780 billed annually (approx 18% savings)
    billingPeriod: 'per user / month',
    description: 'Full operational suite including advanced analytics, larger storage pools, and expedited technical support.',
    highlighted: true,
    features: [
      'Up to 100 team members',
      '1 TB pooled cloud storage',
      'Cloud Suite, Team Sync & Analytics Pro included',
      'Priority support with 4-hour response SLA (business hours)',
      'Unlimited activity history and audit logs',
      'Custom webhook integrations & REST API access',
      'Advanced role-based sharing permissions'
    ],
    limits: {
      seats: 'Up to 100 seats',
      storage: '1 TB pooled',
      supportSla: '4-hour response SLA (Mon-Fri 8am-8pm EST)',
      apiRateLimit: '300 requests / minute'
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    targetAudience: 'For organizations with custom governance & security needs',
    monthlyPrice: 199,
    annualPricePerMonth: 165,
    billingPeriod: 'per user / month (or custom annual contract)',
    description: 'Maximum scale, dedicated customer engineering, custom SLA guarantees, and enterprise compliance certification.',
    features: [
      'Unlimited team members',
      'Unlimited dedicated cloud storage',
      'All products including Northstar Enterprise Shield',
      '24/7 dedicated account manager and solution architect',
      '1-hour response SLA for critical (P1) incidents',
      'Custom SAML 2.0 / Okta / Azure AD Single Sign-On (SSO)',
      'HIPAA BAA agreement & custom security reviews'
    ],
    limits: {
      seats: 'Unlimited',
      storage: 'Unlimited dedicated',
      supportSla: '1-hour critical response SLA (24/7/365)',
      apiRateLimit: 'Custom negotiated throughput'
    }
  }
];

export const NORTHSTAR_POLICIES = {
  cancellation: {
    title: 'Subscription Cancellation Policy',
    summary: 'Customers may cancel their subscription at any time directly through the Billing portal.',
    steps: [
      'Log into your Northstar account as an Organization Administrator.',
      'Navigate to Settings > Organization > Billing & Subscriptions.',
      'Click "Manage Subscription" and select "Cancel Plan".',
      'Confirm the cancellation reason.'
    ],
    terms: 'Upon cancellation, access continues unhindered until the end of the current paid billing cycle. No further recurring charges will be incurred. Accounts will transition to a read-only archive state for 30 days before data retention protocols apply.'
  },
  refunds: {
    title: 'Refund Policy & Guarantee',
    summary: 'Clear 14-day money-back guarantee on annual contracts; discretionary renewal review for monthly plans.',
    terms: [
      'Annual Plans: Eligible for a full 100% refund within 14 days of original purchase or initial renewal date, with no cancellation fees.',
      'Monthly Plans: Billed charges are non-refundable once the billing month commences. However, if a cancellation was intended before renewal, requests submitted within 48 hours of billing will receive discretionary service credit or refund review.',
      'Usage Overages & Add-ons: Add-ons (e.g. extra storage blocks or Analytics Pro for Starter) are non-refundable once provisioned.'
    ]
  },
  humanSupport: {
    title: 'Human Support & Escalation Channels',
    channels: [
      {
        tier: 'Enterprise Support',
        availability: '24 hours / 7 days a week, 365 days a year',
        sla: '1-hour guaranteed initial response for critical issues',
        contact: 'Dedicated direct emergency hotline & assigned Slack/Teams connect channel'
      },
      {
        tier: 'Professional Support',
        availability: 'Monday through Friday, 8:00 AM – 8:00 PM EST',
        sla: '4-hour guaranteed initial response',
        contact: 'priority-support@northstar.example.com'
      },
      {
        tier: 'Starter Support',
        availability: 'Monday through Friday, 9:00 AM – 5:00 PM EST',
        sla: '24-hour response window',
        contact: 'support@northstar.example.com'
      }
    ]
  }
};

export const APPROVED_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'products',
    question: 'What products does Northstar offer?',
    answer: 'Northstar offers four integrated enterprise products: 1) Northstar Cloud Suite for workflow and document collaboration, 2) Northstar Analytics Pro for business intelligence and anomaly alerts, 3) Northstar Team Sync for team chat, presence, and calendar sync, and 4) Northstar Enterprise Shield for dedicated KMS encryption, tenant isolation, and SOC 2/HIPAA compliance.',
    relatedSourceId: 'doc-product-catalog'
  },
  {
    id: 'faq-2',
    category: 'billing',
    question: 'How much does the Professional plan cost?',
    answer: 'The Professional plan costs $79 per user per month when billed monthly, or $65 per user per month ($780/year) when billed annually, which provides an 18% savings. It supports up to 100 team members and includes Cloud Suite, Team Sync, and Analytics Pro with a 4-hour support SLA.',
    relatedSourceId: 'doc-pricing-guide'
  },
  {
    id: 'faq-3',
    category: 'billing',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes. Organization administrators can cancel their subscription at any time under Settings > Organization > Billing & Subscriptions > Cancel Plan. Your access continues until the end of your prepaid billing period, and no subsequent charges will be made.',
    relatedSourceId: 'doc-cancellation-policy'
  },
  {
    id: 'faq-4',
    category: 'billing',
    question: 'What is your refund policy?',
    answer: 'All annual subscriptions carry a 14-day 100% money-back guarantee from the initial purchase date. Monthly subscriptions are non-refundable once billed, though support can issue discretionary credits if requested within 48 hours of billing in case of renewal errors.',
    relatedSourceId: 'doc-refund-policy'
  },
  {
    id: 'faq-5',
    category: 'products',
    question: 'Which plan is right for my business?',
    answer: 'Starter ($29/user/mo) is designed for teams under 15 seeking unified documents and chat. Professional ($79/user/mo) is ideal for growing teams up to 100 needing Analytics Pro and 4-hour support SLA. Enterprise ($199/user/mo) is required for compliance (SOC 2, HIPAA), dedicated KMS keys, SAML SSO, and 24/7 dedicated support.',
    relatedSourceId: 'doc-pricing-guide'
  },
  {
    id: 'faq-6',
    category: 'account',
    question: 'How do I contact human support?',
    answer: 'You can reach human support anytime by clicking the "Contact Human Support" button in the support portal, emailing support@northstar.example.com (or priority-support@northstar.example.com for Professional), or calling the dedicated Enterprise emergency hotline if you are on an Enterprise agreement.',
    relatedSourceId: 'doc-human-support-sla'
  },
  {
    id: 'faq-7',
    category: 'account',
    question: 'Is Northstar SOC 2 and HIPAA compliant?',
    answer: 'Yes. Northstar Enterprise Shield provides full SOC 2 Type II audit reports, ISO 27001 certification, and signed HIPAA Business Associate Agreements (BAAs) for organizations handling Protected Health Information.',
    relatedSourceId: 'doc-security-compliance'
  },
  {
    id: 'faq-8',
    category: 'policies',
    question: 'What happens to our company data if we cancel?',
    answer: 'Following cancellation, your data enters a 30-day read-only grace period during which administrators can export full backups (JSON, CSV, and raw files). After 30 days, all customer data is permanently and irreversibly purged from production storage in accordance with our data retention policy.',
    relatedSourceId: 'doc-cancellation-policy'
  }
];

/**
 * Verified knowledge base document chunks used for RAG grounding and citations.
 */
export const KNOWLEDGE_BASE_CHUNKS: SourceCitation[] = [
  {
    id: 'src-prod-suite',
    documentTitle: 'Northstar Product Specifications & Core Modules',
    documentType: 'pdf',
    section: 'Section 2.1: Cloud Suite Architecture',
    excerpt: 'Northstar Cloud Suite serves as the primary collaboration hub, offering real-time co-authoring, automated approval workflows, and an immutable compliance audit trail. It guarantees 99.95% availability SLA and integrates seamlessly with Google Workspace, Slack, and Microsoft 365.',
    relevanceScore: 0.94,
    lastUpdated: '2026-09-15',
    chunkId: 'chk-101'
  },
  {
    id: 'src-prod-analytics',
    documentTitle: 'Northstar Product Specifications & Core Modules',
    documentType: 'pdf',
    section: 'Section 3.4: Analytics Pro & KPI Telemetry',
    excerpt: 'Northstar Analytics Pro delivers real-time business telemetry, automated anomaly alerts, and customizable dashboard widgets. It is bundled into the Professional and Enterprise plans, or purchasable as an optional add-on for Starter accounts at $15/seat/month.',
    relevanceScore: 0.91,
    lastUpdated: '2026-09-15',
    chunkId: 'chk-102'
  },
  {
    id: 'src-prod-security',
    documentTitle: 'Enterprise Security, Compliance & Shield Whitepaper',
    documentType: 'pdf',
    section: 'Section 1.2: Tenant Isolation & Key Management',
    excerpt: 'Northstar Enterprise Shield provides customer-managed encryption keys (CMEK), SOC 2 Type II attestation, ISO 27001 certification, and HIPAA BAA agreements. Exclusive to the Enterprise tier, it includes role-based access control (RBAC), SCIM provisioning, and automated DLP filters.',
    relevanceScore: 0.96,
    lastUpdated: '2026-10-01',
    chunkId: 'chk-103'
  },
  {
    id: 'src-pricing-starter',
    documentTitle: 'Official Commercial Pricing & Tier Matrix 2026',
    documentType: 'md',
    section: 'Tier 1: Starter Subscription Schedule',
    excerpt: 'Starter tier is priced at $29/seat/month on monthly billing, or $24/seat/month ($288/year) billed annually. It includes up to 15 team seats, 50 GB pooled cloud storage, Northstar Cloud Suite, and Team Sync. Standard email support response time is within 24 hours.',
    relevanceScore: 0.95,
    lastUpdated: '2026-10-10',
    chunkId: 'chk-201'
  },
  {
    id: 'src-pricing-pro',
    documentTitle: 'Official Commercial Pricing & Tier Matrix 2026',
    documentType: 'md',
    section: 'Tier 2: Professional Subscription Schedule',
    excerpt: 'Professional tier is priced at $79/seat/month on monthly billing, or $65/seat/month ($780/year) billed annually (~18% discount). It accommodates up to 100 team seats, includes 1 TB pooled storage, Analytics Pro, and priority support with a 4-hour response SLA during business hours (Mon-Fri 8am-8pm EST).',
    relevanceScore: 0.98,
    lastUpdated: '2026-10-10',
    chunkId: 'chk-202'
  },
  {
    id: 'src-pricing-enterprise',
    documentTitle: 'Official Commercial Pricing & Tier Matrix 2026',
    documentType: 'md',
    section: 'Tier 3: Enterprise Custom Agreement',
    excerpt: 'Enterprise tier is listed at $199/seat/month or custom negotiated annual contract with volume discount tiers starting at 250+ seats. It features unlimited seats, unlimited dedicated storage, Enterprise Shield, 24/7 dedicated account management, and a 1-hour critical response SLA.',
    relevanceScore: 0.93,
    lastUpdated: '2026-10-10',
    chunkId: 'chk-203'
  },
  {
    id: 'src-policy-cancel',
    documentTitle: 'Master Customer Agreement & Terms of Service',
    documentType: 'pdf',
    section: 'Article 8: Term, Renewal & Termination',
    excerpt: 'Customers may cancel subscriptions at any time via Settings > Organization > Billing & Subscriptions. Cancellation halts automatic renewal at the close of the current paid billing cycle. No early cancellation penalties apply, and service remains active through the prepaid period.',
    relevanceScore: 0.96,
    lastUpdated: '2026-08-20',
    chunkId: 'chk-301'
  },
  {
    id: 'src-policy-refund',
    documentTitle: 'Master Customer Agreement & Terms of Service',
    documentType: 'pdf',
    section: 'Article 9: Billing Guarantees & Refund Terms',
    excerpt: 'Annual subscription purchases are protected by a 14-day 100% money-back guarantee from initial purchase. Monthly billing cycles are non-refundable once charged; however, accidental renewal requests submitted within 48 hours are eligible for discretionary billing credits upon review.',
    relevanceScore: 0.97,
    lastUpdated: '2026-08-20',
    chunkId: 'chk-302'
  },
  {
    id: 'src-support-sla',
    documentTitle: 'Global Support Operations & Incident Escalation SLA',
    documentType: 'txt',
    section: 'Schedule A: Incident Response Times by Tier',
    excerpt: 'Emergency human escalation protocol: Enterprise customers enjoy 24/7 access with 1-hour initial response for P1 critical issues. Professional customers receive priority response within 4 hours (Mon-Fri 8am-8pm EST). Starter accounts receive standard email support within 24 hours. Contact: support@northstar.example.com.',
    relevanceScore: 0.94,
    lastUpdated: '2026-09-01',
    chunkId: 'chk-401'
  }
];
