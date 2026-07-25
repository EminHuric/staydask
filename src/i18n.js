// src/i18n.js
// Lightweight, dependency-free i18n. Keys ARE the English source strings, so
// English works with zero maintenance (fallback = key). Only the Serbian map
// below is maintained. Use {var} placeholders for interpolation.
//
//   import { t } from '@/i18n'
//   t('Reservations')                    -> "Rezervacije" (sr) / "Reservations" (en)
//   t('{n} nights', { n: 3 })            -> "3 noći"
//
// t() reads the reactive locale, so any template/computed that calls it updates
// automatically when the language is switched.

import { reactive } from 'vue'

/** Serbian (Latin) translations, keyed by the English source string. */
const SR = {
  // ── Navigation / layout ────────────────────────────────────────────
  'Dashboard': 'Početna',
  'Calendar': 'Kalendar',
  'Bookings': 'Rezervacije',
  'Apartments': 'Apartmani',
  'Guests': 'Gosti',
  'Notes': 'Beleške',
  'Analytics': 'Analitika',
  'Finance': 'Finansije',
  'Home': 'Početna',
  'Profile': 'Profil',
  'Admin': 'Admin',
  'Booking Calendar': 'Kalendar rezervacija',
  'Reservations': 'Rezervacije',
  'Guest CRM': 'Baza gostiju',
  'Analytics & Finance': 'Analitika i finansije',
  'Admin Panel': 'Admin panel',
  'Sign out': 'Odjava',
  'Sign Out': 'Odjava',
  'Owner': 'Vlasnik',
  'Administrator': 'Administrator',
  'Workspace Owner': 'Vlasnik naloga',
  'User': 'Korisnik',
  'Live': 'Uživo',

  // ── Account switcher ───────────────────────────────────────────────
  'Switch account': 'Promeni nalog',
  '+ Add account': '+ Dodaj nalog',
  'Switching…': 'Prebacujem…',
  'Remove account from this device': 'Ukloni nalog sa ovog uređaja',
  'Password for {email} changed — account removed. Sign in again to add it.':
    'Lozinka za {email} je promenjena — nalog je uklonjen. Prijavi se ponovo da ga dodaš.',

  // ── Common ─────────────────────────────────────────────────────────
  'Edit': 'Izmeni',
  'Delete': 'Obriši',
  'Cancel': 'Otkaži',
  'Close': 'Zatvori',
  'Save': 'Sačuvaj',
  'Save Changes': 'Sačuvaj izmene',
  'Saving…': 'Čuvam…',
  'Deleting…': 'Brišem…',
  'Clear': 'Poništi',
  'Total': 'Ukupno',
  'total': 'ukupno',
  'Paid': 'Plaćeno',
  'Unpaid': 'Neplaćeno',
  'Deposit': 'Avans',
  'Partial': 'Delimično',
  'Cancelled': 'Otkazano',
  'Unknown': 'Nepoznato',
  'guests': 'gostiju',
  'night': 'noć',
  'Active': 'Aktivna',
  'Upcoming': 'Predstojeća',
  'Past': 'Prošla',

  // ── Dashboard ──────────────────────────────────────────────────────
  'Good morning': 'Dobro jutro',
  'Good afternoon': 'Dobar dan',
  'Good evening': 'Dobro veče',
  'Open Calendar': 'Otvori kalendar',
  'Active Now': 'Trenutno aktivne',
  'Expected Revenue': 'Očekivani prihod',
  'Collected': 'Naplaćeno',
  'Outstanding': 'Nenaplaćeno',
  'Notifications': 'Obaveštenja',
  'All clear for today!': 'Sve je čisto za danas!',
  'Active Guests': 'Trenutni gosti',
  'All →': 'Sve →',
  'No guests checked in right now.': 'Trenutno nema prijavljenih gostiju.',
  'leaves {date}': 'odlazi {date}',
  'Arriving Today': 'Dolaze danas',
  'No arrivals today.': 'Nema dolazaka danas.',
  'Departing Today': 'Odlaze danas',
  'No departures today.': 'Nema odlazaka danas.',
  'Recent Reservations': 'Nedavne rezervacije',
  'View all →': 'Prikaži sve →',
  'No reservations yet.': 'Još nema rezervacija.',
  'Guest': 'Gost',
  'Apartment': 'Apartman',
  'Check-in': 'Dolazak',
  'Nights': 'Noći',
  'Payment': 'Plaćanje',

  // Notification badges + text
  'New': 'Novo',
  'Today': 'Danas',
  'Tomorrow': 'Sutra',
  'This week': 'Ove nedelje',
  'New reservation from {g}': 'Nova rezervacija — {g}',
  '{g} is checking in today': '{g} se prijavljuje danas',
  '{g} is checking out today': '{g} se odjavljuje danas',
  '{g} arrives tomorrow': '{g} stiže sutra',
  '{g} — payment pending ({amount} owed)': '{g} — plaćanje na čekanju (duguje {amount})',
  '{g} — payment pending': '{g} — plaćanje na čekanju',
  '{g} arrives on {date}': '{g} stiže {date}',

  // ── Reservations (BookingsView) ────────────────────────────────────
  '{n} reservations': '{n} rezervacija',
  '+ New Reservation': '+ Nova rezervacija',
  'Search guest, ID, apartment…': 'Pretraži gosta, ID, apartman…',
  'All Apartments': 'Svi apartmani',
  'All Payment Status': 'Sva plaćanja',
  'Deposit Paid': 'Avans plaćen',
  'Partially Paid': 'Delimično plaćeno',
  'Fully Paid': 'Plaćeno u celosti',
  'All Reservations': 'Sve rezervacije',
  'No reservations found.': 'Nema pronađenih rezervacija.',
  'Dates': 'Datumi',
  'Owed': 'Duguje',
  '← Prev': '← Nazad',
  'Next →': 'Napred →',
  // mini tags
  '⭐ VIP': '⭐ VIP',
  '🌙 Late': '🌙 Kasni',
  '🌅 Early': '🌅 Rani',
  '👶 Baby': '👶 Beba',
  '🐾 Pet': '🐾 Ljubimac',
  '📝 Special': '📝 Poseban',
  '🔄 Repeat': '🔄 Stalni',
  '📅 Long': '📅 Dug',

  // ── Calendar ───────────────────────────────────────────────────────
  'Today (button)': 'Danas',
  '+ New Booking': '+ Nova rezervacija',
  'No apartments yet': 'Još nema apartmana',
  'Add your apartments': 'Dodajte apartmane',
  'to start managing bookings on the calendar.': 'da počnete da upravljate rezervacijama u kalendaru.',
  'Available': 'Slobodno',

  // ── Booking modal ──────────────────────────────────────────────────
  'Edit Reservation': 'Izmena rezervacije',
  'New Reservation': 'Nova rezervacija',
  'Full Name *': 'Ime i prezime *',
  'Search existing or type new name…': 'Pretraži postojećeg ili upiši novo ime…',
  'Phone': 'Telefon',
  'Country / City': 'Država / Grad',
  'e.g. Zagreb, Croatia': 'npr. Beograd, Srbija',
  'Reservation': 'Rezervacija',
  'Apartment *': 'Apartman *',
  'Select apartment…': 'Izaberite apartman…',
  'Check-in *': 'Dolazak *',
  'Check-out *': 'Odlazak *',
  '{n} nights': '{n} noći',
  '{n} night': '{n} noć',
  '✗ Taken — {guest} is booked {a} → {b}': '✗ Zauzeto — {guest} je rezervisao {a} → {b}',
  '✓ Available for these dates': '✓ Slobodno za izabrane datume',
  'Pricing': 'Cena',
  'Price / Night (€)': 'Cena / noć (€)',
  'Deposit Amount (€)': 'Iznos avansa (€)',
  'Total ({n}n × €{price})': 'Ukupno ({n}n × €{price})',
  'Remaining after deposit': 'Ostatak nakon avansa',
  'Deposit received / paid': 'Avans primljen / plaćen',
  'Notes & Tags': 'Beleške i oznake',
  'Private Notes': 'Privatne beleške',
  'VIP guest, late arrival, baby bed needed…': 'VIP gost, kasni dolazak, potreban krevetac…',
  'Tags': 'Oznake',
  '⭐ VIP (tag)': '⭐ VIP',
  '🌙 Late Arrival': '🌙 Kasni dolazak',
  '🌅 Early Check-in': '🌅 Raniji dolazak',
  '👶 Baby Bed': '👶 Krevetac',
  '🐾 Pet (tag)': '🐾 Ljubimac',
  '📝 Special Request': '📝 Poseban zahtev',
  '🔄 Repeat Guest': '🔄 Stalni gost',
  '📅 Long Stay': '📅 Duži boravak',
  '💰 Payments': '💰 Plaćanja',
  'Create Reservation': 'Kreiraj rezervaciju',
  'Cancel Reservation?': 'Otkazati rezervaciju?',
  'The reservation will be marked as': 'Rezervacija će biti označena kao',
  'and the apartment will be freed. Payment history is preserved. This cannot be undone.':
    'i apartman će biti oslobođen. Istorija plaćanja se čuva. Ovo se ne može poništiti.',
  'Keep': 'Zadrži',
  'Yes, Cancel It': 'Da, otkaži',
  'Check-out must be after check-in.': 'Odjava mora biti nakon prijave.',
  'Failed to save.': 'Čuvanje nije uspelo.',

  // ── Payment panel ──────────────────────────────────────────────────
  'Payments': 'Plaćanja',
  'Partially Paid (status)': 'Delimično plaćeno',
  'Remaining': 'Ostatak',
  'Cannot add payments to a cancelled reservation.': 'Nije moguće dodati plaćanje otkazanoj rezervaciji.',
  'Deposit paid': 'Avans plaćen',
  'Mark fully paid': 'Označi kao plaćeno',
  '✓ Fully paid': '✓ Plaćeno u celosti',
  '{pct}% paid': '{pct}% plaćeno',
  'Enter a custom amount': 'Unesi drugi iznos',
  'Amount (€) *': 'Iznos (€) *',
  'Date *': 'Datum *',
  'Type': 'Vrsta',
  'Payment (type)': 'Uplata',
  'Refund': 'Povraćaj',
  'Note': 'Napomena',
  'e.g. Cash, Transfer…': 'npr. Gotovina, Transfer…',
  'Adding…': 'Dodajem…',
  '+ Add Payment': '+ Dodaj plaćanje',
  'Amount must be greater than 0.': 'Iznos mora biti veći od 0.',
  'Deposit Pending': 'Avans na čekanju',
  'Payment History': 'Istorija plaćanja',
  'No payments recorded yet.': 'Još nema evidentiranih plaćanja.',
  'Remove payment': 'Ukloni plaćanje',
  'Paid in full': 'Plaćeno u celosti',
  'DEP': 'AVN',
  'REF': 'POV',
  'PMT': 'UPL',

  // ── Guests ─────────────────────────────────────────────────────────
  '{n} guests in database': '{n} gostiju u bazi',
  '+ Add Guest': '+ Dodaj gosta',
  'Search by name, phone, email, country…': 'Pretraga po imenu, telefonu, mejlu, državi…',
  'No guests found': 'Nema pronađenih gostiju',
  'No guests yet': 'Još nema gostiju',
  'Guests are added automatically when you create bookings.': 'Gosti se automatski dodaju kada napravite rezervaciju.',
  '{n} stays': '{n} boravaka',
  'Last: {date}': 'Poslednji: {date}',
  'Edit Guest': 'Izmena gosta',
  'Add Guest': 'Dodaj gosta',
  'Email': 'Email',
  'Country': 'Država',
  'Origin / City': 'Poreklo / Grad',
  'Any notes about this guest…': 'Bilo kakve beleške o gostu…',
  'Stays': 'Boravci',
  'Total Spent': 'Ukupno potrošeno',
  'Last Reservation': 'Poslednja rezervacija',
  'Booking History': 'Istorija rezervacija',
  'No bookings yet.': 'Još nema rezervacija.',
  '{price}/night': '{price}/noć',
  'owed': 'duguje',
  '✓ Paid': '✓ Plaćeno',
  'Edit →': 'Izmeni →',

  // ── Apartments ─────────────────────────────────────────────────────
  '{n} apartments in your workspace': '{n} apartmana u vašem nalogu',
  '+ Add Apartment': '+ Dodaj apartman',
  'Add your first apartment to start managing bookings.': 'Dodajte prvi apartman da počnete da upravljate rezervacijama.',
  '{n} guests max': 'maks. {n} gostiju',
  '📊 Stats': '📊 Statistika',
  '✏️ Edit': '✏️ Izmeni',
  '🗑 Delete': '🗑 Obriši',
  'Occupancy': 'Popunjenost',
  'Status': 'Status',
  'Next Check-in': 'Sledeći dolazak',
  'Active (apt)': 'Aktivan',
  'Total Bookings': 'Ukupno rezervacija',
  'Nights Sold': 'Prodatih noći',
  'Expected': 'Očekivano',
  'Occupancy (yr)': 'Popunjenost (god.)',
  'Avg / Night': 'Prosek / noć',
  'Available Days': 'Slobodnih dana',
  'Payment Breakdown': 'Pregled plaćanja',
  'Recent Bookings': 'Nedavne rezervacije',
  'No bookings for this apartment.': 'Nema rezervacija za ovaj apartman.',
  'Edit Apartment': 'Izmena apartmana',
  'Add Apartment': 'Dodaj apartman',
  'Apartment Name *': 'Naziv apartmana *',
  'e.g. Ocean Suite A': 'npr. Apartman A',
  'Color': 'Boja',
  'Max Guests *': 'Maks. gostiju *',
  'Default Price / Night (€)': 'Podrazumevana cena / noć (€)',
  'Description': 'Opis',
  'Short description of the apartment…': 'Kratak opis apartmana…',
  'Features': 'Sadržaji',
  'Delete Apartment': 'Brisanje apartmana',
  'This will not delete existing bookings but they will lose their apartment reference.':
    'Ovo neće obrisati postojeće rezervacije, ali će one izgubiti vezu sa apartmanom.',
  'Are you sure you want to delete': 'Da li ste sigurni da želite da obrišete',
  // feature labels
  '🌊 Sea View': '🌊 Pogled na more',
  '⛰️ Mountain View': '⛰️ Pogled na planinu',
  '🏊 Pool': '🏊 Bazen',
  '🏖️ Beach Access': '🏖️ Pristup plaži',
  '🌿 Balcony': '🌿 Balkon',
  '☀️ Terrace': '☀️ Terasa',
  '🌳 Garden': '🌳 Bašta',
  '📶 WiFi': '📶 WiFi',
  '🅿️ Parking': '🅿️ Parking',
  '❄️ Air Conditioning': '❄️ Klima',
  '🍳 Kitchen': '🍳 Kuhinja',
  '🧺 Washing Machine': '🧺 Veš mašina',
  '🐾 Pets Allowed': '🐾 Ljubimci dozvoljeni',

  // ── Notes ──────────────────────────────────────────────────────────
  'Your private notes. Only you and the platform administrator can see them.':
    'Vaše privatne beleške. Vidite ih samo vi i administrator platforme.',
  'Write a note, reminder or message for the admin…': 'Napišite belešku, podsetnik ili poruku za administratora…',
  'Tip: Ctrl + Enter to save': 'Savet: Ctrl + Enter za čuvanje',
  'Add note': 'Dodaj belešku',
  'No notes yet': 'Još nema beleški',
  'Add a note above — anything you want to remember or share with the admin.':
    'Dodajte belešku iznad — bilo šta što želite da zapamtite ili podelite sa administratorom.',
  'You': 'Vi',
  'Delete note': 'Obriši belešku',
  'just now': 'upravo sad',

  // ── Analytics ──────────────────────────────────────────────────────
  'Full financial overview': 'Potpuni finansijski pregled',
  'Total Collected': 'Ukupno naplaćeno',
  'Outstanding Balance': 'Nenaplaćeni saldo',
  'Reservations {year}': 'Rezervacije {year}',
  'Monthly Revenue — {year}': 'Mesečni prihod — {year}',
  'By Apartment': 'Po apartmanu',
  'No apartments.': 'Nema apartmana.',
  '{n} bookings · {nights}n': '{n} rezervacija · {nights}n',
  '{pct}% occ.': '{pct}% pop.',
  'Month-by-Month': 'Po mesecima',
  'Month': 'Mesec',
  'Avg/Night': 'Prosek/noć',
  'Total {year}': 'Ukupno {year}',
  // month names
  'January': 'Januar', 'February': 'Februar', 'March': 'Mart', 'April': 'April',
  'May': 'Maj', 'June': 'Jun', 'July': 'Jul', 'August': 'Avgust',
  'September': 'Septembar', 'October': 'Oktobar', 'November': 'Novembar', 'December': 'Decembar',
  'Jan': 'Jan', 'Feb': 'Feb', 'Mar': 'Mar', 'Apr': 'Apr', 'Jun': 'Jun', 'Jul': 'Jul',
  'Aug': 'Avg', 'Sep': 'Sep', 'Oct': 'Okt', 'Nov': 'Nov', 'Dec': 'Dec',

  // ── Global search ──────────────────────────────────────────────────
  'Search…': 'Pretraga…',
  'Search (Ctrl+K)': 'Pretraga (Ctrl+K)',
  'Search bookings, guests, apartments…': 'Pretraži rezervacije, goste, apartmane…',
  'No results for "{q}"': 'Nema rezultata za „{q}"',
  'Start typing to search across all data': 'Počnite da kucate za pretragu svih podataka',
  'navigate': 'kretanje',
  'select': 'izbor',
  'close': 'zatvori',
  '{n} guests · {price}/night': '{n} gostiju · {price}/noć',
  'Open dashboard →': 'Otvori početnu →',
  "You're all caught up.": 'Sve je pregledano.',

  // ── Login / setup ──────────────────────────────────────────────────
  'Reservation Management System': 'Sistem za upravljanje rezervacijama',
  '🎟 Invite Code': '🎟 Pozivni kod',
  '🔑 Login': '🔑 Prijava',
  'Invite Code': 'Pozivni kod',
  'Your Name': 'Vaše ime',
  'Create Password': 'Kreiraj lozinku',
  'min. 6 characters': 'min. 6 karaktera',
  'Creating account…': 'Kreiram nalog…',
  'Create My Workspace →': 'Kreiraj moj nalog →',
  'Password': 'Lozinka',
  'your password': 'vaša lozinka',
  'Signing in…': 'Prijavljivanje…',
  'Sign In →': 'Prijavi se →',
  'Forgot password?': 'Zaboravljena lozinka?',
  "We'll email you a link to reset your password.": 'Poslaćemo vam link za resetovanje lozinke na email.',
  'Sending…': 'Šaljem…',
  'Send': 'Pošalji',
  '✓ Reset link sent — check your inbox and spam folder.': '✓ Link je poslat — proverite inbox i spam folder.',
  'Need access? Contact your administrator for an invite code.': 'Treba vam pristup? Kontaktirajte administratora za pozivni kod.',
  'First-time Setup': 'Prvo podešavanje',
  'Admin account created!': 'Admin nalog je kreiran!',
  'Redirecting you to the app…': 'Preusmeravanje u aplikaciju…',
  'Welcome! Create your': 'Dobrodošli! Kreirajte svoj',
  'super admin': 'glavni admin',
  'account to get started. This page only appears once — when no accounts exist yet.':
    'nalog da započnete. Ova stranica se prikazuje samo jednom — dok još ne postoji nijedan nalog.',
  'Creating account… (setup)': 'Kreiram nalog…',
  'Create Admin Account →': 'Kreiraj admin nalog →',
  'Already have an account?': 'Već imate nalog?',
  'Sign in': 'Prijavite se',
  'e.g. Marco': 'npr. Marko',

  // ── Admin panel ────────────────────────────────────────────────────
  'Manage accounts, access and invite codes': 'Upravljanje nalozima, pristupom i pozivnim kodovima',
  'Invite as admin': 'Pozovi kao admin',
  '+ Generate Invite Code': '+ Generiši pozivni kod',
  'Platform Overview': 'Pregled platforme',
  'Accounts': 'Nalozi',
  "Each account's apartments, bookings and guests stay private — admins only see these totals and counts, never the actual data.":
    'Apartmani, rezervacije i gosti svakog naloga ostaju privatni — administratori vide samo ove zbirne brojeve, nikada stvarne podatke.',
  'User Accounts': 'Korisnički nalozi',
  'Search name or email…': 'Pretraži ime ili email…',
  'No users registered yet.': 'Još nema registrovanih korisnika.',
  'No users match your search.': 'Nijedan korisnik ne odgovara pretrazi.',
  'you': 'vi',
  'Main admin': 'Glavni admin',
  'admin': 'admin',
  'user': 'korisnik',
  'Disabled (status)': 'Onemogućen',
  'Active (account)': 'Aktivan',
  'Joined': 'Pridružen',
  '👁 View data': '👁 Pregled podataka',
  '📝 Notes': '📝 Beleške',
  'Your account — owner (protected).': 'Vaš nalog — vlasnik (zaštićen).',
  'This is you.': 'Ovo ste vi.',
  'Step down to user': 'Pređi na korisnika',
  'protected account.': 'zaštićen nalog.',
  'Demote': 'Snizi',
  'Make admin': 'Postavi za admina',
  'Remove main': 'Ukloni glavnog',
  'Make main': 'Postavi za glavnog',
  'Reset password': 'Resetuj lozinku',
  'Enable': 'Omogući',
  'Disable': 'Onemogući',
  'Invite Codes': 'Pozivni kodovi',
  'New code generated — share this with your user:': 'Novi kod je generisan — podelite ga sa korisnikom:',
  '✓ Copied': '✓ Kopirano',
  'Copy': 'Kopiraj',
  'No invite codes yet. Generate one to add users.': 'Još nema pozivnih kodova. Generišite jedan da dodate korisnike.',
  'Admin invite': 'Admin pozivnica',
  'Used by {name}': 'Iskoristio {name}',
  'Available (code)': 'Dostupan',
  'Inactive': 'Neaktivan',
  'Total Codes': 'Ukupno kodova',
  'Codes Used': 'Iskorišćeni kodovi',
  'Disabled Accounts': 'Onemogućeni nalozi',
  'Firebase Setup Note:': 'Napomena o Firebase podešavanju:',
  'Security rules live in': 'Sigurnosna pravila se nalaze u',
  'at the project root — deploy them with': 'u korenu projekta — objavite ih komandom',
  'so users and invite codes stay scoped to your workspace.': 'da bi korisnici i pozivni kodovi ostali vezani za vaš prostor.',
  'Notes — {name}': 'Beleške — {name}',
  'Visible only to this user and admins.': 'Vidljivo samo ovom korisniku i administratorima.',
  'Leave a note or message for this user…': 'Ostavite belešku ili poruku za ovog korisnika…',
  'Send note': 'Pošalji belešku',
  'No notes yet for this account.': 'Još nema beleški za ovaj nalog.',
  "Read-only — you can view this account's data but not change it.":
    'Samo za čitanje — možete videti podatke ovog naloga, ali ih ne možete menjati.',
  'Loading…': 'Učitavanje…',
  'No bookings.': 'Nema rezervacija.',
  'No guests.': 'Nema gostiju.',
  'cancelled': 'otkazano',
  'no phone': 'bez telefona',
  // Admin confirms + flash messages
  'Make {name} a MAIN admin? Main admins are protected and can manage other admins.':
    'Postaviti {name} za GLAVNOG admina? Glavni administratori su zaštićeni i mogu upravljati drugim administratorima.',
  'Remove main-admin status from {name}?': 'Ukloniti status glavnog admina korisniku {name}?',
  '{name} is now a main admin.': '{name} je sada glavni admin.',
  '{name} is no longer a main admin.': '{name} više nije glavni admin.',
  'Could not change main-admin status: {err}': 'Nije moguće promeniti status glavnog admina: {err}',
  'Step down from admin? You become a regular user and lose the Admin panel. Your data stays.':
    'Odstupiti sa mesta admina? Postajete običan korisnik i gubite Admin panel. Vaši podaci ostaju.',
  'Could not step down: {err}': 'Nije moguće odstupiti: {err}',
  'permission denied — re-deploy the Firestore rules (firebase deploy --only firestore:rules)':
    'pristup odbijen — ponovo objavite Firestore pravila (firebase deploy --only firestore:rules)',
  'Could not generate code: {err}': 'Nije moguće generisati kod: {err}',
  "Delete invite code {code}? This can't be undone.": 'Obrisati pozivni kod {code}? Ovo se ne može poništiti.',
  'Invite code {code} deleted.': 'Pozivni kod {code} je obrisan.',
  'Could not delete code: {err}': 'Nije moguće obrisati kod: {err}',
  'Remove admin access from {name}?': 'Ukloniti admin pristup korisniku {name}?',
  '{name} is now an admin.': '{name} je sada admin.',
  '{name} is now a regular user.': '{name} je sada običan korisnik.',
  'Could not change role: {err}': 'Nije moguće promeniti ulogu: {err}',
  "Disable {name}? They won't be able to sign in until you enable them again. Their data is kept.":
    'Onemogućiti {name}? Neće moći da se prijavi dok ga ponovo ne omogućite. Podaci se čuvaju.',
  '{name} has been disabled.': '{name} je onemogućen.',
  '{name} has been enabled.': '{name} je omogućen.',
  'Could not update {name}: {err}': 'Nije moguće ažurirati {name}: {err}',
  'Delete {name}? This removes their account — they can no longer sign in. This cannot be undone.':
    'Obrisati {name}? Ovo uklanja nalog — više neće moći da se prijavi. Ovo se ne može poništiti.',
  '{name} has been deleted.': '{name} je obrisan.',
  'Could not delete {name}: {err}': 'Nije moguće obrisati {name}: {err}',
  'Reset link sent to {email} — tell them to check the spam folder too.':
    'Link za reset poslat na {email} — recite im da provere i spam folder.',
  'Could not send reset email.': 'Nije moguće poslati email za reset.',
}

