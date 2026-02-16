import type { SupportedLocale } from "@festapp/shared";

/**
 * Translation dictionaries for Czech, Slovak, and English (PLAT-02).
 *
 * Keys are flat dot-notation organized by feature area.
 * Czech is the primary language; Slovak and English are full translations.
 */

export type TranslationKeys = {
  // Nav
  "nav.search": string;
  "nav.myRides": string;
  "nav.messages": string;
  "nav.profile": string;
  "nav.settings": string;

  // Auth
  "auth.login": string;
  "auth.signup": string;
  "auth.logout": string;
  "auth.deleteAccount": string;
  "auth.forgotPassword": string;

  // Settings
  "settings.language": string;
  "settings.notifications": string;
  "settings.blockedUsers": string;
  "settings.help": string;
  "settings.legal": string;
  "settings.preferences": string;
  "settings.privacy": string;
  "settings.account": string;
  "settings.info": string;

  // Rides
  "rides.postRide": string;
  "rides.searchRides": string;
  "rides.departure": string;
  "rides.destination": string;
  "rides.date": string;
  "rides.seats": string;
  "rides.price": string;
  "rides.bookSeat": string;
  "rides.cancel": string;
  "rides.complete": string;

  // Booking
  "booking.instantBook": string;
  "booking.requestSeat": string;
  "booking.pending": string;
  "booking.confirmed": string;
  "booking.cancelled": string;
  "booking.reject": string;
  "booking.accept": string;

  // Chat
  "chat.typeMessage": string;
  "chat.sendMessage": string;
  "chat.contactShared": string;
  "chat.noMessages": string;

  // Profile
  "profile.editProfile": string;
  "profile.vehicles": string;
  "profile.addVehicle": string;
  "profile.bio": string;
  "profile.socialLinks": string;
  "profile.verificationBadge": string;

  // Common
  "common.loading": string;
  "common.error": string;
  "common.save": string;
  "common.cancel": string;
  "common.delete": string;
  "common.confirm": string;
  "common.noResults": string;
  "common.retry": string;
  "common.back": string;
  "common.close": string;
  "common.share": string;

  // Empty states
  "empty.noRides": string;
  "empty.noMessages": string;
  "empty.noBookings": string;
  "empty.noReviews": string;
  "empty.noEvents": string;

  // Errors
  "errors.networkError": string;
  "errors.notFound": string;
  "errors.serverError": string;
  "errors.unauthorized": string;
  "errors.rateLimited": string;
};

