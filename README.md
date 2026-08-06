# Service Engineer Trip Tracking & TA/DA Management App

Full-stack implementation: **React Native (Expo)** mobile app + **Node.js/Express + MongoDB** backend.

## Folder structure

```
service-engineer-app/
├── App.js                     # App entry
├── app.json                   # Expo config (permissions etc.)
├── package.json
├── src/
│   ├── screens/                # Login, Dashboard, NewTrip, RoundTrip, StayTrip, TripSummary, PastTrips
│   │                           # + AdminDashboard, AdminTrips, AdminTripDetail, AdminEngineers
│   ├── navigation/AppNavigator.js   # branches to the engineer stack or the admin stack based on user.role
│   ├── context/                # AuthContext, TripContext (app-wide state)
│   ├── services/                # api.js, authService.js, tripService.js, adminService.js (backend calls)
│   ├── utils/                   # taDaCalculator.js, distanceCalculator.js (core business logic)
│   ├── components/              # AppButton, Card, StatBox
│   └── theme/theme.js           # Blue professional theme, spacing, typography
└── backend/
    ├── server.js
    ├── config/db.js
    ├── models/                  # User.js (role: engineer|admin), Trip.js (receipts stored as Buffers)
    ├── controllers/             # authController.js, tripController.js, adminController.js
    ├── routes/                  # authRoutes.js, tripRoutes.js, adminRoutes.js
    ├── middleware/               # auth.js (JWT), adminOnly.js, upload.js (multer, in-memory)
    └── scripts/createAdmin.js    # CLI script to create/promote an admin user
```

## What's new in this version

**1. Receipts are stored in MongoDB, not on disk.**
Uploaded ticket/hotel/food receipts (images or PDFs, up to 8MB) are saved as
`Buffer` fields directly on the `Trip` document instead of being written to
`backend/uploads/`. At ~100 users this is simpler to run and back up — one
database, no separate file storage/CDN to provision, and receipts move with
the trip record if you ever migrate databases. The heavy bytes are excluded
from normal trip list/detail queries (`select: false`) so dashboards and
trip lists stay fast; they're only pulled in by the dedicated
`GET /api/trips/:id/receipts/:receiptId` route, which streams them back out
with the correct `Content-Type`. If a deployment later needs to support much
larger files or heavier upload volume, swapping this route for S3/GridFS is
a small, contained change — everything else stays the same.

**2. In-app Admin section.**
The `User` model already had a `role: 'engineer' | 'admin'` field — this
build wires it up. Admin accounts are **not** created through the public
sign-up flow (only engineers can self-register); instead you provision them
from the server with:

```bash
cd backend
npm run create-admin -- "Admin Name" admin@company.com ADM001 aStrongPassword123
```

An admin logs in through the exact same Login screen as engineers. Based on
`user.role`, the app then shows a completely separate stack of screens:

- **Admin Dashboard** — engineer count, total/this-month trips, pending
  approvals, approved/rejected counts, distance covered, pending vs.
  approved reimbursement totals.
- **All Trips** — every engineer's trips, filterable by status (Pending /
  Approved / Rejected / All), tap through to detail.
- **Trip Detail** — full trip breakdown, TA/DA and expense totals, uploaded
  receipts (viewable inline), and Approve/Reject actions with an optional
  note back to the engineer.
- **Engineers** — every engineer with a quick activity summary (trip count,
  distance, pending approvals, total reimbursed); tap through to see just
  their trips.

All of this is served by new `/api/admin/*` routes, protected by an
`adminOnly` middleware — engineer accounts get a `403` if they try to call
them directly.

## 1. Run the backend

```bash
cd backend
npm install
cp .env.example .env      # then edit MONGO_URI / JWT_SECRET
npm run dev                # requires nodemon, or `npm start`
```

Make sure MongoDB is running locally, or point `MONGO_URI` at a MongoDB Atlas cluster.

Test it's alive: `GET http://localhost:5000/api/health` → `{ "status": "ok" }`

### Create a test user

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ravi Kumar","employeeId":"EMP1001","email":"ravi@company.com","password":"test1234"}'
```

Then log in with `employeeId: EMP1001`, `password: test1234`.

### Create the admin account

There's no public "sign up as admin" endpoint on purpose. Create (or promote)
an admin user directly on the server:

```bash
npm run create-admin -- "Admin Name" admin@company.com ADM001 aStrongPassword123
```

Log in with `employeeId: ADM001` and that password — the app will show the
Admin Dashboard instead of the engineer flow automatically, based on the
account's `role`.

## 2. Run the mobile app

```bash
npm install
```

Edit `src/services/api.js` and set `BASE_URL` to your backend's LAN IP (not `localhost`, since your phone is a separate device on the network), e.g.:

```js
export const BASE_URL = 'http://192.168.1.10:5000/api';
```

Then start Expo:

```bash
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) or run on a simulator.

> Note: `react-native-maps` requires a custom dev client or EAS build for full native map support (it will not work in the default Expo Go on some SDKs for Android without a Google Maps API key). For quickest testing, run on iOS Simulator/Expo Go first, or generate a dev build with `eas build --profile development`.

## 3. How the core logic works

**TA/DA calculation** (`src/utils/taDaCalculator.js`, mirrored server-side in `backend/utils/taDaCalculator.js` as the source of truth):
- Bike → distance × ₹3/km
- Car → distance × ₹4.5/km
- Bus / Train → manual entry from uploaded ticket, no formula

