# Hapzo (React 19 + JavaScript + React Router 7 + Tailwind 4 + Vite 8)

    npm install
    npm run dev        # http://localhost:5173

## Netlify price function
Production price requests are handled by `netlify/functions/prices.mjs`, so the data.gov.in key stays on the server. In Netlify, add `DATA_GOV_IN_API_KEY` and `AGMARKNET_RESOURCE_ID` as environment variables with the **Functions** scope, then deploy the site again. `YARN_PRICES_URL` and `YARN_PRICES_API_KEY` are optional if a yarn provider is configured.

For temporary browser-side testing only, setting `VITE_DATA_GOV_IN_API_KEY` and `VITE_AGMARKNET_RESOURCE_ID` makes the price page call data.gov.in directly. Vite embeds `VITE_` values in the public JavaScript bundle, so remove these variables after testing and redeploy to restore the server-side function path.

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