const cs: TranslationKeys = {
  // Nav
  "nav.search": "Hledat",
  "nav.myRides": "Moje jizdy",
  "nav.messages": "Zpravy",
  "nav.profile": "Profil",
  "nav.settings": "Nastaveni",

  // Auth
  "auth.login": "Prihlasit se",
  "auth.signup": "Registrace",
  "auth.logout": "Odhlasit se",
  "auth.deleteAccount": "Smazat ucet",
  "auth.forgotPassword": "Zapomenute heslo",

  // Settings
  "settings.language": "Jazyk",
  "settings.notifications": "Oznameni",
  "settings.blockedUsers": "Blokovani uzivatele",
  "settings.help": "Napoveda a podpora",
  "settings.legal": "Pravni informace",
  "settings.preferences": "Predvolby",
  "settings.privacy": "Soukromi",
  "settings.account": "Ucet",
  "settings.info": "Informace",

  // Rides
  "rides.postRide": "Nabidnout jizdu",
  "rides.searchRides": "Hledat jizdy",
  "rides.departure": "Odjezd",
  "rides.destination": "Cil",
  "rides.date": "Datum",
  "rides.seats": "Mista",
  "rides.price": "Cena",
  "rides.bookSeat": "Rezervovat misto",
  "rides.cancel": "Zrusit jizdu",
  "rides.complete": "Dokoncit jizdu",

  // Booking
  "booking.instantBook": "Okamzita rezervace",
  "booking.requestSeat": "Pozadat o misto",
  "booking.pending": "Ceka na schvaleni",
  "booking.confirmed": "Potvrzeno",
  "booking.cancelled": "Zruseno",
  "booking.reject": "Odmitnout",
  "booking.accept": "Prijmout",

  // Chat
  "chat.typeMessage": "Napiste zpravu...",
  "chat.sendMessage": "Odeslat zpravu",
  "chat.contactShared": "Kontakt sdilen",
  "chat.noMessages": "Zatim zadne zpravy",

  // Profile
  "profile.editProfile": "Upravit profil",
  "profile.vehicles": "Vozidla",
  "profile.addVehicle": "Pridat vozidlo",
  "profile.bio": "O mne",
  "profile.socialLinks": "Socialni site",
  "profile.verificationBadge": "Overeny uzivatel",

  // Common
  "common.loading": "Nacitani...",
  "common.error": "Chyba",
  "common.save": "Ulozit",
  "common.cancel": "Zrusit",
  "common.delete": "Smazat",
  "common.confirm": "Potvrdit",
  "common.noResults": "Zadne vysledky",
  "common.retry": "Zkusit znovu",
  "common.back": "Zpet",
  "common.close": "Zavrit",
  "common.share": "Sdilet",

  // Empty states
  "empty.noRides": "Zadne jizdy k zobrazeni",
  "empty.noMessages": "Zadne zpravy",
  "empty.noBookings": "Zadne rezervace",
  "empty.noReviews": "Zadna hodnoceni",
  "empty.noEvents": "Zadne udalosti",

  // Errors
  "errors.networkError": "Chyba site. Zkontrolujte pripojeni.",
  "errors.notFound": "Stranka nenalezena",
  "errors.serverError": "Chyba serveru. Zkuste to pozdeji.",
  "errors.unauthorized": "Nemate opravneni",
  "errors.rateLimited": "Prilis mnoho pozadavku. Zkuste to pozdeji.",
};

const sk: TranslationKeys = {
  // Nav
  "nav.search": "Hladat",
  "nav.myRides": "Moje jazdy",
  "nav.messages": "Spravy",
  "nav.profile": "Profil",
  "nav.settings": "Nastavenia",

  // Auth
  "auth.login": "Prihlasit sa",
  "auth.signup": "Registracia",
  "auth.logout": "Odhlasit sa",
  "auth.deleteAccount": "Zmazat ucet",
  "auth.forgotPassword": "Zabudnute heslo",

  // Settings
  "settings.language": "Jazyk",
  "settings.notifications": "Upozornenia",
  "settings.blockedUsers": "Blokovani pouzivatelia",
  "settings.help": "Pomoc a podpora",
  "settings.legal": "Pravne informacie",
  "settings.preferences": "Predvolby",
  "settings.privacy": "Sukromie",
  "settings.account": "Ucet",
  "settings.info": "Informacie",

  // Rides
  "rides.postRide": "Ponuknut jazdu",
  "rides.searchRides": "Hladat jazdy",
  "rides.departure": "Odchod",
  "rides.destination": "Ciel",
  "rides.date": "Datum",
  "rides.seats": "Miesta",
  "rides.price": "Cena",
  "rides.bookSeat": "Rezervovat miesto",
  "rides.cancel": "Zrusit jazdu",
  "rides.complete": "Dokoncit jazdu",

  // Booking
  "booking.instantBook": "Okamzita rezervacia",
  "booking.requestSeat": "Poziadat o miesto",
  "booking.pending": "Caka na schvalenie",
  "booking.confirmed": "Potvrdene",
  "booking.cancelled": "Zrusene",
  "booking.reject": "Odmietnut",
  "booking.accept": "Prijat",

  // Chat
  "chat.typeMessage": "Napiste spravu...",
  "chat.sendMessage": "Odoslat spravu",
  "chat.contactShared": "Kontakt zdielany",
  "chat.noMessages": "Zatial ziadne spravy",

  // Profile
  "profile.editProfile": "Upravit profil",
  "profile.vehicles": "Vozidla",
  "profile.addVehicle": "Pridat vozidlo",
  "profile.bio": "O mne",
  "profile.socialLinks": "Socialne siete",
  "profile.verificationBadge": "Overeny pouzivatel",

  // Common
  "common.loading": "Nacitavanie...",
  "common.error": "Chyba",
  "common.save": "Ulozit",
  "common.cancel": "Zrusit",
  "common.delete": "Zmazat",
  "common.confirm": "Potvrdit",
  "common.noResults": "Ziadne vysledky",
  "common.retry": "Skusit znova",
  "common.back": "Spat",
  "common.close": "Zavriet",
  "common.share": "Zdielat",

  // Empty states
  "empty.noRides": "Ziadne jazdy na zobrazenie",
  "empty.noMessages": "Ziadne spravy",
  "empty.noBookings": "Ziadne rezervacie",
  "empty.noReviews": "Ziadne hodnotenia",
  "empty.noEvents": "Ziadne udalosti",

  // Errors
  "errors.networkError": "Chyba siete. Skontrolujte pripojenie.",
  "errors.notFound": "Stranka nenajdena",
  "errors.serverError": "Chyba servera. Skuste to neskor.",
  "errors.unauthorized": "Nemate opravnenie",
  "errors.rateLimited": "Prilis vela poziadavkov. Skuste to neskor.",
};