**Distance calculation** (`src/utils/distanceCalculator.js`): Haversine formula summed across GPS points collected via `expo-location`'s `watchPositionAsync` during Start Trip → Reach Site → Complete & Return.

**Trip flow state machine** (`src/context/TripContext.js`):
`draft → in_progress → at_site → returning → completed → submitted`

## What changed in this review pass

**1. Stay-trip receipts (hotel/food/other) now actually reach MongoDB.**
Previously, `StayTripScreen` only kept the picked photo's local `uri` in
React state — it was never uploaded, so hotel/food bills never made it into
the database (only the bus/train ticket, from `TripSummaryScreen`, did).
Now, each stay expense photo is uploaded to `POST /trips/:id/receipts`
**immediately** when the engineer taps "Add Expense," with the amount/notes
attached — so it's safely in the database as soon as it's captured, not just
at final submit. If the upload fails (e.g. spotty signal at a site), the
expense is flagged "⚠ will retry on submit," and `TripSummaryScreen` makes
one more attempt for any flagged item before the trip is submitted, so a
receipt is never silently dropped.

**2. Fixed a mislabeled-file bug for ticket receipts.**
The bus/train ticket upload hardcoded `type: 'image/jpeg'` regardless of the
actual file — so a PDF ticket would be stored and served back with the
wrong content type (breaking the PDF preview/download on the admin side).
It now reads the real `mimeType`/`name` from the picker result.

**3. Admin can now see receipts without opening every trip.**
- **All Trips / Pending Requests list** — each trip card now shows small
  thumbnails (or a "PDF" chip for non-image receipts) plus a document count,
  so an admin can spot-check that something was uploaded before even opening
  the trip.
- **Engineers list** — each engineer's card now shows total receipts
  uploaded and, if any of their trips are still `submitted`, how many
  receipts are awaiting review.
- The full-resolution, tap-to-open receipt viewer on the **Trip Detail /
  Review** screen was already in place and is unchanged.

**4. Dependency / deprecation review.**
- The `punycode` `DEP0040` warning does **not** come from this app's own
  backend dependencies — `backend/package-lock.json` already pins
  `mongoose@8.24.1` → `mongodb@6.20.0`, whose `whatwg-url`/`tr46` chain uses
  the safe `require("punycode/")` (userland package), not Node's deprecated
  built-in. A clean `npm install` in `backend/` reproduces no warning.
- The actual source, traced by installing the frontend and grepping
  `node_modules`, is **Expo 51's own CLI tooling**:
  `expo@51.0.39 → @expo/cli → node-fetch@2.7.0 → whatwg-url@5.0.0`, which
  does `require("punycode")` (no trailing slash, so it hits Node's built-in
  module directly). This only fires when you run an `expo`/CLI command
  (`expo start`, `npm install`, etc.) — it's a Node-version-vs-CLI-tooling
  warning, not something in the shipped app bundle, and it's harmless.
  The only real fix is upgrading past Expo SDK 51 (see below) — there's
  nothing to patch in this repo's own code for it.
- No deprecated React/React Native lifecycle methods, `expo-permissions`
  (removed API), or other legacy Expo APIs are used anywhere in `src/`.
  `ImagePicker.MediaTypeOptions` is still the *correct* API for the
  currently-pinned `expo-image-picker@15` (SDK 51) — it only becomes
  deprecated once you upgrade to `expo-image-picker@16`+, where it should
  be swapped for the `mediaTypes: ['images']` array form.

### Recommended next steps (not applied — flagging for a planned, tested pass)

- **Upgrade off Expo SDK 51.** It's several major SDKs behind (current is
  57) and `npm install` already prints "no longer supported" warnings for
  `@react-navigation/*` v6 and several transitive packages. This is a bigger,
  test-on-device job (each native module — maps, location, image/document
  picker, secure-store, datetimepicker — needs to move in lockstep per
  Expo's compatibility table), so it's worth doing as its own dedicated pass
  rather than folded into this one.
- Add server-side request validation (`zod`/`joi`) on the trip/admin routes.
- Add pagination to `/api/admin/trips` (currently capped at 500, fine for
  now, but worth revisiting as trip volume grows).
- Consider push notifications (Expo Notifications) so an engineer is told
  the moment a submitted trip is approved/rejected, instead of having to
  check the dashboard.
- Automated tests (none exist yet) — at minimum around `taDaCalculator.js`
  and `distanceCalculator.js`, since those drive real reimbursement amounts.

## What's stubbed vs. production-ready

Production-ready: navigation, screens, TA/DA math, distance math, trip state machine, REST API, JWT auth, MongoDB schemas, receipt upload/storage (in MongoDB), in-app admin section (dashboard, trip review/approval, engineer activity).

You'll likely want to add before shipping:
- Push notifications (Expo Notifications) for approval status updates
- Background location tracking permissions flow (iOS requires extra App Store justification)
- Refresh tokens / token expiry handling
- Input validation library (e.g. `zod`/`joi`) on the backend routes
- Automated tests
- If usage grows well past ~100 users or receipts get large/frequent, move receipt storage from MongoDB Buffers to S3/GridFS (the `getReceiptFile` route is the only place that would need to change)
