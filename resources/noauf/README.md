# Nawaf Auto — Frontend

React + TypeScript + Vite + Tailwind CSS v4, bilingual (Arabic RTL / English LTR), built from the Figma file.
Data is mocked for now; every call goes through `src/services/*` so switching to the Laravel API is a config change.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Language: the `EN / عربي` switch in the navbar, or `?lang=en` / `?lang=ar` in the URL (saved in localStorage).

## Structure

```
src/
  components/        shared UI (CarCard, ArticleCard, OfferCard, Carousel, Pagination, Wizard, layout/, ui/)
  pages/             one file per Figma screen
  services/          API layer — mock today, Laravel tomorrow
    api.ts           axios instance, USE_MOCK switch, Accept-Language + Bearer token
    cars.ts          getCars, getCar, getLatestCars, getSimilarCars, getCarFilterOptions
    content.ts       getOffers, getArticles, getArticle, getBrands, getPartners, getTestimonials, getFaqs
    forms.ts         sendContact, saveFinanceLead, submitFinanceRequest, submitCustomCarRequest
  data/              temporary mock data (AR + EN)
  types/index.ts     data contracts the API must return
  i18n/locales/      ar.json / en.json (all UI strings)
```

## Pages (Figma frame → route)

| Figma frame | Route |
|---|---|
| الصفحة الرئيسية | `/` |
| تصفح السيارات | `/cars` (filters in the URL: `?category=suv&brand=BMW&page=2`) |
| Mercedes-Benz S 500 4MATIC | `/cars/:id` |
| مقارنة السيارات | `/compare` (selection kept in localStorage) |
| العروض والتخفيضات | `/offers` |
| المدونة | `/blog` |
| دليل تمويل السيارات | `/blog/:slug` (e.g. `/blog/car-finance-guide`) |
| من نحن | `/about` |
| تواصل معنا | `/contact` |
| حاسبة التمويل 01–04 | `/finance/calculator` (`?car=<id>`, `?step=1..4`) |
| طلب سيارة مخصصة 01–04 | `/request-car` (`?step=1..4`) |

## Connecting Laravel

1. Copy `.env.example` to `.env` and set:
   ```
   VITE_USE_MOCK=false
   VITE_API_URL=http://your-laravel.test/api
   ```
2. Implement these endpoints (shapes in `src/types/index.ts`, texts translated by the `Accept-Language` header):

| Method | Endpoint | Returns |
|---|---|---|
| GET | `/cars` (query = `CarFilters`) | `{ data: Car[], meta: { currentPage, lastPage, total } }` |
| GET | `/cars/latest` | `{ data: Car[] }` |
| GET | `/cars/{id}` | `{ data: Car }` |
| GET | `/cars/{id}/similar` | `{ data: Car[] }` |
| GET | `/cars/filters` | `{ brands: string[], models: string[], years: number[] }` |
| GET | `/offers?tag=` | `{ featured: Offer, data: Offer[] }` |
| GET | `/articles?tag=&search=&page=` | `{ featured, data: ArticleSummary[], meta }` |
| GET | `/articles/{slug}` | `{ data: Article }` |
| GET | `/articles/{slug}/related` | `{ data: ArticleSummary[] }` |
| GET | `/brands`, `/partners`, `/testimonials`, `/faqs` | `{ data: [...] }` |
| POST | `/contact` | `ContactPayload` |
| POST | `/finance/leads` | `FinanceLeadPayload` → `{ id }` |
| POST | `/finance/requests` | `FinanceRequestPayload` |
| POST | `/car-requests` | `CustomCarRequestPayload` |

In Laravel, a small middleware that calls `App::setLocale($request->header('Accept-Language'))` plus CORS for the frontend origin is enough.

## Design tokens

Defined in `src/index.css` (`@theme`): `ink #222525`, `ink-2 #3a3b3c`, `gold #c8b68b`, `bronze #6b572f`, `muted #71736c`,
`silver #c4c5bd`, `cream #f7f6f2`, `sand #f0ede4`, `line #dedcd3`; font Tajawal; type scale `text-display / h1 / h2 / h3 / lead / body / small / tiny`.
