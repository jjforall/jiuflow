/**
 * Generate a Google Calendar event URL
 */
export const generateGoogleCalendarUrl = ({
  title,
  startDate,
  endDate,
  location,
  description,
}: {
  title: string;
  startDate: string; // ISO date string
  endDate?: string | null; // ISO date string
  location?: string | null;
  description?: string | null;
}): string => {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams();
  
  params.set('action', 'TEMPLATE');
  params.set('text', title);
  
  // Format dates for Google Calendar (YYYYMMDD for all-day events)
  const formatDateForGoogle = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };
  
  const start = formatDateForGoogle(startDate);
  // For end date, add 1 day since Google Calendar all-day events are exclusive
  const endDateStr = endDate || startDate;
  const endDateObj = new Date(endDateStr);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const end = formatDateForGoogle(endDateObj.toISOString());
  
  params.set('dates', `${start}/${end}`);
  
  if (location) {
    params.set('location', location);
  }
  
  if (description) {
    params.set('details', description);
  }
  
  return `${baseUrl}?${params.toString()}`;
};
