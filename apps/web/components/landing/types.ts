export type PageTheme = 'indigo' | 'teal' | 'amber' | 'purple' | 'dark';

export type SectionItem = {
  icon?: string;
  title: string;
  body: string;
  tag?: string;
  badge?: string;
  skillColor?: 'read' | 'listen' | 'speak' | 'write';
};

export type LandingSection = {
  id: string;
  badge: string;
  heading: string;
  body?: string;
  layout: 'grid2' | 'grid3' | 'list' | 'steps' | 'ps' | 'audience';
  alt?: boolean;
  items: SectionItem[];
};

export type PricingTier = {
  name: string;
  price: string;
  per: string;
  desc: string;
  features: string[];
  cta: string;
  featured: boolean;
};

export type Testimonial = {
  quote: string;
  name: string;
  detail: string;
  stat?: string;
  initials: string;
};

export type LandingPageConfig = {
  pageKey: string;
  theme: PageTheme;
  showLogo: boolean;
  nav: { links: string[]; cta: string };
  hero: {
    badge: string;
    title: string;
    titleEm: string;
    body: string;
    ctaPrimary: string;
    ctaSecondary?: string;
    socialProof?: string;
    socialCount?: string;
  };
  stats: Array<{ value: string; label: string }>;
  sections: LandingSection[];
  testimonials: { badge: string; heading: string; items: Testimonial[] };
  pricing: {
    badge: string;
    heading: string;
    tiers: PricingTier[];
  };
  cta: { heading: string; headingEm?: string; body: string; button: string; button2?: string };
};