/** Serbian month + weekday names for the calendar (index-aligned). */
export const MONTHS_SR = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
]
// index 0 = Sunday, to match date-fns getDay()
export const DAYS_SR = ['Ne', 'Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su']

const stored = (() => {
  try { return localStorage.getItem('rms_lang') } catch { return null }
})()

export const i18nState = reactive({
  locale: stored === 'en' || stored === 'sr' ? stored : 'sr'
})

export function setLocale(l) {
  i18nState.locale = l === 'en' ? 'en' : 'sr'
  try { localStorage.setItem('rms_lang', i18nState.locale) } catch { /* ignore */ }
}

export function toggleLocale() {
  setLocale(i18nState.locale === 'sr' ? 'en' : 'sr')
}

/**
 * Translate a key. In English mode (or when no Serbian entry exists) the key
 * itself is returned. Supports {var} interpolation.
 */
export function t(key, vars) {
  let s = (i18nState.locale === 'sr' && SR[key] != null) ? SR[key] : key
  if (vars) {
    for (const k in vars) s = s.split('{' + k + '}').join(vars[k])
  }
  return s
}

/** Localized "Month YYYY" for the calendar title. */
export function monthYear(date) {
  const m = date.getMonth()
  const y = date.getFullYear()
  if (i18nState.locale === 'sr') return `${MONTHS_SR[m]} ${y}`
  return date.toLocaleString('en-US', { month: 'long' }) + ' ' + y
}

/** Localized short weekday name from a date-fns getDay() index (0=Sun). */
export function dayShort(dowIndex, enFallback) {
  return i18nState.locale === 'sr' ? DAYS_SR[dowIndex] : enFallback
}
