import { UwalemiState, UwalemiMember, UwalemiGroupSettings, UwalemiMemberRole } from '../types/uwalemi';

export const UWALEMI_ROLE_PRIORITY: Record<string, number> = {
  'Mwenyekiti': 1,
  'Makamu Mwenyekiti': 2,
  'Katibu': 3,
  'Katibu Msaidizi': 4,
  'Mweka Hazina': 5,
  'Mweka Hazina Msaidizi': 6,
  'Mlezi': 7,
  'Mjumbe': 8
};

export function sortMembersByLeadership(members: UwalemiMember[]): UwalemiMember[] {
  if (!Array.isArray(members)) return [];
  return [...members].sort((a, b) => {
    const roleA = a.role || 'Mjumbe';
    const roleB = b.role || 'Mjumbe';
    const rankA = UWALEMI_ROLE_PRIORITY[roleA] ?? 99;
    const rankB = UWALEMI_ROLE_PRIORITY[roleB] ?? 99;
    
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    
    // If same role, sort by member number e.g. UWL-001, UWL-002
    const numA = a.memberNo || '';
    const numB = b.memberNo || '';
    return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export const INITIAL_UWALEMI_SETTINGS: UwalemiGroupSettings = {
  groupName: 'UWALEMI',
  slogan: 'Lema, Nguvu Moja.',
  registrationFeeDefault: 0,
  monthlyFeeDefault: 0,
  emergencyFeeDefault: 0,
  meetingFineDefault: 0,
  paymentMethods: [
    {
      id: 'pm-1',
      provider: 'M-Koba / Vodacom M-Pesa',
      type: 'Mobile',
      number: '0758 219 298',
      accountName: 'Eva Lema (M-Koba)'
    },
    {
      id: 'pm-2',
      provider: 'CRDB Bank',
      type: 'Bank',
      number: '0152435678900',
      accountName: 'UWALEMI SOCIAL WELFARE'
    }
  ],
  smsConfig: {
    provider: 'simulation',
    apiKey: '',
    secretKey: '',
    senderId: 'UWALEMI',
    autoSendReceipts: true,
    autoSendMeetingAlerts: true,
    autoSendMonthlyReminder: true
  },
  constitutionSummary: 'Kikundi cha kijamii cha UWALEMI kilichoanzishwa kwa ajili ya kuimarisha mshikamano, kusaidiana wakati wa misiba, maradhi, na kusherehekea pamoja wakati wa heri. Kila mwanachama anawajibika kutoa michango na kushiriki vikao vyote kwa uaminifu.',
  createdDate: '2023-01-01'
};

// Generate clean empty members list by default (no hardcoded members)
export function generateInitialMembers(): UwalemiMember[] {
  return [];
}

export const INITIAL_UWALEMI_STATE: UwalemiState & { initialized: boolean } = {
  initialized: true,
  groupSettings: INITIAL_UWALEMI_SETTINGS,
  members: [],
  monthlyPayments: [],
  emergencyFunds: [],
  expenses: [],
  meetings: [],
  messageLogs: [],
  lastUpdated: new Date().toISOString()
};

const LOCAL_STORAGE_KEY = 'uwalemi_standalone_state_v1';

export async function fetchUwalemiState(): Promise<UwalemiState> {
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let localState: (UwalemiState & { initialized?: boolean }) | null = null;
  if (cached) {
    try {
      localState = JSON.parse(cached);
    } catch (e) {}
  }

  const sanitizeState = (s: UwalemiState): UwalemiState => {
    if (s.groupSettings) {
      if (!s.groupSettings.slogan || s.groupSettings.slogan.includes('Shida na Raha')) {
        s.groupSettings.slogan = 'Lema, Nguvu Moja.';
      }
    }
    // Do NOT override member fee amounts or registration fees automatically.
    // Preserve manual entries exactly as set by the user.
    return s;
  };

  try {
    const res = await fetch('/api/uwalemi/state');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && data.initialized !== false && Array.isArray(data.members)) {
        const cleanData = sanitizeState(data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanData));
        return cleanData;
      } else if (localState && Array.isArray(localState.members)) {
        // If server had no initialized state yet but local has state, preserve and sync local to server
        const cleanLocal = sanitizeState(localState);
        saveUwalemiState(cleanLocal);
        return cleanLocal;
      }
    }
  } catch (err) {
    console.warn('[UwalemiService] Server state fetch fallback to local:', err);
  }

  if (localState) {
    return sanitizeState(localState);
  }

  return INITIAL_UWALEMI_STATE;
}

