import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Transaction } from "../types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRealTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRealLocalDateTimeStr(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

export function parseLocalTimeString(str: string | null | undefined): Date {
  if (!str) return new Date();
  const [datePart, timePart] = str.trim().split(' ');
  if (!datePart) return new Date();
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss] = (timePart || '00:00:00').split(':').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
  return new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0);
}

export function getRealDateWithOffset(offsetDays: number = 1): string {
  const target = new Date();
  target.setDate(target.getDate() + offsetDays);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function addDaysToDateStr(dateStr: string, days: number = 1): string {
  if (!dateStr) return getRealDateWithOffset(days);
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  target.setDate(target.getDate() + days);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatRupiah(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

export function formatIndonesianDateTime(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '-';
  const parts = dateTimeStr.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || '';
  const indDate = formatIndonesianDate(datePart);
  return timePart ? `${indDate}, ${timePart} WIB` : indDate;
}

export function getTxDays(t: Transaction): number {
  if (t.durationUnit === 'Hari') {
    return t.duration >= 24 ? Math.ceil(t.duration / 24) : Math.max(1, t.duration);
  }
  if (t.duration >= 24) {
    return Math.ceil(t.duration / 24);
  }
  return 1;
}

export function checkMeetingRoomAvailability(
  roomId: string,
  startDate: string,
  duration: number,
  transactions: Transaction[],
  excludeTxId?: string,
  durationUnit?: string
): { isValid: boolean; message?: string } {
  const isHourly = durationUnit === 'Jam' || duration === 8 || duration === 4 || duration === 12;
  const isGroupDays = durationUnit === 'Hari' || (!isHourly && duration < 24 && duration >= 1);
  const proposedDays = isGroupDays ? (duration >= 24 ? Math.ceil(duration / 24) : Math.max(1, duration)) : (duration >= 24 ? Math.ceil(duration / 24) : 1);
  const isEightHours = duration === 8;

  const datesToCheck: string[] = [];
  for (let i = 0; i < proposedDays; i++) {
    datesToCheck.push(addDaysToDateStr(startDate, i));
  }

  for (const dateStr of datesToCheck) {
    const activeTxsOnDate = transactions.filter(t => {
      if (t.roomId !== roomId) return false;
      if (t.status === 'DIBATALKAN' || t.status === 'SELESAI') return false;
      if (excludeTxId && t.id === excludeTxId) return false;

      const tDays = getTxDays(t);
      for (let j = 0; j < tDays; j++) {
        if (addDaysToDateStr(t.startDate, j) === dateStr) {
          return true;
        }
      }
      return false;
    });

    const has12OrMultiDay = activeTxsOnDate.some(t => t.duration >= 12 || t.durationUnit === 'Hari' || t.duration >= 24);
    const count8 = activeTxsOnDate.filter(t => (t.duration === 8 || (t.duration < 12 && t.durationUnit !== 'Hari'))).length;

    if (isEightHours) {
      if (has12OrMultiDay) {
        return {
          isValid: false,
          message: `Pada tanggal ${formatIndonesianDate(dateStr)}, ruang pertemuan sudah disewa paket 12 Jam / Multi-hari. Silakan ganti ke tanggal lain yang kosong.`
        };
      }
      if (count8 >= 2) {
        return {
          isValid: false,
          message: `Pada tanggal ${formatIndonesianDate(dateStr)}, ruang pertemuan sudah mencapai batas maksimal 2 penyewa (2x 8 Jam). Silakan ganti ke tanggal lain yang kosong.`
        };
      }
    } else {
      if (activeTxsOnDate.length > 0) {
        return {
          isValid: false,
          message: `Pada tanggal ${formatIndonesianDate(dateStr)}, ruang pertemuan sudah memiliki jadwal penyewaan aktif (ada penyewa 8 Jam atau 12 Jam / Multi-hari). Pemesanan 12 Jam hingga berhari-hari memerlukan ruangan kosong penuh. Silakan ganti ke tanggal lain yang kosong.`
        };
      }
    }
  }

  return { isValid: true };
}

