/** "TSh 1,200,000" */
export function tsh(amount: number) {
  return 'TSh ' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Accepts 0712 345 678, 712345678, +255 712 345 678 → "255712345678". Returns null if not a TZ mobile number. */
export function normalizePhone(input: string): string | null {
  const d = input.replace(/\D/g, '');
  if (/^0[67]\d{8}$/.test(d)) return '255' + d.slice(1);
  if (/^255[67]\d{8}$/.test(d)) return d;
  if (/^[67]\d{8}$/.test(d)) return '255' + d;
  return null;
}

/** "255712345678" → "0712 345 678" */
export function displayPhone(p: string | null | undefined) {
  if (!p) return '';
  if (/^255\d{9}$/.test(p)) return `0${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}`;
  return p;
}

export function telUrl(p: string) {
  return 'tel:+' + p.replace(/\D/g, '');
}

export function whatsappUrl(p: string, text?: string) {
  const base = 'https://wa.me/' + p.replace(/\D/g, '');
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

const DAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  sw: ['Jpili', 'Jtatu', 'Jnne', 'Jtano', 'Alh', 'Ijum', 'Jmos'],
};
const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sw: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
};

/** "2026-10-08" in local time */
export function isoDate(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "Thu 8 Oct" */
export function shortDate(value: string | Date, lang: 'en' | 'sw') {
  const d = typeof value === 'string' ? new Date(value.length === 10 ? value + 'T12:00:00' : value) : value;
  return `${DAYS[lang][d.getDay()]} ${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
}

export function nextDays(count: number) {
  const out: Date[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push(d);
  }
  return out;
}
