// App-wide settings. Change prices / languages / filter tags here.
export const PRICING = { firstJob: 1500, additionalJob: 500 };
export const LANGUAGES = [
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
];
export const DEFAULT_LANG = 'ta';
export const SOURCE_LANG = 'en'; // language companies write their jobs in

// Tags a company picks when posting a job. They are stored on the job and drive the filters.
// Labels come from i18n keys: type.*, gender.*, cat.*
export const JOB_TYPES = ['full-time', 'part-time', 'contract'];
export const GENDERS = ['men', 'women', 'any'];
export const CATEGORIES = ['manufacturing', 'it', 'logistics', 'sales', 'admin', 'other'];
