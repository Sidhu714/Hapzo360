# Hapzo (React 19 + JavaScript + React Router 7 + Tailwind 4 + Vite 8)

    npm install
    npm run dev        # http://localhost:5173

## Pages
- `/`                      Home (search, 5 services, how it works, hiring banner)
- `/about`, `/contact`
- `/services`              overview of the 5 services
- `/services/openings`     job board with left filters (date, job type, men/women, category), apply with name + phone
- `/services/happenings` ... other services (coming soon pages)
- `/post-job`              company flow: job details > company details > payment > published

## Structure
- `src/features/registry.js`   the 5 services. To build Happenings: add `features/happenings/HappeningsPage.jsx`
  and swap `component: null` for `lazy(() => import('./happenings/HappeningsPage'))`. Route and Home card already exist.
- `src/features/openings/`     Openings feature (page, filters, cards, apply modal, post-job flow)
- `src/features/openings/openingsApi.js`  fake backend (localStorage). Rewrite each function as fetch() to go live.
- `src/features/openings/seed.js`         demo jobs with saved Tamil/Hindi translations
- `src/services/translate.js`  job translation (saved translations, then free MyMemory API). Swap for your backend.
- `src/i18n/`                  UI text in Tamil / Hindi / English
- `src/config.js`              prices, languages, filter tags (job types, gender, categories)
- `src/index.css`              theme colors (@theme) and shared component styles

## Demo data
Stored in localStorage under keys starting with `hapzo.` (clear them to reset). Applications are saved under `hapzo.applications`.
