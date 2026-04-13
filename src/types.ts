export type Role = 'customer' | 'staff' | 'admin';

export type Screen =
  | 'splash'
  | 'welcome'
  | 'register1'
  | 'register2'
  | 'login'
  | 'home'
  | 'schemes'
  | 'schemeDetail'
  | 'joinPlan'
  | 'success'
  | 'myPlans'
  | 'bulkPay'
  | 'paymentSummary'
  | 'paymentSuccess'
  | 'paymentFailed'
  | 'maturity'
  | 'notifications'
  | 'profile'
  | 'staffHome'
  | 'staffReferrals'
  | 'staffIncentives'
  | 'adminHome'
  | 'adminSchemes'
  | 'adminCustomers'
  | 'adminManualPay'
  | 'adminDanger';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  branch?: string;
}

export interface Scheme {
  id: string;
  name: string;
  duration: number;
  monthlyAmount: number;
  maturityValue: number;
  members: number;
  description: string;
  category: 'Short Term' | 'Long Term' | 'Popular';
  tagline: string;
}

export interface UserPlan {
  id: string;
  schemeId: string;
  userId: string;
  monthsPaid: number;
  totalPaid: number;
  status: 'active' | 'matured' | 'closed';
  startDate: string;
}