const en: TranslationKeys = {
  // Nav
  "nav.search": "Search",
  "nav.myRides": "My Rides",
  "nav.messages": "Messages",
  "nav.profile": "Profile",
  "nav.settings": "Settings",

  // Auth
  "auth.login": "Log In",
  "auth.signup": "Sign Up",
  "auth.logout": "Log Out",
  "auth.deleteAccount": "Delete Account",
  "auth.forgotPassword": "Forgot Password",

  // Settings
  "settings.language": "Language",
  "settings.notifications": "Notifications",
  "settings.blockedUsers": "Blocked Users",
  "settings.help": "Help & Support",
  "settings.legal": "Legal",
  "settings.preferences": "Preferences",
  "settings.privacy": "Privacy",
  "settings.account": "Account",
  "settings.info": "Info",

  // Rides
  "rides.postRide": "Post a Ride",
  "rides.searchRides": "Search Rides",
  "rides.departure": "Departure",
  "rides.destination": "Destination",
  "rides.date": "Date",
  "rides.seats": "Seats",
  "rides.price": "Price",
  "rides.bookSeat": "Book Seat",
  "rides.cancel": "Cancel Ride",
  "rides.complete": "Complete Ride",

  // Booking
  "booking.instantBook": "Instant Book",
  "booking.requestSeat": "Request Seat",
  "booking.pending": "Pending",
  "booking.confirmed": "Confirmed",
  "booking.cancelled": "Cancelled",
  "booking.reject": "Reject",
  "booking.accept": "Accept",

  // Chat
  "chat.typeMessage": "Type a message...",
  "chat.sendMessage": "Send Message",
  "chat.contactShared": "Contact shared",
  "chat.noMessages": "No messages yet",

  // Profile
  "profile.editProfile": "Edit Profile",
  "profile.vehicles": "Vehicles",
  "profile.addVehicle": "Add Vehicle",
  "profile.bio": "Bio",
  "profile.socialLinks": "Social Links",
  "profile.verificationBadge": "Verified User",

  // Common
  "common.loading": "Loading...",
  "common.error": "Error",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.confirm": "Confirm",
  "common.noResults": "No results",
  "common.retry": "Retry",
  "common.back": "Back",
  "common.close": "Close",
  "common.share": "Share",

  // Empty states
  "empty.noRides": "No rides to display",
  "empty.noMessages": "No messages",
  "empty.noBookings": "No bookings",
  "empty.noReviews": "No reviews",
  "empty.noEvents": "No events",

  // Errors
  "errors.networkError": "Network error. Check your connection.",
  "errors.notFound": "Page not found",
  "errors.serverError": "Server error. Try again later.",
  "errors.unauthorized": "Unauthorized",
  "errors.rateLimited": "Too many requests. Try again later.",
};

export const translations: Record<SupportedLocale, TranslationKeys> = {
  cs,
  sk,
  en,
};
