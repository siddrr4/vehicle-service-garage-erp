export const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns YYYY-MM-DD formatted date string in Asia/Kolkata (IST).
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export const getIndiaDateStr = (date = new Date()) => {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
};

/**
 * Returns individual date/time parts in Asia/Kolkata (IST).
 * @param {Date|string|number} [date=new Date()]
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number, dateStr: string }}
 */
export const getIndiaDateParts = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(d);

  const getPart = (type) => parts.find((p) => p.type === type)?.value;
  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  const hourRaw = parseInt(getPart('hour'), 10);
  const hour = hourRaw === 24 ? 0 : hourRaw;
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, hour, minute, second, dateStr };
};

/**
 * Returns current hours, minutes, and seconds in Asia/Kolkata (IST).
 * Useful for check-in time boundary checks (e.g. 08:30 AM opening, 09:15 AM late).
 * @param {Date|string|number} [date=new Date()]
 * @returns {{ hours: number, minutes: number, seconds: number }}
 */
export const getIndiaCurrentTimeParts = (date = new Date()) => {
  const { hour, minute, second } = getIndiaDateParts(date);
  return { hours: hour, minutes: minute, seconds: second };
};

/**
 * Returns the exact UTC Date corresponding to the start of the day (00:00:00.000) in IST.
 * @param {string|Date} dateStrOrDate YYYY-MM-DD or Date
 * @returns {Date}
 */
export const getIndiaStartOfDay = (dateStrOrDate) => {
  const dateStr = typeof dateStrOrDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStrOrDate)
    ? dateStrOrDate.substring(0, 10)
    : getIndiaDateStr(dateStrOrDate);
  return new Date(`${dateStr}T00:00:00.000+05:30`);
};

/**
 * Returns the exact UTC Date corresponding to the end of the day (23:59:59.999) in IST.
 * @param {string|Date} dateStrOrDate YYYY-MM-DD or Date
 * @returns {Date}
 */
export const getIndiaEndOfDay = (dateStrOrDate) => {
  const dateStr = typeof dateStrOrDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStrOrDate)
    ? dateStrOrDate.substring(0, 10)
    : getIndiaDateStr(dateStrOrDate);
  return new Date(`${dateStr}T23:59:59.999+05:30`);
};

/**
 * Formats date into localized IST string (e.g. "10 Sep 2026").
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export const formatDateIST = (date, options = {}) => {
  if (!date) return '—';
  let d;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    d = new Date(`${date}T00:00:00+05:30`);
  } else {
    d = date instanceof Date ? date : new Date(date);
  }
  if (isNaN(d.getTime())) return '—';

  const defaultOptions = {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  };
  return d.toLocaleDateString('en-IN', defaultOptions);
};

/**
 * Formats date and time into localized IST string (e.g. "10 Sep 2026, 09:05 AM").
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export const formatDateTimeIST = (date, options = {}) => {
  if (!date) return '—';
  let d;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    d = new Date(`${date}T00:00:00+05:30`);
  } else {
    d = date instanceof Date ? date : new Date(date);
  }
  if (isNaN(d.getTime())) return '—';

  const defaultOptions = {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  };
  return d.toLocaleString('en-IN', defaultOptions);
};

/**
 * Formats working hours between two timestamps or from a numeric hours value.
 * @param {Date|string|number} arg1 checkIn timestamp OR hours number
 * @param {Date|string} [arg2] checkOut timestamp
 * @returns {string} e.g. "8h 30m" or "8h" or "9h"
 */
export const formatWorkingHours = (arg1, arg2) => {
  if (arg1 === null || arg1 === undefined) return '';

  // If single parameter (hours number or string) is provided
  if (arg2 === undefined) {
    if (typeof arg1 === 'number' || (!isNaN(arg1) && typeof arg1 === 'string' && arg1.trim() !== '')) {
      const numHours = Number(arg1);
      const totalMinutes = Math.round(numHours * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (minutes === 0) return `${hours}h`;
      return `${hours}h ${minutes}m`;
    }
    return '';
  }

  // Two timestamps provided
  const diffMs = new Date(arg2).getTime() - new Date(arg1).getTime();
  if (isNaN(diffMs)) return '';
  const totalMinutes = Math.floor(Math.max(0, diffMs / (1000 * 60)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};

/**
 * Helper to determine attendance status based on IST check-in time and duration.
 * @param {Date|string} checkInTime
 * @param {Date|string} checkOutTime
 * @returns {'Early Exit'|'Half Day'|'Late'|'Present'}
 */
export const getAttendanceStatusIST = (checkInTime, checkOutTime) => {
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const diffHours = Math.max(0, diffMs / (1000 * 60 * 60));

  if (diffHours < 4) {
    return 'Early Exit';
  } else if (diffHours < 8) {
    return 'Half Day';
  } else {
    // Check if check-in was after 09:15 AM in IST
    const { hours, minutes } = getIndiaCurrentTimeParts(checkIn);
    const isLateCheckIn = hours > 9 || (hours === 9 && minutes > 15);
    return isLateCheckIn ? 'Late' : 'Present';
  }
};
