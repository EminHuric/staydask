# Agency integration

MsEe Central sells stays for accounts on this platform and writes the bookings
it brings straight into this database. This file is the whole contract.

## The shape of it

There is no API and no server on either side, and **this system is not modified
to grant anybody write access.** MsEe Central signs in to this Firebase project
as an account with the existing `admin` role and *reads* — apartments, bookings,
accounts. `firestore.rules` is untouched by the integration: an administrator
could already read every account, which is exactly and only what is needed.

The RMS stays the source of truth for units, availability and every booking.
Bookings are taken here and nowhere else. MsEe Central reads all of them — it
has to, because a booking taken on the phone blocks a unit exactly as firmly as
one MsEe brought — and counts only the ones marked as its own.

## Switching it on

1. Create an account here with the **admin** role (Admin → Invite Codes → make a
   code with role admin, then register with it). Or use an existing admin login.
2. In MsEe Central: Services → StayBrain → Properties & bookings → **Connect**,
   and sign in with it.

Nothing to deploy, no flags, no rules change.

One thing worth knowing rather than discovering: an `admin` account here can read
every account on the platform and manage accounts. That is this system's existing
design, not something the integration added. If that is ever too much, the
narrower version is a rules change that confines a marked account to the
properties that opted in — one deploy, and worth doing only if somebody other
than the owner is going to hold these credentials.

## Marking a booking as the agency's

On the booking form there is a checkbox, **Booked through MsEe**, and with it a
field for **MsEe commission (%)**. Tick it, type the percentage agreed for that
stay, and the amount is worked out from the price and shown beside it.

Per booking rather than once per property, because that is how it is agreed — a
winter week and a peak August week are not the same deal. Both numbers are stored:

```js
mseeCommissionPercent: 15
mseeCommissionAmount:  75          // 15% of this booking's €500
```

MsEe Central reads the **amount**. A figure a person decided for this stay beats
a standing rule written for stays in general, so the amount wins over whatever
default the property's listing carries.

## How its bookings are marked

Four fields, all required by the rules at creation, so an agency booking can
always be told apart from one entered here:

```js
source:            'MSEE'
createdVia:        'MSEE_CENTRAL'
createdByAgency:   <the agency account's uid>
mseeReservationId: <their own reservation id>
```

The document id is `msee_<mseeReservationId>`. That is what makes a retry safe:
the same call twice writes the same document instead of booking the guest twice.

## Double booking

`checkConflict()` in `src/stores/bookings.js` compares against the bookings this
browser happens to hold. That is the right first answer — it names the guest who
is already there — but it is not a guarantee: two people booking the same
apartment in the same second both read a list without the other's booking in it.

So every apartment now carries **`bookedNights`**: the nights it is occupied, as
`YYYY-MM-DD` strings. A booking is created inside a Firestore transaction that
reads that array first, and Firestore retries a transaction whose document
changed underneath it — so the second writer re-reads, sees the first writer's
nights, and fails. Both systems go through it.

The array is a copy, and copies drift, so it is **recomputed, never adjusted**:

- `reindex(apartmentId)` rewrites one apartment's nights from the bookings
  themselves, and runs after every update, cancellation and deletion;
- `reconcileNights()` runs whenever an owner's bookings arrive, which repairs
  drift and is also how apartments that existed before the index get one.

Nothing needs migrating. The first time an owner opens their data, their
apartments gain an accurate index.

## Deploying the rules

```sh
firebase login          # once
npm run rules:deploy
```
