export interface Scheme {
  id: string;
  name: string;
  duration: number;
  monthlyAmount: number;
  maturityValue: number;
  members: number;
  description: string;
  category: string;
  tagline: string;
}

// These are now fetched from Firebase, only using types here.
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branch: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  balance?: number;
  savings?: number;
  activeScheme?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: string;
  type?: 'deposit' | 'withdrawal' | 'receipt';
}

export interface MarketRates {
  current: number;
  bonus: number;
  history: { date: string; rate: number }[];
}

export const MARKET_RATES: MarketRates = {
  current: 8.5,
  bonus: 2.0,
  history: [
    { date: '2024-04-01', rate: 8.0 },
    { date: '2024-04-05', rate: 8.2 },
    { date: '2024-04-10', rate: 8.3 },
    { date: '2024-04-13', rate: 8.5 },
  ]
};

