export function parseDeadline(input) {
  if (!input) return null;
  const str = input.trim().toLowerCase();
  const now = Date.now();
  let ms = null;

  const hoursMatch = str.match(/^(\d+)\s*h(ours?)?$/);
  if (hoursMatch) ms = parseInt(hoursMatch[1]) * 60 * 60 * 1000;

  if (!ms) {
    const daysMatch = str.match(/^(\d+)\s*d(ays?)?$/);
    if (daysMatch) ms = parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
  }

  if (!ms) {
    const weeksMatch = str.match(/^(\d+)\s*w(eeks?)?$/);
    if (weeksMatch) ms = parseInt(weeksMatch[1]) * 7 * 24 * 60 * 60 * 1000;
  }

  if (!ms) {
    const spaceMatch = str.match(/^(\d+)\s+(hour|hours|day|days|week|weeks)$/);
    if (spaceMatch) {
      const n = parseInt(spaceMatch[1]);
      const unit = spaceMatch[2];
      if (unit.startsWith('hour')) ms = n * 60 * 60 * 1000;
      else if (unit.startsWith('day'))  ms = n * 24 * 60 * 60 * 1000;
      else if (unit.startsWith('week')) ms = n * 7 * 24 * 60 * 60 * 1000;
    }
  }

  if (ms !== null) {
    const unix = Math.floor((now + ms) / 1000);
    return `<t:${unix}:R>`;
  }

  const looksLikeDate = /\d/.test(str) && (
    /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/.test(str) ||
    /\d{1,2}[\/\-]\d{1,2}/.test(str)
  );
  if (looksLikeDate) {
    const attempted = new Date(input);
    if (!isNaN(attempted.getTime())) {
      const unix = Math.floor(attempted.getTime() / 1000);
      return `<t:${unix}:R>`;
    }
  }
  return null;
}

export function extractUnix(deadlineField) {
  if (!deadlineField) return null;
  const match = deadlineField.match(/<t:(\d+)(?::[^>]*)?>/)
  if (match) return parseInt(match[1], 10);
  const date = new Date(deadlineField);
  if (!isNaN(date.getTime())) return Math.floor(date.getTime() / 1000);
  return null;
}

export function isExpired(deadlineField) {
  const unix = extractUnix(deadlineField);
  if (!unix) return false;
  return unix <= Math.floor(Date.now() / 1000);
}

export function isWithin(deadlineField, ms) {
  const unix = extractUnix(deadlineField);
  if (!unix) return false;
  const diff = (unix * 1000) - Date.now();
  return diff > 0 && diff <= ms;
}

export function urgencyEmoji(deadlineField) {
  const unix = extractUnix(deadlineField);
  if (!unix) return '⏰';
  const diff = (unix * 1000) - Date.now();
  if (diff <= 0)            return '⛔';
  if (diff <= 2 * 3600000)  return '🔴';
  if (diff <= 24 * 3600000) return '🟠';
  return '⏰';
}

export function formatCountdown(deadlineField) {
  if (!deadlineField) return null;
  if (deadlineField.startsWith('<t:')) return deadlineField;
  const unix = extractUnix(deadlineField);
  if (!unix) return null;
  return `<t:${unix}:R>`;
}
