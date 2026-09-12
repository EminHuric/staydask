# Agency integration

MsEe Central sells stays for accounts on this platform and writes the bookings
it brings straight into this database. This file is the whole contract.

## The shape of it

There is no API and no server on either side. MsEe Central signs in to **this**
Firebase project (`apartmens-saas`) as a dedicated account and writes a booking
document, subject to the rules in `firestore.rules`. Nothing is exported, nothing
is copied, and no scheduled job runs anywhere.

The RMS stays the source of truth for units, availability and every booking.
MsEe Central reads all of them — it has to, because a booking the owner took on
the phone blocks a unit exactly as firmly as one of theirs — and counts only its
own as sales.

## Switching it on

Two flags, both in the Admin panel, both main-admin only:

1. **Mark as agency** on the account MsEe Central signs in as. It stays a
   regular user — it does not need, and should not be given, the admin role.
   Guarded in the rules the same way `mainAdmin` is, because the self-update path
   would otherwise let any account grant itself an agency's write access.
2. **Allow agency bookings** on each account that wants the agency selling for
   it. Without this the agency cannot see the account at all, and any booking it
   somehow attempted would be refused.

Both are reversible, and revoking the second stops new agency bookings
immediately AND hides the account from the agency again — bookings already made
stay, because they are real stays.

Until an account switches the second flag on, the agency cannot even see that
the account exists.

## What the agency account can do

| | |
|---|---|
| Read the accounts that allowed it, and their apartments and bookings | yes — and **only** those, so it needs no admin role and cannot enumerate the platform |
| Create a booking stamped as theirs | yes, in accounts that allowed it |
| Correct or cancel a booking it created | yes |
| Change a booking this account entered | **no** |
| Change an apartment's name, price or capacity | **no** — only `bookedNights` |
| Touch guests, notes or invite codes | **no** |
| Delete anything | **no** — it cancels, which keeps the record |

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
