import { Scheme } from './types';

const defaultSchemes: Scheme[] = [
  {
    id: 'gold-savings',
    name: 'Gold Savings Plan',
    duration: 11,
    monthlyAmount: 3000,
    maturityValue: 33000,
    members: 0,
    description: 'Save monthly and get a beautiful gold gift box at maturity with zero making charges.',
    category: 'Popular',
    tagline: 'Pure Savings, Pure Gold'
  },
  {
    id: 'silver-savings',
    name: 'Silver Classic Plan',
    duration: 11,
    monthlyAmount: 1000,
    maturityValue: 11000,
    members: 0,
    description: 'Affordable monthly savings for silver jewelry and coins.',
    category: 'Short Term',
    tagline: 'Start Small, Dream Big'
  }
];

const getStoredSchemes = (): Scheme[] => {
  return defaultSchemes;
};

export const SCHEMES: Scheme[] = getStoredSchemes();
