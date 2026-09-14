export const formatLocalDate = (dateString, includeTime = false) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Africa/Nairobi'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = false;
  }
  
  return date.toLocaleString('en-KE', options);
};

// For backward compatibility
export const formatTableDate = formatLocalDate;
export const formatTableDateTime = (dateString) => formatLocalDate(dateString, true);
