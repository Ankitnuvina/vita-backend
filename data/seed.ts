export interface Article {
  id: number
  cat: string
  categoryLabel: string
  categoryColor: string
  title: string
  author: string
  date: string
  readTime: string
  imageUrl: string
  excerpt: string
  isPremium: boolean
  slug: string
}

export interface Podcast {
  id: number
  episode: string
  category: string
  title: string
  guest: string
  duration: string
  date: string
  imageUrl: string
}

export interface Expert {
  id: number
  name: string
  role: string
  credentials: string
  articleCount: number
  imageUrl: string
}

export interface WellnessTip {
  id: number
  icon: string
  colors: { bg: string; border: string }
  title: string
  text: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  monthlyPrice: string
  annualPrice: string
  tagline: string
  features: string[]
  ctaLabel: string
  isPopular: boolean
}

export const seedArticles: Article[] = [
  {
    id: 1,
    cat: 'm',
    categoryLabel: 'Mental Health',
    categoryColor: '#4A8DB8',
    title: 'The Neuroscience of Micro-Stress: Why Small Moments Burn You Out',
    author: 'Dr. Sarah Okafor',
    date: 'Apr 19',
    readTime: '8 min',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=700&q=80',
    excerpt: 'Research reveals how micro-stressors flood your body with cortisol — and interventions that work.',
    isPremium: false,
    slug: 'neuroscience-micro-stress',
  },
  {
    id: 2,
    cat: 'n',
    categoryLabel: 'Nutrition',
    categoryColor: '#C47845',
    title: 'Fermented Foods & the Gut-Brain Axis: 2026 Research',
    author: 'Dr. James Liu',
    date: 'Apr 17',
    readTime: '10 min',
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&q=80',
    excerpt: 'A landmark meta-analysis of 48 studies settles the fermented foods debate.',
    isPremium: true,
    slug: 'fermented-foods-gut-brain',
  },
  {
    id: 3,
    cat: 'f',
    categoryLabel: 'Fitness',
    categoryColor: '#5FA876',
    title: 'Zone 2 Training: The Longevity Protocol Rewriting Exercise Science',
    author: 'Coach Maya Rivera',
    date: 'Apr 15',
    readTime: '6 min',
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80',
    excerpt: 'Elite athletes and longevity researchers agree: the magic happens at lower intensity.',
    isPremium: false,
    slug: 'zone-2-training-longevity',
  },
  {
    id: 4,
    cat: 'mi',
    categoryLabel: 'Mindfulness',
    categoryColor: '#8A6FC7',
    title: 'The 14-Day Sleep Architecture Reset Protocol',
    author: 'Dr. Priya Nair',
    date: 'Apr 14',
    readTime: '5 min',
    imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&q=80',
    excerpt: 'Evidence-based steps to restructure your circadian rhythm in two weeks.',
    isPremium: true,
    slug: 'sleep-architecture-reset',
  },
  {
    id: 5,
    cat: 'l',
    categoryLabel: 'Longevity',
    categoryColor: '#A8823C',
    title: 'NAD+ Precursors in 2026: Separating Signal from Noise',
    author: 'Dr. Alex Chen',
    date: 'Apr 12',
    readTime: '12 min',
    imageUrl: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=500&q=80',
    excerpt: 'A sober look at whether NAD+ supplements actually extend healthspan.',
    isPremium: true,
    slug: 'nad-precursors-2026',
  },
]

export const seedPodcasts: Podcast[] = [
  {
    id: 1,
    episode: 'EP 92',
    category: 'Mental Health',
    title: 'Your Nervous System on Chronic Stress',
    guest: 'Dr. Rachel Torres',
    duration: '1h 08m',
    date: 'Apr 18',
    imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&q=80',
  },
  {
    id: 2,
    episode: 'EP 91',
    category: 'Nutrition',
    title: 'The Anti-Inflammatory Diet: 30-Day Guide',
    guest: 'Dr. Mark Chen',
    duration: '54m',
    date: 'Apr 11',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80',
  },
  {
    id: 3,
    episode: 'EP 90',
    category: 'Longevity',
    title: 'Biohacking 2026: What Actually Has Evidence',
    guest: 'Dr. Peter Lim',
    duration: '1h 26m',
    date: 'Apr 4',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&q=80',
  },
  {
    id: 4,
    episode: 'EP 89',
    category: 'Mindfulness',
    title: 'Breathwork & the Science of Resilience',
    guest: 'Dr. Sara Wells',
    duration: '1h 10m',
    date: 'Mar 28',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&q=80',
  },
]

