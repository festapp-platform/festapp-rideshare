import type { SupportedLocale } from "@festapp/shared";

/**
 * Translation dictionaries for Czech, Slovak, and English (PLAT-02).
 *
 * Keys are flat dot-notation organized by feature area.
 * Czech is the primary language; Slovak and English are full translations.
 */

export type TranslationKeys = {
  // Brand
  "brand.tagline": string;
  "brand.subtitle": string;

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
  "auth.signIn": string;
  "auth.createAccount": string;
  "auth.signingIn": string;
  "auth.creatingAccount": string;
  "auth.email": string;
  "auth.password": string;
  "auth.displayName": string;
  "auth.phone": string;
  "auth.phoneNumber": string;
  "auth.orContinueWith": string;
  "auth.noAccount": string;
  "auth.haveAccount": string;
  "auth.sendCode": string;
  "auth.sendingCode": string;
  "auth.verifyCode": string;
  "auth.verifying": string;
  "auth.otpSent": string;
  "auth.useDifferentNumber": string;
  "auth.connecting": string;
  "auth.emailPlaceholder": string;
  "auth.passwordPlaceholder": string;
  "auth.passwordHint": string;
  "auth.namePlaceholder": string;
  "auth.phonePlaceholder": string;
  "auth.otpPlaceholder": string;
  "auth.checkEmailTitle": string;
  "auth.checkEmailMessage": string;
  "auth.checkEmailOk": string;
  "auth.pendingConfirmation": string;
  "auth.pendingConfirmationMessage": string;
  "auth.resetPassword": string;
  "auth.resetPasswordDescription": string;
  "auth.sendResetLink": string;
  "auth.sendingResetLink": string;
  "auth.resetEmailSentTitle": string;
  "auth.resetEmailSentMessage": string;
  "auth.backToSignIn": string;
  "auth.rememberPassword": string;

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
  "common.unexpectedError": string;

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
  // Brand
  "brand.tagline": "Propojujeme řidiče a spolucestující na stejné trase. Žádné poplatky, žádné provize — prostě sdílená jízda.",
  "brand.subtitle": "Bezplatná komunitní spolujízda",

  // Nav
  "nav.search": "Hledat",
  "nav.myRides": "Moje jízdy",
  "nav.messages": "Zprávy",
  "nav.profile": "Profil",
  "nav.settings": "Nastavení",

  // Auth
  "auth.login": "Přihlásit se",
  "auth.signup": "Registrace",
  "auth.logout": "Odhlásit se",
  "auth.deleteAccount": "Smazat účet",
  "auth.forgotPassword": "Zapomenuté heslo",
  "auth.signIn": "Přihlásit se",
  "auth.createAccount": "Vytvořit účet",
  "auth.signingIn": "Přihlašuji...",
  "auth.creatingAccount": "Vytvářím účet...",
  "auth.email": "E-mail",
  "auth.password": "Heslo",
  "auth.displayName": "Zobrazované jméno",
  "auth.phone": "Telefon",
  "auth.phoneNumber": "Telefonní číslo",
  "auth.orContinueWith": "nebo pokračujte přes",
  "auth.noAccount": "Nemáte účet?",
  "auth.haveAccount": "Máte již účet?",
  "auth.sendCode": "Odeslat ověřovací kód",
  "auth.sendingCode": "Odesílám kód...",
  "auth.verifyCode": "Ověřit kód",
  "auth.verifying": "Ověřuji...",
  "auth.otpSent": "Zadejte {length}místný kód zaslaný na číslo",
  "auth.useDifferentNumber": "Použít jiné číslo",
  "auth.connecting": "Připojuji...",
  "auth.emailPlaceholder": "vas@email.cz",
  "auth.passwordPlaceholder": "••••••••",
  "auth.passwordHint": "Alespoň 6 znaků",
  "auth.namePlaceholder": "Vaše jméno",
  "auth.phonePlaceholder": "+420123456789",
  "auth.otpPlaceholder": "000000",
  "auth.checkEmailTitle": "Zkontrolujte svůj e-mail",
  "auth.checkEmailMessage": "Poslali jsme vám potvrzovací odkaz na e-mail. Klikněte na něj pro dokončení registrace.",
  "auth.checkEmailOk": "Rozumím",
  "auth.pendingConfirmation": "Čekáme na potvrzení e-mailu",
  "auth.pendingConfirmationMessage": "Zkontrolujte svůj e-mail a klikněte na potvrzovací odkaz. Do té doby nemůžete používat všechny funkce.",
  "auth.resetPassword": "Obnovení hesla",
  "auth.resetPasswordDescription": "Zadejte svůj e-mail a my vám pošleme odkaz pro obnovení hesla.",
  "auth.sendResetLink": "Odeslat odkaz pro obnovení",
  "auth.sendingResetLink": "Odesílám...",
  "auth.resetEmailSentTitle": "Zkontrolujte svůj e-mail",
  "auth.resetEmailSentMessage": "Poslali jsme vám odkaz pro obnovení hesla. Klikněte na něj a nastavte si nové heslo.",
  "auth.backToSignIn": "Zpět na přihlášení",
  "auth.rememberPassword": "Vzpomínáte si na heslo?",

  // Settings
  "settings.language": "Jazyk",
  "settings.notifications": "Oznámení",
  "settings.blockedUsers": "Blokovaní uživatelé",
  "settings.help": "Nápověda a podpora",
  "settings.legal": "Právní informace",
  "settings.preferences": "Předvolby",
  "settings.privacy": "Soukromí",
  "settings.account": "Účet",
  "settings.info": "Informace",

  // Rides
  "rides.postRide": "Nabídnout jízdu",
  "rides.searchRides": "Hledat jízdy",
  "rides.departure": "Odjezd",
  "rides.destination": "Cíl",
  "rides.date": "Datum",
  "rides.seats": "Místa",
  "rides.price": "Cena",
  "rides.bookSeat": "Rezervovat místo",
  "rides.cancel": "Zrušit jízdu",
  "rides.complete": "Dokončit jízdu",

  // Booking
  "booking.instantBook": "Okamžitá rezervace",
  "booking.requestSeat": "Požádat o místo",
  "booking.pending": "Čeká na schválení",
  "booking.confirmed": "Potvrzeno",
  "booking.cancelled": "Zrušeno",
  "booking.reject": "Odmítnout",
  "booking.accept": "Přijmout",

  // Chat
  "chat.typeMessage": "Napište zprávu...",
  "chat.sendMessage": "Odeslat zprávu",
  "chat.contactShared": "Kontakt sdílen",
  "chat.noMessages": "Zatím žádné zprávy",

  // Profile
  "profile.editProfile": "Upravit profil",
  "profile.vehicles": "Vozidla",
  "profile.addVehicle": "Přidat vozidlo",
  "profile.bio": "O mně",
  "profile.socialLinks": "Sociální sítě",
  "profile.verificationBadge": "Ověřený uživatel",

  // Common
  "common.loading": "Načítání...",
  "common.error": "Chyba",
  "common.save": "Uložit",
  "common.cancel": "Zrušit",
  "common.delete": "Smazat",
  "common.confirm": "Potvrdit",
  "common.noResults": "Žádné výsledky",
  "common.retry": "Zkusit znovu",
  "common.back": "Zpět",
  "common.close": "Zavřít",
  "common.share": "Sdílet",
  "common.unexpectedError": "Nastala neočekávaná chyba",

  // Empty states
  "empty.noRides": "Žádné jízdy k zobrazení",
  "empty.noMessages": "Žádné zprávy",
  "empty.noBookings": "Žádné rezervace",
  "empty.noReviews": "Žádná hodnocení",
  "empty.noEvents": "Žádné události",

  // Errors
  "errors.networkError": "Chyba sítě. Zkontrolujte připojení.",
  "errors.notFound": "Stránka nenalezena",
  "errors.serverError": "Chyba serveru. Zkuste to později.",
  "errors.unauthorized": "Nemáte oprávnění",
  "errors.rateLimited": "Příliš mnoho požadavků. Zkuste to později.",
};