export async function saveUwalemiState(state: UwalemiState): Promise<boolean> {
  const updatedState = { ...state, initialized: true, lastUpdated: new Date().toISOString() };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedState));

  try {
    const res = await fetch('/api/uwalemi/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedState)
    });
    return res.ok;
  } catch (err) {
    console.error('[UwalemiService] Error saving state to server:', err);
    return false;
  }
}

export const MONTH_NAMES_SW = [
  'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
  'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'
];

export const MONTH_NAMES_SW_SHORT = [
  'Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'
];

export interface UwalemiMemberFeeDebtInfo {
  memberId: string;
  memberNo: string;
  memberName: string;
  phone: string;
  role: string;
  status: string;
  monthlyFee: number;
  totalDebt: number;
  unpaidCount: number;
  startYear?: number;
  startMonth?: number;
  startMonthName: string;
  endYear?: number;
  endMonth?: number;
  endMonthName: string;
  unpaidMonthsList: string[];
  unpaidMonthsText: string;
  periodSummary: string;
  breakdown: {
    year: number;
    month: number;
    monthName: string;
    expected: number;
    paid: number;
    debt: number;
  }[];
}

/**
 * Calculates default/expected monthly fee for a given year and month.
 * Rule: Nov 2023 up to May 2026 = TZS 15,000.
 * June 2026 onwards = TZS 20,000.
 */
export function getDefaultFeeForMonth(year: number, month: number, memberFeeAmount?: number): number {
  if (memberFeeAmount && memberFeeAmount !== 10000 && memberFeeAmount !== 15000 && memberFeeAmount !== 20000 && memberFeeAmount > 0) {
    return memberFeeAmount;
  }
  if (year > 2026 || (year === 2026 && month >= 6)) {
    return 20000;
  }
  return 15000;
}

/**
 * Calculates the exact fee debt for a specific member from the group's inception (Nov 2023) up to the current active month.
 */
export function calculateMemberFeeDebt(
  member: UwalemiMember,
  state: UwalemiState,
  targetYear?: number,
  targetMonth?: number
): UwalemiMemberFeeDebtInfo {
  const now = new Date();
  const endYear = targetYear || now.getFullYear();
  const endMonth = targetMonth || (now.getMonth() + 1);

  const groupStartYear = 2023;
  const groupStartMonth = 11; // November 2023

  const payments = state.monthlyPayments || [];
  const unpaidItems: {
    year: number;
    month: number;
    monthName: string;
    expected: number;
    paid: number;
    debt: number;
  }[] = [];

  let totalDebt = 0;

  for (let y = groupStartYear; y <= endYear; y++) {
    const startM = y === groupStartYear ? groupStartMonth : 1;
    const endM = y === endYear ? endMonth : 12;

    for (let m = startM; m <= endM; m++) {
      const p = payments.find(pay => pay.memberId === member.id && pay.year === y && pay.month === m);
      const paidAmount = p ? (Number(p.paidAmount) || 0) : 0;
      const expectedAmount = getDefaultFeeForMonth(y, m, member.monthlyFeeAmount);
      const debt = Math.max(0, expectedAmount - paidAmount);

      if (debt > 0) {
        totalDebt += debt;
        unpaidItems.push({
          year: y,
          month: m,
          monthName: `${MONTH_NAMES_SW_SHORT[m - 1]} ${y}`,
          expected: expectedAmount,
          paid: paidAmount,
          debt
        });
      }
    }
  }

  const unpaidCount = unpaidItems.length;
  let startMonthName = '';
  let endMonthName = '';
  let periodSummary = 'Hakuna deni la ada';
  let unpaidMonthsText = 'Hakuna';

  if (unpaidCount === 1) {
    const single = unpaidItems[0];
    startMonthName = `${MONTH_NAMES_SW[single.month - 1]} ${single.year}`;
    endMonthName = startMonthName;
    unpaidMonthsText = `${single.monthName}: TZS ${single.debt.toLocaleString()}`;
    periodSummary = `mwezi wa ${startMonthName}`;
  } else if (unpaidCount > 1) {
    const first = unpaidItems[0];
    const last = unpaidItems[unpaidCount - 1];
    startMonthName = `${MONTH_NAMES_SW[first.month - 1]} ${first.year}`;
    endMonthName = `${MONTH_NAMES_SW[last.month - 1]} ${last.year}`;
    unpaidMonthsText = unpaidItems.map(item => `${item.monthName}: TZS ${item.debt.toLocaleString()}`).join(', ');
    periodSummary = `kuanzia ${startMonthName} hadi ${endMonthName} (miezi ${unpaidCount})`;
  }

  return {
    memberId: member.id,
    memberNo: member.memberNo || '',
    memberName: member.fullName || 'Mjumbe',
    phone: member.phone || '',
    role: member.role || 'Mjumbe',
    status: member.status || 'active',
    monthlyFee: getDefaultFeeForMonth(endYear, endMonth, member.monthlyFeeAmount),
    totalDebt,
    unpaidCount,
    startYear: unpaidItems[0]?.year,
    startMonth: unpaidItems[0]?.month,
    startMonthName,
    endYear: unpaidItems[unpaidCount - 1]?.year,
    endMonth: unpaidItems[unpaidCount - 1]?.month,
    endMonthName,
    unpaidMonthsList: unpaidItems.map(item => item.monthName),
    unpaidMonthsText,
    periodSummary,
    breakdown: unpaidItems
  };
}

