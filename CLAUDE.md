# CLAUDE.md: Maalbaan Admin

Vendor admin panel for manage.maalbaan.com. React 18 + TypeScript + Vite, plain CSS from the Maalban design kit (`src/design/*.css`, same tokens as the app and website: tokens only, never hard-code hex, 44px targets, 3px focus ring, sentence case, no emoji). The design is `design-kit/Admin.dc.html` and the two screenshots beside it; do not copy the `.dc.html` template format.

- API: `Maalbaan Project/server` (Cloudflare Worker + D1). This panel calls `/v1/manage/*` (`src/api.ts`); staff sign-in is an HttpOnly cookie, so no token ever lives in JS. Rules for licence state live in the server's `src/status.ts` and mirror the app's `licenseStatusFor`.
- Errors from the API are plain sentences meant to be shown as they are (`ApiError.message`).
- Add screens as routes in `src/main.tsx`, using `<Page>` from `src/Shell.tsx`; add the menu item to `NAV` in `Shell.tsx`.
- Do not add dependencies without asking. `npm run build` and `npm test` must pass.
- Read `README.md` for screens, local run and deploy.
