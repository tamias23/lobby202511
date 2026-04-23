/**
 * cronUtils.js — Crontab-style schedule matching.
 *
 * Fields: minute (0-59), hour (0-23), weekday (0-7, where 0 and 7 = Sunday)
 * Each field can be a number or '*' (any).
 *
 * Example: { minute: 0, hour: 0, weekday: '*' } runs at 00:00 UTC every day.
 */

'use strict';

/**
 * Returns true if a cron job should fire at the given UTC Date.
 * We round down to the minute, so the job fires in the whole minute window.
 */
function matchesCron(job, now = new Date()) {
    const m  = now.getUTCMinutes();
    const h  = now.getUTCHours();
    const wd = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    if (!matchField(job.minute,  m))  return false;
    if (!matchField(job.hour,    h))  return false;
    if (!matchField(job.weekday, wd)) return false;
    return true;
}

function matchField(field, value) {
    if (field === '*' || field === undefined || field === null) return true;
    const s = String(field).trim();
    // Step syntax: */N  (e.g. */5 = every 5 minutes)
    if (s.startsWith('*/')) {
        const step = parseInt(s.slice(2), 10);
        if (!isNaN(step) && step > 0) return (value % step) === 0;
    }
    const n = parseInt(s, 10);
    if (isNaN(n)) return true; // treat unparseable as wildcard
    // weekday 7 is also Sunday (same as 0)
    if (s === '7' && value === 0) return true;
    return n === value;
}

/**
 * Build a human-readable cron label like "00:05 UTC daily" or "08:25 UTC on Mon"
 */
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function describeCron(job) {
    const minRaw = job.minute  ?? '*';
    const hrRaw  = job.hour    ?? '*';
    const wd     = job.weekday;
    const min    = String(minRaw).padStart(2, '0');
    const hr     = String(hrRaw).padStart(2, '0');

    let time;
    // Step syntax
    if (String(minRaw).startsWith('*/')) {
        const step = minRaw.toString().slice(2);
        time = `every ${step} minutes`;
    } else if (minRaw === '*' && hrRaw === '*') {
        time = 'every minute';
    } else if (minRaw === '*') {
        time = `every minute of hour ${hr}`;
    } else if (hrRaw === '*') {
        time = `every hour at :${min}`;
    } else {
        time = `${hr}:${min} UTC`;
    }

    let when = (wd === '*' || wd == null)
        ? 'daily'
        : `on ${WEEKDAY_NAMES[parseInt(wd)] ?? '?'}`;

    // If time already says "every N minutes", "daily" is redundant
    if (time.startsWith('every') && time.includes('minute')) return time;
    return `${time} ${when}`;
}

module.exports = { matchesCron, describeCron };
