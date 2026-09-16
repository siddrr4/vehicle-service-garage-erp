export const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns YYYY-MM-DD string in Asia/Kolkata (IST).
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
 * Formats date into localized IST string (e.g. "10 Sep 2026").
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export const formatDateIST = (date, options = {}) => {
  if (!date) return '—';
  // Handle pure YYYY-MM-DD string safely without UTC shifting
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
 * Formats time into localized IST 12-hour string (e.g. "09:05 AM").
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export const formatTimeIST = (date, options = {}) => {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  const defaultOptions = {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  };
  return d.toLocaleTimeString('en-IN', defaultOptions);
};

/**
 * Formats date and time into localized IST string (e.g. "10 Sep 2026, 09:05 AM").
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export const formatDateTimeIST = (date, options = {}) => {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
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
 * Formats working hours display according to ERP rules:
 * - If isExplicit === false (Default Present): returns "Not Recorded"
 * - If workingHours is present: returns string e.g. "8h 55m"
 * - If checked in but not checked out: returns "In Progress"
 * - Otherwise: returns "Not Recorded"
 * @param {string|null} workingHours
 * @param {boolean} isCheckedIn
 * @param {boolean} isCheckedOut
 * @param {boolean} [isExplicit=true]
 * @returns {string}
 */
export const formatWorkingHoursDisplay = (workingHours, isCheckedIn, isCheckedOut, isExplicit = true) => {
  if (isExplicit === false) {
    return 'Not Recorded';
  }
  if (workingHours) {
    if (typeof workingHours === 'string' && workingHours.includes('h')) {
      return workingHours;
    }
    return `${workingHours} hrs`;
  }
  if (isCheckedIn && !isCheckedOut) {
    return 'In Progress';
  }
  return 'Not Recorded';
};
