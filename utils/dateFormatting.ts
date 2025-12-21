/**
 * Consistent date and time formatting utilities
 */

/**
 * Format duration in minutes to readable string (e.g., "7h 30m")
 */
export const formatDuration = (minutes: number): string => {
  if (minutes <= 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * Format time in 12-hour format (e.g., "10:30 PM")
 */
export const format12HourTime = (date: Date): string => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strMinutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${strMinutes} ${ampm}`;
};

/**
 * Format time in 24-hour format (e.g., "22:30")
 */
export const format24HourTime = (date: Date): string => {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Format 24-hour time string (e.g., "22:30") to 12-hour format (e.g., "10:30 PM")
 */
export const format24hTo12h = (timeString: string | null | undefined): string => {
  if (!timeString) return '';
  
  try {
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  } catch (e) {
    return timeString;
  }
};

/**
 * Format date as short date string (e.g., "Dec 4")
 */
export const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date as full date string (e.g., "December 4, 2025")
 */
export const formatFullDate = (date: Date): string => {
  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date and time together (e.g., "Dec 4 at 10:30 PM")
 */
export const formatDateTime = (date: Date, use24Hour = false): string => {
  const dateStr = formatShortDate(date);
  const timeStr = use24Hour ? format24HourTime(date) : format12HourTime(date);
  return `${dateStr} at ${timeStr}`;
};

/**
 * Get relative time string (e.g., "2 hours ago", "Today")
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return formatShortDate(date);
};
