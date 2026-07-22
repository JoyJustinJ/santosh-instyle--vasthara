const safeDate = (timestamp) => {
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
      const parts = timestamp.includes('-') ? timestamp.split('-') : timestamp.split('/');
      if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
  }
  return new Date(timestamp);
};

const s = {
    joinedAt: undefined,
    enrollmentDate: '2026-06-25T00:00:00.000Z',
    createdAt: undefined,
    monthsPaid: 1
};

const now = new Date();
const joinDate = safeDate(s.joinedAt || s.enrollmentDate || s.createdAt || now);
const monthsElapsed = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
const totalInstallmentsDue = monthsElapsed + 1;
const dueMonths = totalInstallmentsDue - (s.monthsPaid || 0);

console.log({
    now: now.toISOString(),
    joinDate: joinDate.toISOString(),
    monthsElapsed,
    totalInstallmentsDue,
    monthsPaid: s.monthsPaid,
    dueMonths
});
