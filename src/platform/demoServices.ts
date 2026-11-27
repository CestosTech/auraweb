import { Row } from './model';

/// Local preview listings enabled only with VITE_DEMO_SERVICES=true.
export const demoServices: Row[] = [
  {
    id: 'demo-service-carpenter', demo: true, title: 'Custom furniture and home repairs', category: 'Carpenter',
    description: 'Furniture repairs, shelves, doors and made-to-measure pieces.',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1000&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1000&auto=format&fit=crop'],
    county: 'Montserrado', locality: 'Sinkor', pricingType: 'hourly', rateUsd: 18, rating: 0, reviewsCount: 0,
    provider: { name: 'Demo provider · Samuel K.', photoUrl: '', hasBusiness: true, businessName: 'Sinkor Woodcraft · Demo', categories: ['Carpenter'] },
  },
  {
    id: 'demo-service-electrician', demo: true, title: 'Home wiring and backup power', category: 'Electrician',
    description: 'Socket repairs, lighting, safe wiring and generator connections.',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&auto=format&fit=crop'],
    county: 'Montserrado', locality: 'Congo Town', pricingType: 'fixed', rateUsd: 35, rating: 0, reviewsCount: 0,
    provider: { name: 'Demo provider · Moses T.', photoUrl: '', hasBusiness: false, categories: ['Electrician', 'Generator Repair'] },
  },
  {
    id: 'demo-service-plumber', demo: true, title: 'Leaks, faucets and pipe repair', category: 'Plumber',
    description: 'Quick help with leaking pipes, blocked drains and bathroom fittings.',
    image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1000&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1000&auto=format&fit=crop'],
    county: 'Montserrado', locality: 'Paynesville', pricingType: 'hourly', rateUsd: 14, rating: 0, reviewsCount: 0,
    provider: { name: 'Demo provider · Mary K.', photoUrl: '', hasBusiness: true, businessName: 'ClearFlow Plumbing · Demo', categories: ['Plumber'] },
  },
  {
    id: 'demo-service-mechanic', demo: true, title: 'Mobile car diagnostics and service', category: 'Mechanic',
    description: 'Basic diagnostics, battery checks and routine vehicle servicing.',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1000&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1000&auto=format&fit=crop'],
    county: 'Montserrado', locality: 'Monrovia', pricingType: 'fixed', rateUsd: 25, rating: 0, reviewsCount: 0,
    provider: { name: 'Demo provider · James K.', photoUrl: '', hasBusiness: true, businessName: 'Monrovia Auto Care · Demo', categories: ['Mechanic', 'Auto Body Repair'] },
  },
];
