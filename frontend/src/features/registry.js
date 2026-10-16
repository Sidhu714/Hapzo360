import { lazy } from 'react';
import { Briefcase, CalendarDays, Cpu, Tags, TrendingUp } from 'lucide-react';

// To add Happenings (etc.): build features/happenings/HappeningsPage.jsx,
// then replace `component: null` with lazy(() => import('./happenings/HappeningsPage')).
// Strings: add `svc.<slug>` and `svc.<slug>.desc` in i18n/strings.js.
export const SERVICES = [
  { slug: 'openings', icon: Briefcase, component: lazy(() => import('./openings/OpeningsPage')) },
  { slug: 'happenings', icon: CalendarDays, component: lazy(() => import('./happenings/HappeningsPage')) },
  { slug: 'trends', icon: TrendingUp, component: lazy(() => import('./trends/TrendsPage')) },
  { slug: 'price-list', icon: Tags, component: lazy(() => import('./pricelist/PriceListPage')) },
  { slug: 'technologies', icon: Cpu, component: lazy(() => import('./technology/Technology')) },
];