const sk: TranslationKeys = {
  // Brand
  "brand.tagline": "Prepájame vodičov a spolucestujúcich na rovnakej trase. Žiadne poplatky, žiadne provízie — jednoducho zdieľaná jazda.",
  "brand.subtitle": "Bezplatné komunitné spolujazdy",

  // Nav
  "nav.search": "Hľadať",
  "nav.myRides": "Moje jazdy",
  "nav.messages": "Správy",
  "nav.profile": "Profil",
  "nav.settings": "Nastavenia",

  // Auth
  "auth.login": "Prihlásiť sa",
  "auth.signup": "Registrácia",
  "auth.logout": "Odhlásiť sa",
  "auth.deleteAccount": "Zmazať účet",
  "auth.forgotPassword": "Zabudnuté heslo",
  "auth.signIn": "Prihlásiť sa",
  "auth.createAccount": "Vytvoriť účet",
  "auth.signingIn": "Prihlasovanie...",
  "auth.creatingAccount": "Vytváranie účtu...",
  "auth.email": "E-mail",
  "auth.password": "Heslo",
  "auth.displayName": "Zobrazované meno",
  "auth.phone": "Telefón",
  "auth.phoneNumber": "Telefónne číslo",
  "auth.orContinueWith": "alebo pokračujte cez",
  "auth.noAccount": "Nemáte účet?",
  "auth.haveAccount": "Máte už účet?",
  "auth.sendCode": "Odoslať overovací kód",
  "auth.sendingCode": "Odosielanie kódu...",
  "auth.verifyCode": "Overiť kód",
  "auth.verifying": "Overovanie...",
  "auth.otpSent": "Zadajte {length}-miestny kód zaslaný na číslo",
  "auth.useDifferentNumber": "Použiť iné číslo",
  "auth.connecting": "Pripájanie...",
  "auth.emailPlaceholder": "vas@email.sk",
  "auth.passwordPlaceholder": "••••••••",
  "auth.passwordHint": "Aspoň 6 znakov",
  "auth.namePlaceholder": "Vaše meno",
  "auth.phonePlaceholder": "+421123456789",
  "auth.otpPlaceholder": "000000",
  "auth.checkEmailTitle": "Skontrolujte svoj e-mail",
  "auth.checkEmailMessage": "Poslali sme vám potvrdzovací odkaz na e-mail. Kliknite naň pre dokončenie registrácie.",
  "auth.checkEmailOk": "Rozumiem",
  "auth.pendingConfirmation": "Čakáme na potvrdenie e-mailu",
  "auth.pendingConfirmationMessage": "Skontrolujte svoj e-mail a kliknite na potvrdzovací odkaz. Dovtedy nemôžete používať všetky funkcie.",
  "auth.resetPassword": "Obnovenie hesla",
  "auth.resetPasswordDescription": "Zadajte svoj e-mail a my vám pošleme odkaz na obnovenie hesla.",
  "auth.sendResetLink": "Odoslať odkaz na obnovenie",
  "auth.sendingResetLink": "Odosielanie...",
  "auth.resetEmailSentTitle": "Skontrolujte svoj e-mail",
  "auth.resetEmailSentMessage": "Poslali sme vám odkaz na obnovenie hesla. Kliknite naň a nastavte si nové heslo.",
  "auth.backToSignIn": "Späť na prihlásenie",
  "auth.rememberPassword": "Pamätáte si heslo?",

  // Settings
  "settings.language": "Jazyk",
  "settings.notifications": "Upozornenia",
  "settings.blockedUsers": "Blokovaní používatelia",
  "settings.help": "Pomoc a podpora",
  "settings.legal": "Právne informácie",
  "settings.preferences": "Predvoľby",
  "settings.privacy": "Súkromie",
  "settings.account": "Účet",
  "settings.info": "Informácie",

  // Rides
  "rides.postRide": "Ponúknuť jazdu",
  "rides.searchRides": "Hľadať jazdy",
  "rides.departure": "Odchod",
  "rides.destination": "Cieľ",
  "rides.date": "Dátum",
  "rides.seats": "Miesta",
  "rides.price": "Cena",
  "rides.bookSeat": "Rezervovať miesto",
  "rides.cancel": "Zrušiť jazdu",
  "rides.complete": "Dokončiť jazdu",

  // Booking
  "booking.instantBook": "Okamžitá rezervácia",
  "booking.requestSeat": "Požiadať o miesto",
  "booking.pending": "Čaká na schválenie",
  "booking.confirmed": "Potvrdené",
  "booking.cancelled": "Zrušené",
  "booking.reject": "Odmietnuť",
  "booking.accept": "Prijať",

  // Chat
  "chat.typeMessage": "Napíšte správu...",
  "chat.sendMessage": "Odoslať správu",
  "chat.contactShared": "Kontakt zdieľaný",
  "chat.noMessages": "Zatiaľ žiadne správy",

  // Profile
  "profile.editProfile": "Upraviť profil",
  "profile.vehicles": "Vozidlá",
  "profile.addVehicle": "Pridať vozidlo",
  "profile.bio": "O mne",
  "profile.socialLinks": "Sociálne siete",
  "profile.verificationBadge": "Overený používateľ",

  // Common
  "common.loading": "Načítavanie...",
  "common.error": "Chyba",
  "common.save": "Uložiť",
  "common.cancel": "Zrušiť",
  "common.delete": "Zmazať",
  "common.confirm": "Potvrdiť",
  "common.noResults": "Žiadne výsledky",
  "common.retry": "Skúsiť znova",
  "common.back": "Späť",
  "common.close": "Zavrieť",
  "common.share": "Zdieľať",
  "common.unexpectedError": "Nastala neočakávaná chyba",

  // Empty states
  "empty.noRides": "Žiadne jazdy na zobrazenie",
  "empty.noMessages": "Žiadne správy",
  "empty.noBookings": "Žiadne rezervácie",
  "empty.noReviews": "Žiadne hodnotenia",
  "empty.noEvents": "Žiadne udalosti",

  // Errors
  "errors.networkError": "Chyba siete. Skontrolujte pripojenie.",
  "errors.notFound": "Stránka nenájdená",
  "errors.serverError": "Chyba servera. Skúste to neskôr.",
  "errors.unauthorized": "Nemáte oprávnenie",
  "errors.rateLimited": "Príliš veľa požiadavkov. Skúste to neskôr.",
};

