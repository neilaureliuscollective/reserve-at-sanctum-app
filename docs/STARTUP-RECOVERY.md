# Reserve startup recovery — October 4, 2026

Neil reported a gray screen opening the live app from Vercel. The existing
Chrome session did not reproduce that phone-specific failure. Inspection found
unbounded optional identity reads before entrance rendering, public proxy auth
refresh ahead of streaming, and no root startup loading/recovery boundary.

Public proxy routes now pass through immediately. Optional identity and visit
presentation have 1.8-second deadlines and fall back without redirecting to
sign-in. Public identity is read-only; private getUser checks, database-owned
roles, account provisioning, and API permissions remain authoritative.

Root loading renders a usable Reserve entrance while data streams. Global
errors have self-contained colors and ordinary reload/install links, so they
do not depend on the failed layout or client router. Existing icons and PWA
identity/start URL remain intact.

Verification: production build/TypeScript, startup unit tests, production
browser regression, and a real production-server test with a deliberately
nonresponding Auth service and stored session cookie. The latter checks early
visible loading, public fallback, threshold navigation, and `/enter` launch.
The deadline does not cancel the underlying read; it prevents that read from
blocking presentation. It must not wrap mutations or private authorization.

This fixes verified startup failure paths, not a proven diagnosis of Neil's
device. Phone verification remains the final check for the reported symptom.
