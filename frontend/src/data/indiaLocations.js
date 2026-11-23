import districtsByStateCode from 'india-state-district/dist/data/data.json';

// India currently has 28 states and 8 union territories. The district data is
// bundled with the app so the form keeps working even when a visitor is offline.
const STATE_NAMES = {
  AN: 'Andaman and Nicobar Islands', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam',
  BR: 'Bihar', CH: 'Chandigarh', CG: 'Chhattisgarh', DH: 'Dadra and Nagar Haveli and Daman and Diu',
  DL: 'Delhi', GA: 'Goa', GJ: 'Gujarat', HR: 'Haryana', HP: 'Himachal Pradesh',
  JK: 'Jammu and Kashmir', JH: 'Jharkhand', KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh',
  LD: 'Lakshadweep', MP: 'Madhya Pradesh', MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya',
  MZ: 'Mizoram', NL: 'Nagaland', OD: 'Odisha', PY: 'Puducherry', PB: 'Punjab', RJ: 'Rajasthan',
  SK: 'Sikkim', TN: 'Tamil Nadu', TG: 'Telangana', TR: 'Tripura', UP: 'Uttar Pradesh',
  UK: 'Uttarakhand', WB: 'West Bengal',
};

export const ALL_INDIA = 'All India';

export const STATES = Object.entries(STATE_NAMES)
  .filter(([code]) => Array.isArray(districtsByStateCode[code]))
  .map(([, name]) => name)
  .sort((left, right) => left.localeCompare(right, 'en-IN'));

export const DISTRICTS = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([code, name]) => [
    name,
    [...new Set((districtsByStateCode[code] || []).map((district) => String(district).trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'en-IN')),
  ])
);

// "All India" deliberately remains selectable before a state. It represents an
// event that is open nationwide rather than an incomplete location selection.
export function districtOptionsForState(state) {
  return [ALL_INDIA, ...(DISTRICTS[state] || [])];
}

export function eventLocation(state, district) {
  if (district === ALL_INDIA) return { state: ALL_INDIA, district: ALL_INDIA, location: ALL_INDIA };
  return {
    state: String(state || '').trim(),
    district: String(district || '').trim(),
    location: [district, state].filter(Boolean).join(', '),
  };
}
