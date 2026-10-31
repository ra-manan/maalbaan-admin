# CLAUDE.md: Maalbaan Admin

Vendor admin panel for manage.maalbaan.com. React 18 + TypeScript + Vite, plain CSS from the Maalban design kit (`src/design/*.css`, same tokens as the app and website: tokens only, never hard-code hex, 44px targets, 3px focus ring, sentence case, no emoji). The design is `design-kit/Admin.dc.html` and the two screenshots beside it; do not copy the `.dc.html` template format.

- API: `Maalbaan Project/server` (Cloudflare Worker + D1). This panel calls `/v1/manage/*` (`src/api.ts`); staff sign-in is an HttpOnly cookie, so no token ever lives in JS. Rules for licence state live in the server's `src/status.ts` and mirror the app's `licenseStatusFor`.
- Errors from the API are plain sentences meant to be shown as they are (`ApiError.message`).
- Add screens as routes in `src/main.tsx`, using `<Page>` from `src/Shell.tsx`; add the menu item to `NAV` in `Shell.tsx`.
- Munshi page (`src/pages/Munshi.tsx`, menu item Munshi): voice entry metrics from `/v1/manage/munshi/*` (Overview, Accuracy, Failures and edits, Shops with each shop's switch for keeping spoken sentences). It is the one screen that shows shop text (sentences people spoke), so keep the privacy note in `Shell.tsx` true. The plan and what is built are in `../Maalbaan Munshi Agent/MUNSHI_CONTEXT.md`; the server half is `Maalbaan Project/server/src/munshi.ts`.
- Do not add dependencies without asking. `npm run build` and `npm test` must pass.
- Read `README.md` for screens, local run and deploy.
- Live / Staging switch (`src/environment.ts`, `src/EnvironmentSwitch.tsx`): the same panel talks to `https://api.maalbaan.com` or `https://api-staging.maalbaan.com`, chosen in the browser (`maalbaan-admin:environment`, default live) and only in a deployed build. A switch reloads the page because the sign-in cookie belongs to one API. Staging shows a banner. Staging has its own database and panel logins (the two live owners were copied once on 2026-10-31; later password or staff changes do not sync). A new API address must also go in `public/_headers` (CSP `connect-src`).
