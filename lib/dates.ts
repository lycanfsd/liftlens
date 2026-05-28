const dayMs = 86400000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getLocalToday(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getLocalDateKey(date = new Date()) {
  const localDate = getLocalToday(date);
  return `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}`;
}

export function parseLocalDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return new Date(dateKey);

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function addLocalDays(date: Date, days: number) {
  const next = getLocalToday(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getStartOfLocalWeek(date = new Date()) {
  const start = getLocalToday(date);
  const day = start.getDay();
  const daysSinceMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function getEndOfLocalWeek(date = new Date()) {
  const end = getStartOfLocalWeek(date);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return end;
}

export function getStartOfLocalMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getLocalDateKeyDaysAgo(daysAgo: number, date = new Date()) {
  return getLocalDateKey(addLocalDays(date, -daysAgo));
}

export function getLocalDateKeyFromMaybeDate(value: string | Date) {
  if (value instanceof Date) return getLocalDateKey(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return getLocalDateKey(new Date(value));
}

export { dayMs };