const en: TranslationKeys = {
  // Brand
  "brand.tagline": "Connecting drivers and passengers on the same route. No fees, no commissions — just shared rides.",
  "brand.subtitle": "Free community ride-sharing",

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
  "auth.signIn": "Sign in",
  "auth.createAccount": "Create account",
  "auth.signingIn": "Signing in...",
  "auth.creatingAccount": "Creating account...",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.displayName": "Display name",
  "auth.phone": "Phone",
  "auth.phoneNumber": "Phone number",
  "auth.orContinueWith": "or continue with",
  "auth.noAccount": "Don't have an account?",
  "auth.haveAccount": "Already have an account?",
  "auth.sendCode": "Send verification code",
  "auth.sendingCode": "Sending code...",
  "auth.verifyCode": "Verify code",
  "auth.verifying": "Verifying...",
  "auth.otpSent": "Enter the {length}-digit code sent to",
  "auth.useDifferentNumber": "Use a different number",
  "auth.connecting": "Connecting...",
  "auth.emailPlaceholder": "you@example.com",
  "auth.passwordPlaceholder": "••••••••",
  "auth.passwordHint": "At least 6 characters",
  "auth.namePlaceholder": "Your name",
  "auth.phonePlaceholder": "+420123456789",
  "auth.otpPlaceholder": "000000",
  "auth.checkEmailTitle": "Check your email",
  "auth.checkEmailMessage": "We sent you a confirmation link. Click it to complete your registration.",
  "auth.checkEmailOk": "Got it",
  "auth.pendingConfirmation": "Email confirmation pending",
  "auth.pendingConfirmationMessage": "Check your email and click the confirmation link. Until then, some features are unavailable.",
  "auth.resetPassword": "Reset password",
  "auth.resetPasswordDescription": "Enter your email and we'll send you a link to reset your password.",
  "auth.sendResetLink": "Send reset link",
  "auth.sendingResetLink": "Sending...",
  "auth.resetEmailSentTitle": "Check your email",
  "auth.resetEmailSentMessage": "We sent a password reset link to your email address. Click the link to set a new password.",
  "auth.backToSignIn": "Back to sign in",
  "auth.rememberPassword": "Remember your password?",

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
  "common.unexpectedError": "An unexpected error occurred",

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
