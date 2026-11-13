/** Ставки админа с оплаченного билета. Считаем только status=paid. */
const HOLD_MS = 6 * 3600_000;

export function ticketCount(seats, explicit) {
  const n = Number(explicit);
  if (Number.isFinite(n) && n > 0) return n;
  const text = String(seats || '');
  const times = text.match(/×\s*(\d+)/);
  if (times) return Number(times[1]);
  const chunk = text.match(/места\s+([0-9,\-–\s]+)/);
  if (chunk) {
    const nums = chunk[1].match(/\d+/g) || [];
    if (nums.length === 2 && /[-–]/.test(chunk[1])) return Math.abs(Number(nums[1]) - Number(nums[0])) + 1;
    if (nums.length) return nums.length;
  }
  if (/место\s+\d+/.test(text)) return 1;
  return 0;
}

export function orderStatus({ status, bookedAt, trackUntil }) {
  if (status === 'paid' || status === 'success') return 'paid';
  if (status === 'cancelled' || status === 'expired' || status === 'gone') return 'lapsed';
  if (status === 'error') return 'error';
  if (status === 'pending') {
    const until = Date.parse(trackUntil || '');
    if (Number.isFinite(until) && until > Date.now()) return 'pending';
    return 'lapsed';
  }
  const at = Date.parse(bookedAt || '');
  if (!Number.isFinite(at) || Date.now() - at > HOLD_MS) return 'lapsed';
  return 'unchecked';
}

export function feeFor({ show, platform, seats, tickets, amount }) {
  const n = ticketCount(seats, tickets);
  const text = `${show || ''} ${platform || ''}`;
  const perSeat = n > 0 && amount ? Number(amount) / n : 0;
  if (/щелкунчик|bolshoi/i.test(text)) return pack(5000 * n, '5 000 ₽/билет', n);
  if (/цирк|никулин|profticket|лабиринт/i.test(text)) return pack(400 * n, '400 ₽/билет', n);
  if (/опера нищих|radario|intickets/i.test(text)) return pack(400 * n, '400 ₽/билет', n);
  if (/вахтангов|онегин|маскарад|лир/i.test(text)) return pack(400 * n, '400 ₽/билет', n);
  if (/гамлет/i.test(text)) {
    const pairs = n > 0 ? Math.max(1, Math.round(n / 2)) : 1;
    return pack(1000 * pairs, '1 000 ₽/пара', pairs);
  }
  if (/кабала/i.test(text)) {
    const count = n || 0;
    const rate = perSeat > 0 && perSeat <= 5000 ? 1000 : 1500;
    return pack(rate * count, rate === 1000 ? '1 000 ₽ дешёвый' : '1 500 ₽ хороший', count);
  }
  return { fee: null, feeNote: '', units: n };
}

function pack(fee, feeNote, units) {
  return { fee: units > 0 ? fee : null, feeNote, units };
}