export const seedExperts: Expert[] = [
  {
    id: 1,
    name: 'Dr. Sarah Okafor',
    role: 'Clinical Psychologist',
    credentials: 'PhD Columbia · APA Fellow',
    articleCount: 28,
    imageUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&q=80',
  },
  {
    id: 2,
    name: 'Dr. James Liu',
    role: 'Gastroenterologist',
    credentials: 'MD Johns Hopkins · Gut-Brain Lab',
    articleCount: 21,
    imageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&q=80',
  },
  {
    id: 3,
    name: 'Dr. Priya Nair',
    role: 'Sleep Specialist',
    credentials: 'MD Stanford · Sleep Clinic Director',
    articleCount: 34,
    imageUrl: 'https://images.unsplash.com/photo-1591084728795-1149f32d9866?w=200&q=80',
  },
  {
    id: 4,
    name: 'Coach Maya Rivera',
    role: 'Sports Physiologist',
    credentials: 'MSc Kinesiology · Olympic Consultant',
    articleCount: 17,
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80',
  },
]

export const seedTips: WellnessTip[] = [
  {
    id: 1,
    icon: '🌿',
    colors: { bg: '#F0F7F2', border: '#D6EDE0' },
    title: 'Gut Health Today',
    text: 'Aim for 30 distinct plant foods this week. Microbiome diversity is the #1 modifiable health factor.',
  },
  {
    id: 2,
    icon: '🧠',
    colors: { bg: '#EFF6FB', border: '#C8DFF2' },
    title: 'Cognitive Clarity',
    text: '5-min brain dump journaling before meetings clears working memory and reduces decision fatigue by ~23%.',
  },
  {
    id: 3,
    icon: '⚡',
    colors: { bg: '#FDF3EE', border: '#F5D9C5' },
    title: 'Movement Snack',
    text: 'A 2-min walk after meals cuts post-meal blood glucose spikes by up to 30%.',
  },
  {
    id: 4,
    icon: '🌙',
    colors: { bg: '#F5F0FF', border: '#E0D6FF' },
    title: 'Sleep Priming',
    text: 'Set thermostat to 65–68°F before bed. Core temp must drop 2°F to initiate deep sleep.',
  },
]

export const seedPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'FREE',
    monthlyPrice: '$0',
    annualPrice: '$0',
    tagline: 'Get started',
    features: ['5 articles/month', 'Weekly newsletter', 'Basic wellness tips', 'Community access'],
    ctaLabel: 'Start Free',
    isPopular: false,
  },
  {
    id: 'wellness-plus',
    name: 'WELLNESS+',
    monthlyPrice: '$9',
    annualPrice: '$86',
    tagline: 'Most popular',
    features: [
      'Unlimited articles',
      'Full podcast library',
      'AI Health Assistant',
      'Expert Q&A sessions',
      'Personalised reading list',
      'Ad-free experience',
    ],
    ctaLabel: 'Start 7-Day Free Trial',
    isPopular: true,
  },
  {
    id: 'pro',
    name: 'PRO HEALTH',
    monthlyPrice: '$19',
    annualPrice: '$182',
    tagline: 'For serious optimisers',
    features: [
      'Everything in Wellness+',
      'Unlimited AI queries',
      '1-on-1 expert consults',
      'Research reports',
      'Live webinars',
      'Priority support',
    ],
    ctaLabel: 'Get Pro Access',
    isPopular: false,
  },
]