/**
 * Calculates fee debts for all active members.
 */
export function calculateAllMembersFeeDebts(
  state: UwalemiState,
  targetYear?: number,
  targetMonth?: number
): UwalemiMemberFeeDebtInfo[] {
  const members = sortMembersByLeadership(state.members || []);
  return members
    .filter(m => m.status === 'active')
    .map(m => calculateMemberFeeDebt(m, state, targetYear, targetMonth));
}

/**
 * Replaces dynamic variables in a template message for a specific member.
 */
export function formatPersonalizedUwalemiSms(
  template: string,
  debtInfo: UwalemiMemberFeeDebtInfo
): string {
  const formattedDebt = `TZS ${debtInfo.totalDebt.toLocaleString()}`;
  const breakdownText = debtInfo.breakdown && debtInfo.breakdown.length > 0
    ? debtInfo.breakdown.map(item => `${item.monthName}: TZS ${item.debt.toLocaleString()}`).join(', ')
    : debtInfo.unpaidMonthsText;

  return template
    .replace(/{name}/g, debtInfo.memberName)
    .replace(/{memberNo}/g, debtInfo.memberNo)
    .replace(/{phone}/g, debtInfo.phone)
    .replace(/{role}/g, debtInfo.role)
    .replace(/{debtAmount}/g, formattedDebt)
    .replace(/{deni}/g, formattedDebt)
    .replace(/{startMonth}/g, debtInfo.startMonthName || 'Mwezi huu')
    .replace(/{kuanzia}/g, debtInfo.startMonthName || 'Mwezi huu')
    .replace(/{endMonth}/g, debtInfo.endMonthName || 'Mwezi huu')
    .replace(/{hadi}/g, debtInfo.endMonthName || 'Mwezi huu')
    .replace(/{unpaidMonths}/g, debtInfo.unpaidMonthsText)
    .replace(/{miezi}/g, debtInfo.unpaidMonthsText)
    .replace(/{mchanganuo}/g, breakdownText)
    .replace(/{breakdown}/g, breakdownText)
    .replace(/{monthsCount}/g, String(debtInfo.unpaidCount))
    .replace(/{idadi_ya_miezi}/g, `${debtInfo.unpaidCount} miezi`)
    .replace(/{periodSummary}/g, debtInfo.periodSummary)
    .replace(/{monthlyFee}/g, `TZS ${debtInfo.monthlyFee.toLocaleString()}`)
    .replace(/{lipaNamba}/g, 'M-Koba au 0758 219 298 Eva Lema')
    .replace(/{lipaNumber}/g, 'M-Koba au 0758 219 298 Eva Lema');
}

export async function sendUwalemiSms(payload: {
  recipients: {
    name: string;
    phone: string;
    memberNo?: string;
    memberId?: string;
    debtAmount?: number;
    startMonth?: string;
    endMonth?: string;
    unpaidMonths?: string;
    periodSummary?: string;
    monthsCount?: number;
  }[];
  message: string;
  messageType: 'receipt' | 'reminder' | 'emergency' | 'meeting' | 'broadcast';
}): Promise<{ success: boolean; deliveredCount: number; message: string }> {
  try {
    const res = await fetch('/api/uwalemi/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    return { success: false, deliveredCount: 0, message: err.error || 'Imeshindwa kutuma SMS' };
  } catch (e: any) {
    return { success: false, deliveredCount: 0, message: e.message || 'Hitilafu ya mtandao' };
  }
}
