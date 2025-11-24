export type SafetyTipCategory =
  | 'Personal Safety'
  | 'Travel'
  | 'Digital Safety'
  | 'Home Security'
  | 'Emergency Prep'
  | 'Community';

export interface SafetyTipArticle {
  id: string;
  title: string;
  category: SafetyTipCategory;
  summary: string;
  body: string[];
  sources?: {label: string; url?: string}[];
  lastUpdated: string;
}

export const safetyTipArticles: SafetyTipArticle[] = [
  {
    id: 'stay-aware-001',
    title: 'Stay aware in unfamiliar areas',
    category: 'Personal Safety',
    summary:
      'Set simple checkpoints, keep one earbud out, and stand near exits so you can react quickly.',
    body: [
      'Share your live location with a trusted contact when you enter a new area.',
      'Walk facing traffic and avoid isolated shortcuts after dark.',
      'Keep valuables spread out (phone in front pocket, cards in hidden sleeve).',
      'Use Safe T Net’s quick SOS gesture to alert faster if something feels off.',
    ],
    sources: [{label: 'UN Women Safe Cities Toolkit'}],
    lastUpdated: '2025-10-02',
  },
  {
    id: 'commuter-002',
    title: 'Safer late-night commutes',
    category: 'Travel',
    summary:
      'Plan the final 500 meters: know a well-lit path, use official taxis, and signal friends on arrival.',
    body: [
      'Before leaving, send your friends your ride details and expected arrival time.',
      'Ask the driver for the emergency contact display; legit taxis are required to show it.',
      'Stand to exit on the curb side, not the road side, when you arrive.',
      'Tap “Share live location” for 15 minutes in Safe T Net until you are indoors.',
    ],
    sources: [{label: 'Mumbai Police commuter advisory'}],
    lastUpdated: '2025-09-21',
  },
  {
    id: 'otp-003',
    title: 'Protect your digital footprint',
    category: 'Digital Safety',
    summary:
      'Enable multi-factor authentication everywhere and treat unknown links as unsafe until proven otherwise.',
    body: [
      'Use different passwords for banking, email, and social accounts. A leak in one should not open all.',
      'Never share OTPs—even with people claiming to be from support or law enforcement.',
      'Review social media privacy every quarter; limit location tagging to trusted circles.',
      'If your phone is lost, lock the SIM immediately and revoke app sessions.',
    ],
    sources: [{label: 'CERT-In advisory'}],
    lastUpdated: '2025-07-14',
  },
  {
    id: 'home-kit-004',
    title: 'Build a rapid-response home kit',
    category: 'Emergency Prep',
    summary:
      'Store essentials where you can reach them in 30 seconds—torch, medical info, power bank, spare keys.',
    body: [
      'Keep a laminated emergency card near the exit with blood types, allergies, and hospital contacts.',
      'Have two independent light sources (torch + rechargeable lamp) and test monthly.',
      'Train family members to trigger SOS and share location using Safe T Net in under 10 seconds.',
      'Add an analog whistle so neighbours can hear you even when power or networks fail.',
    ],
    sources: [
      {label: 'NDMA disaster readiness guide'},
      {label: 'Safe T Net community best practices'},
    ],
    lastUpdated: '2025-08-30',
  },
  {
    id: 'neighbourhood-watch-005',
    title: 'Build safer communities together',
    category: 'Community',
    summary:
      'Create small check-in groups, mark secure spots on the map, and keep an escalation ladder ready.',
    body: [
      'Nominate a verified responder who promises to pick up the phone 24/7.',
      'Host a monthly 15-minute huddle to review new risks in your neighbourhood.',
      'Use trusted circles to log suspicious observations so patterns are visible to everyone.',
      'Map safe shelters (pharmacies, 24x7 stores) in the Live Location map for quick detours.',
    ],
    sources: [{label: 'Safe T Net community experts'}],
    lastUpdated: '2025-09-05',
  },
  {
    id: 'locks-006',
    title: 'Layered home security checklist',
    category: 'Home Security',
    summary:
      'Combine physical barriers with smart alerts: sturdy locks, motion lights, and camera alerts to your phone.',
    body: [
      'Install deadbolt locks on main doors and test them weekly.',
      'Use motion-activated lights at entrances to deter opportunistic intruders.',
      'Set up a shared incident log with neighbours—every suspicious knock gets recorded.',
      'Keep emergency numbers (police, ambulance, building guard) saved and printed near exits.',
    ],
    sources: [{label: 'Ministry of Housing security advisory'}],
    lastUpdated: '2025-06-18',
  },
];

export const safetyTipCategories: SafetyTipCategory[] = [
  'Personal Safety',
  'Travel',
  'Digital Safety',
  'Home Security',
  'Emergency Prep',
  'Community',
];


