import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const safeDate = (timestamp: any): Date => {
  if (!timestamp) return new Date(0);
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
  }
  if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000);
  }
  if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
  }
  if (typeof timestamp === 'string') {
      // Check for YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY format
      const parts = timestamp.includes('-') ? timestamp.split('-') : timestamp.split('/');
      if (parts.length === 3) {
          if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
              return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          }
          if (parts[0].length === 4 && parts[1].length <= 2 && parts[2].length <= 2) {
              return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          }
      }
  }
  return new Date(timestamp);
};

export const formatDate = (dateString: string | Date | any) => {
  if (!dateString) return '';
  const date = safeDate(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const validateEmail = (email: string) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

export const validatePhone = (phone: string) => {
  return String(phone).match(/^[6-9]\d{9}$/);
};

export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.santoshinstyle.vastra&pcampaignid=web_share";

export const rateApp = () => {
  try {
    window.open(PLAY_STORE_URL, '_blank');
  } catch (err) {
    window.location.href = PLAY_STORE_URL;
  }
};

export const shareApp = async () => {
  const shareData = {
    title: 'Santhosh Silks | VASTRA',
    text: 'Join Santhosh Silks & VASTRA to save small and celebrate big with exclusive gold & silk membership savings!',
    url: PLAY_STORE_URL,
    dialogTitle: 'Share VASTRA with Friends'
  };

  try {
    const { Share } = await import('@capacitor/share');
    await Share.share(shareData);
  } catch (e) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url,
        });
      } catch (err) {
        // user cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        alert("App link copied to clipboard! Share it with your friends.");
      } catch (copyErr) {
        window.open(PLAY_STORE_URL, '_blank');
      }
    }
  }
};

/**
 * Calculates the appropriate recording date for a specific scheme installment.
 * If the installment corresponds to a past due month (e.g. October when paying in November),
 * it returns that past month's date (aligned to the customer's joining day).
 * If the installment corresponds to the current month or future, it returns today's date.
 */
export const getInstallmentDueDate = (rawEnrollmentDate: any, installmentNum: number): string => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const baseDate = safeDate(rawEnrollmentDate);
  if (!baseDate || isNaN(baseDate.getTime()) || baseDate.getTime() === 0) {
    return todayStr;
  }

  const joinYear = baseDate.getFullYear();
  const joinMonth = baseDate.getMonth();
  const joinDay = baseDate.getDate();

  // Installment 1 = offset 0, Installment 2 = offset 1, etc.
  const monthOffset = Math.max(0, installmentNum - 1);
  const targetYear = joinYear + Math.floor((joinMonth + monthOffset) / 12);
  const targetMonth = (joinMonth + monthOffset) % 12;

  // Check if target installment month is strictly before the current calendar month
  const isPastMonth = targetYear < currentYear || (targetYear === currentYear && targetMonth < currentMonth);

  if (!isPastMonth) {
    // Current or future installment being paid now -> use today's date
    return todayStr;
  }

  // Calculate day in that past month, clamping to the max days in that month
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(joinDay, daysInTargetMonth);

  const yyyy = targetYear;
  const mm = String(targetMonth + 1).padStart(2, '0');
  const dd = String(clampedDay).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};


