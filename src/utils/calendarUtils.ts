/**
 * Calendar utility functions for generating calendar event URLs
 */

interface CalendarEventParams {
  title: string;
  startDate: string; // ISO date string
  endDate?: string | null;
  location?: string | null;
  description?: string | null;
}

/**
 * Format date for calendar URLs (YYYYMMDD)
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Generate a Google Calendar event URL
 */
export const generateGoogleCalendarUrl = ({
  title,
  startDate,
  endDate,
  location,
  description,
}: CalendarEventParams): string => {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams();
  
  params.set('action', 'TEMPLATE');
  params.set('text', title);
  
  const start = formatDate(startDate);
  const endDateStr = endDate || startDate;
  const endDateObj = new Date(endDateStr);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const end = formatDate(endDateObj.toISOString());
  
  params.set('dates', `${start}/${end}`);
  
  if (location) {
    params.set('location', location);
  }
  
  if (description) {
    params.set('details', description);
  }
  
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Generate an Outlook Calendar event URL
 */
export const generateOutlookCalendarUrl = ({
  title,
  startDate,
  endDate,
  location,
  description,
}: CalendarEventParams): string => {
  const baseUrl = 'https://outlook.live.com/calendar/0/action/compose';
  const params = new URLSearchParams();
  
  params.set('subject', title);
  params.set('allday', 'true');
  
  // Format: YYYY-MM-DD
  const formatOutlookDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };
  
  params.set('startdt', formatOutlookDate(startDate));
  const endDateStr = endDate || startDate;
  const endDateObj = new Date(endDateStr);
  endDateObj.setDate(endDateObj.getDate() + 1);
  params.set('enddt', formatOutlookDate(endDateObj.toISOString()));
  
  if (location) {
    params.set('location', location);
  }
  
  if (description) {
    params.set('body', description);
  }
  
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Generate an iCal/Apple Calendar file content and trigger download
 */
export const generateICalFile = ({
  title,
  startDate,
  endDate,
  location,
  description,
}: CalendarEventParams): void => {
  const formatICalDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };
  
  const start = formatICalDate(startDate);
  const endDateStr = endDate || startDate;
  const endDateObj = new Date(endDateStr);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const end = formatICalDate(endDateObj.toISOString());
  
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@jiuflow`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const escapeICalText = (text: string) => {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  };
  
  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JiuFlow//Tournament Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeICalText(title)}`,
  ];
  
  if (location) {
    icalContent.push(`LOCATION:${escapeICalText(location)}`);
  }
  
  if (description) {
    icalContent.push(`DESCRIPTION:${escapeICalText(description)}`);
  }
  
  icalContent.push('END:VEVENT', 'END:VCALENDAR');
  
  const blob = new Blob([icalContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate a Yahoo Calendar event URL
 */
export const generateYahooCalendarUrl = ({
  title,
  startDate,
  endDate,
  location,
  description,
}: CalendarEventParams): string => {
  const baseUrl = 'https://calendar.yahoo.com/';
  const params = new URLSearchParams();
  
  params.set('v', '60');
  params.set('title', title);
  
  const start = formatDate(startDate);
  const endDateStr = endDate || startDate;
  const end = formatDate(endDateStr);
  
  params.set('st', start);
  params.set('et', end);
  params.set('dur', 'allday');
  
  if (location) {
    params.set('in_loc', location);
  }
  
  if (description) {
    params.set('desc', description);
  }
  
  return `${baseUrl}?${params.toString()}`;
};
