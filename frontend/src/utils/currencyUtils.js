/**
 * Currency and Number-to-Words utilities for Indian Rupee (INR) and GST Invoicing
 */

/**
 * Format a number as Indian Rupee (e.g. ₹1,23,456.78 or 1,23,456.78)
 * @param {number|string} amount
 * @param {boolean} showSymbol - prepend '₹' if true
 * @returns {string}
 */
export const formatINR = (amount, showSymbol = true) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return showSymbol ? '₹0.00' : '0.00';
  }
  const num = Number(amount);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Convert a number to Indian Currency Words (e.g., "Rupees One Thousand Four Hundred Seventy-Four Only")
 * @param {number|string} amount
 * @returns {string}
 */
export const numberToWordsINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rupees Zero Only';
  const num = Math.round(Number(amount) * 100) / 100;
  if (num === 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o > 0 ? '-' + ones[o] : '');
  }

  function convertThreeDigits(n) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (h > 0) {
      str += ones[h] + ' Hundred';
      if (rest > 0) str += ' ';
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  const [rupeePartStr, paisePartStr] = num.toFixed(2).split('.');
  let rupeePart = parseInt(rupeePartStr, 10);
  const paisePart = parseInt(paisePartStr, 10);

  let words = '';

  const crore = Math.floor(rupeePart / 10000000);
  rupeePart %= 10000000;

  const lakh = Math.floor(rupeePart / 100000);
  rupeePart %= 100000;

  const thousand = Math.floor(rupeePart / 1000);
  rupeePart %= 1000;

  const remainder = rupeePart;

  if (crore > 0) {
    words += (words ? ' ' : '') + convertThreeDigits(crore) + ' Crore';
  }
  if (lakh > 0) {
    words += (words ? ' ' : '') + convertThreeDigits(lakh) + ' Lakh';
  }
  if (thousand > 0) {
    words += (words ? ' ' : '') + convertThreeDigits(thousand) + ' Thousand';
  }
  if (remainder > 0) {
    words += (words ? ' ' : '') + convertThreeDigits(remainder);
  }

  if (!words) {
    words = 'Zero';
  }

  let finalStr = `Rupees ${words.trim()}`;
  if (paisePart > 0) {
    finalStr += ` and ${convertTwoDigits(paisePart)} Paise`;
  }
  finalStr += ' Only';
  return finalStr;
};

export default {
  formatINR,
  numberToWordsINR
};
