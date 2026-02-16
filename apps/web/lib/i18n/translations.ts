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
  "auth.newPassword": string;
  "auth.newPasswordDescription": string;
  "auth.newPasswordLabel": string;
  "auth.confirmPasswordLabel": string;
  "auth.confirmPasswordPlaceholder": string;
  "auth.updatePassword": string;
  "auth.updatingPassword": string;
  "auth.passwordUpdatedTitle": string;
  "auth.passwordUpdatedMessage": string;
  "auth.continueToApp": string;

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

  // Location sharing banner (LEGAL-03)
  "location.sharingWith": string;
  "location.stop": string;
  "location.passengers": string;

  // Errors
  "errors.networkError": string;
  "errors.notFound": string;
  "errors.serverError": string;
  "errors.unauthorized": string;
  "errors.rateLimited": string;

  // Nav secondary
  "nav.community": string;
  "nav.myStats": string;

  // Ride form
  "rideForm.whereGoing": string;
  "rideForm.from": string;
  "rideForm.to": string;
  "rideForm.pickupLocation": string;
  "rideForm.destination": string;
  "rideForm.computingRoute": string;
  "rideForm.distance": string;
  "rideForm.duration": string;
  "rideForm.suggested": string;
  "rideForm.whenLeaving": string;
  "rideForm.time": string;
  "rideForm.availableSeats": string;
  "rideForm.bookingMode": string;
  "rideForm.instant": string;
  "rideForm.instantDesc": string;
  "rideForm.request": string;
  "rideForm.requestDesc": string;
  "rideForm.priceDetails": string;
  "rideForm.recommended": string;
  "rideForm.vehicleOptional": string;
  "rideForm.selectVehicle": string;
  "rideForm.linkEvent": string;
  "rideForm.noEvent": string;
  "rideForm.notesPlaceholder": string;
  "rideForm.notesLabel": string;
  "rideForm.postingRide": string;
  "rideForm.next": string;
  "rideForm.selectBothPoints": string;
  "rideForm.route": string;
  "rideForm.when": string;
  "rideForm.aiPromptPlaceholder": string;
  "rideForm.aiParsing": string;
  "rideForm.chooseOnMap": string;
  "rideForm.selectOnMap": string;
  "rideForm.confirmLocation": string;

  // Search page
  "search.title": string;
  "search.searchHint": string;
  "search.noRidesFound": string;
  "search.noRidesHint": string;
  "search.ridesFound": string;
  "search.rideFound": string;

  // Settings extra
  "settings.exportData": string;
  "settings.inviteFriends": string;
  "settings.supportUs": string;
  "settings.deleteConfirmTitle": string;
  "settings.deleteConfirmMessage": string;
  "settings.aiSuggestions": string;
  "settings.aiSuggestionsDesc": string;

  // Profile extra
  "profile.title": string;
  "profile.edit": string;
  "profile.yourProfile": string;
  "profile.tapToSetup": string;
  "profile.phoneVerified": string;
  "profile.idVerified": string;
  "profile.idVerification": string;
  "profile.idVerifiedDesc": string;
  "profile.uploadId": string;
  "profile.uploadingId": string;
  "profile.uploadIdDesc": string;
  "profile.clickToChangeAvatar": string;
  "profile.saveChanges": string;
  "profile.saving": string;
  "profile.instagramUrl": string;
  "profile.facebookUrl": string;
  "profile.myVehicles": string;
  "profile.addVehicleHint": string;
  "profile.manageVehicles": string;
  "profile.avatarRequired": string;

  // Onboarding
  "onboarding.tapToAddPhoto": string;
  "onboarding.avatarRequired": string;
  "onboarding.saving": string;
  "onboarding.displayName": string;
  "onboarding.yourName": string;
  "onboarding.roleRider": string;
  "onboarding.roleRiderDesc": string;
  "onboarding.roleDriver": string;
  "onboarding.roleDriverDesc": string;
  "onboarding.roleBoth": string;
  "onboarding.roleBothDesc": string;
  "onboarding.vehicleMake": string;
  "onboarding.vehicleModel": string;
  "onboarding.vehicleColor": string;
  "onboarding.vehiclePlate": string;
  "onboarding.vehiclePhotoOptional": string;
  "onboarding.errorNameRequired": string;
  "onboarding.errorPhotoRequired": string;
  "onboarding.errorNotAuthenticated": string;
  "onboarding.errorSaveProfile": string;
  "onboarding.errorSelectRole": string;
  "onboarding.errorSaveRole": string;
  "onboarding.errorVehicleFields": string;
  "onboarding.errorSaveVehicle": string;
  // Onboarding steps
  "onboarding.welcome.title": string;
  "onboarding.welcome.description": string;
  "onboarding.welcome.button": string;
  "onboarding.profile.title": string;
  "onboarding.profile.description": string;
  "onboarding.profile.button": string;
  "onboarding.role.title": string;
  "onboarding.role.description": string;
  "onboarding.role.button": string;
  "onboarding.vehicle.title": string;
  "onboarding.vehicle.description": string;
  "onboarding.vehicle.button": string;
  "onboarding.vehicle.skip": string;
  "onboarding.location.title": string;
  "onboarding.location.description": string;
  "onboarding.location.button": string;
  "onboarding.location.skip": string;
  "onboarding.notifications.title": string;
  "onboarding.notifications.description": string;
  "onboarding.notifications.button": string;
  "onboarding.notifications.skip": string;
  "onboarding.ready.title": string;
  "onboarding.ready.description": string;
  "onboarding.ready.button": string;

  // Legal / ToS consent
  "auth.agreeToTermsPre": string;
  "auth.termsOfService": string;
  "auth.privacyPolicy": string;
  "auth.mustAcceptTerms": string;
  "common.and": string;

  // Ride detail
  "rideDetail.tripDetails": string;
  "rideDetail.distance": string;
  "rideDetail.duration": string;
  "rideDetail.price": string;
  "rideDetail.driver": string;
  "rideDetail.vehicle": string;
  "rideDetail.preferences": string;
  "rideDetail.prefSmoking": string;
  "rideDetail.prefPets": string;
  "rideDetail.prefMusic": string;
  "rideDetail.prefChat": string;
  "rideDetail.notes": string;
  "rideDetail.booking": string;
  "rideDetail.seatsAvailable": string;
  "rideDetail.instant": string;
  "rideDetail.request": string;
  "rideDetail.cancelBooking": string;
  "rideDetail.manageBookings": string;
  "rideDetail.pendingRequest": string;
  "rideDetail.pendingRequests": string;
  "rideDetail.liveLocation": string;
  "rideDetail.shareMyLocation": string;
  "rideDetail.starting": string;
  "rideDetail.stopSharing": string;
  "rideDetail.waitingForDriver": string;
  "rideDetail.completeRide": string;
  "rideDetail.completing": string;
  "rideDetail.confirmComplete": string;
  "rideDetail.cannotCompleteBefore": string;
  "rideDetail.editRide": string;
  "rideDetail.cancelRide": string;
  "rideDetail.rateThisRide": string;
  "rideDetail.rideCompleted": string;
  "rideDetail.opening": string;
  "rideDetail.message": string;
  "rideDetail.couldNotOpenConversation": string;
  "rideDetail.failedToStartRide": string;
  "rideDetail.failedToCompleteRide": string;
  "rideDetail.onlyDriverCanComplete": string;
  "rideDetail.cannotCompleteStatus": string;
  "rideDetail.rideCompletedToast": string;
  "rideDetail.locationSharingStarted": string;
  "rideDetail.seatSingular": string;
  "rideDetail.seatPlural": string;

  // My Rides
  "myRides.title": string;
  "myRides.asDriver": string;
  "myRides.asPassenger": string;
  "myRides.upcoming": string;
  "myRides.past": string;
  "myRides.noUpcomingRides": string;
  "myRides.noPastRides": string;
  "myRides.postRideHint": string;
  "myRides.pastRidesHint": string;
  "myRides.postARide": string;
  "myRides.noUpcomingRidesPassenger": string;
  "myRides.noRideHistory": string;
  "myRides.searchHint": string;
  "myRides.pastRidesPassengerHint": string;
  "myRides.searchForARide": string;
  "myRides.cancelBooking": string;
  "myRides.seats": string;
  "myRides.seatSingular": string;
  "myRides.seatPlural": string;

  // Booking button
  "bookingButton.requestPending": string;
  "bookingButton.booked": string;
  "bookingButton.fullyBooked": string;
  "bookingButton.seats": string;
  "bookingButton.bookSeats": string;
  "bookingButton.requestSeats": string;
  "bookingButton.processing": string;
  "bookingButton.seatBooked": string;
  "bookingButton.requestSent": string;
  "bookingButton.notEnoughSeats": string;
  "bookingButton.alreadyBooked": string;
  "bookingButton.cantBookOwn": string;
  "bookingButton.bookingFailed": string;
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
  "auth.newPassword": "Nové heslo",
  "auth.newPasswordDescription": "Zadejte své nové heslo.",
  "auth.newPasswordLabel": "Nové heslo",
  "auth.confirmPasswordLabel": "Potvrďte heslo",
  "auth.confirmPasswordPlaceholder": "Zopakujte heslo",
  "auth.updatePassword": "Nastavit heslo",
  "auth.updatingPassword": "Nastavuji...",
  "auth.passwordUpdatedTitle": "Heslo bylo změněno",
  "auth.passwordUpdatedMessage": "Vaše heslo bylo úspěšně aktualizováno.",
  "auth.continueToApp": "Pokračovat do aplikace",

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

  // Location sharing banner (LEGAL-03)
  "location.sharingWith": "Sdílení polohy s {names}",
  "location.stop": "Zastavit",
  "location.passengers": "spolucestujícími",

  // Errors
  "errors.networkError": "Chyba sítě. Zkontrolujte připojení.",
  "errors.notFound": "Stránka nenalezena",
  "errors.serverError": "Chyba serveru. Zkuste to později.",
  "errors.unauthorized": "Nemáte oprávnění",
  "errors.rateLimited": "Příliš mnoho požadavků. Zkuste to později.",

  // Nav secondary
  "nav.community": "Komunita",
  "nav.myStats": "Statistiky",

  // Ride form
  "rideForm.whereGoing": "Kam jedete?",
  "rideForm.from": "Odkud",
  "rideForm.to": "Kam",
  "rideForm.pickupLocation": "Místo vyzvednutí",
  "rideForm.destination": "Cíl cesty",
  "rideForm.computingRoute": "Počítám trasu...",
  "rideForm.distance": "Vzdálenost",
  "rideForm.duration": "Doba jízdy",
  "rideForm.suggested": "Doporučeno",
  "rideForm.whenLeaving": "Kdy vyrážíte?",
  "rideForm.time": "Čas",
  "rideForm.availableSeats": "Volná místa",
  "rideForm.bookingMode": "Způsob rezervace",
  "rideForm.instant": "Okamžitá",
  "rideForm.instantDesc": "Cestující rezervují ihned",
  "rideForm.request": "Na žádost",
  "rideForm.requestDesc": "Schvalujete každou rezervaci",
  "rideForm.priceDetails": "Cena a detaily",
  "rideForm.recommended": "Doporučeno: {price} {currency} (na základě nákladů na palivo)",
  "rideForm.vehicleOptional": "Vozidlo (volitelné)",
  "rideForm.selectVehicle": "Vyberte vozidlo",
  "rideForm.linkEvent": "Propojit s akcí (volitelné)",
  "rideForm.noEvent": "Žádná akce",
  "rideForm.notesPlaceholder": "Místo setkání, zavazadla, zvířata, kouření...",
  "rideForm.notesLabel": "Poznámky pro cestující (volitelné)",
  "rideForm.postingRide": "Vytvářím jízdu...",
  "rideForm.next": "Další",
  "rideForm.selectBothPoints": "Vyberte místo odjezdu i příjezdu.",
  "rideForm.route": "Trasa",
  "rideForm.when": "Kdy",
  "rideForm.aiPromptPlaceholder": "Popište svou jízdu...",
  "rideForm.aiParsing": "Analyzuji...",
  "rideForm.chooseOnMap": "Vybrat na mapě",
  "rideForm.selectOnMap": "Klepněte na mapu pro výběr místa",
  "rideForm.confirmLocation": "Potvrdit místo",

  // Search page
  "search.title": "Hledat jízdy",
  "search.searchHint": "Vyhledejte jízdy na festivaly, akce a další",
  "search.noRidesFound": "Žádné jízdy nenalezeny",
  "search.noRidesHint": "Zkuste rozšířit oblast vyhledávání nebo změnit datum.",
  "search.ridesFound": "jízd nalezeno",
  "search.rideFound": "jízda nalezena",

  // Settings extra
  "settings.exportData": "Export mých dat",
  "settings.inviteFriends": "Pozvat přátele",
  "settings.supportUs": "Podpořte nás",
  "settings.deleteConfirmTitle": "Smazat účet",
  "settings.deleteConfirmMessage": "Opravdu chcete smazat svůj účet? Tuto akci nelze vrátit. Všechna vaše data budou trvale odstraněna.",
  "settings.aiSuggestions": "AI návrhy",
  "settings.aiSuggestionsDesc": "Zobrazit AI návrhy a automatické vyplňování formulářů",

  // Profile extra
  "profile.title": "Profil",
  "profile.edit": "Upravit",
  "profile.yourProfile": "Váš profil",
  "profile.tapToSetup": "Klikněte na Upravit pro nastavení profilu",
  "profile.phoneVerified": "Telefon ověřen",
  "profile.idVerified": "ID ověřeno",
  "profile.idVerification": "Ověření identity",
  "profile.idVerifiedDesc": "Vaše ID bylo ověřeno",
  "profile.uploadId": "Nahrát doklad totožnosti",
  "profile.uploadingId": "Nahrávám...",
  "profile.uploadIdDesc": "Nahrajte fotografii svého dokladu pro zvýšení důvěryhodnosti.",
  "profile.clickToChangeAvatar": "Klikněte na avatar pro změnu fotky",
  "profile.saveChanges": "Uložit změny",
  "profile.saving": "Ukládám...",
  "profile.instagramUrl": "Instagram URL",
  "profile.facebookUrl": "Facebook URL",
  "profile.myVehicles": "Moje vozidla",
  "profile.addVehicleHint": "Přidejte vozidlo pro nabízení jízd",
  "profile.manageVehicles": "Spravovat vozidla",
  "profile.avatarRequired": "Profilová fotka je povinná",

  // Onboarding
  "onboarding.tapToAddPhoto": "Klepněte pro přidání fotky",
  "onboarding.avatarRequired": "Přidejte prosím profilovou fotku pro pokračování.",
  "onboarding.saving": "Ukládám...",
  "onboarding.displayName": "Zobrazované jméno",
  "onboarding.yourName": "Vaše jméno",
  "onboarding.roleRider": "Chci jezdit",
  "onboarding.roleRiderDesc": "Najdu spolujízdu na festivaly a akce",
  "onboarding.roleDriver": "Chci řídit",
  "onboarding.roleDriverDesc": "Nabídnu místo ve svém autě",
  "onboarding.roleBoth": "Obojí",
  "onboarding.roleBothDesc": "Chci jezdit i nabízet jízdy",
  "onboarding.vehicleMake": "Značka",
  "onboarding.vehicleModel": "Model",
  "onboarding.vehicleColor": "Barva",
  "onboarding.vehiclePlate": "SPZ",
  "onboarding.vehiclePhotoOptional": "Přidat fotku (volitelné)",
  "onboarding.errorNameRequired": "Zadejte prosím jméno (1–50 znaků).",
  "onboarding.errorPhotoRequired": "Přidejte prosím profilovou fotku pro pokračování.",
  "onboarding.errorNotAuthenticated": "Nejste přihlášeni. Přihlaste se prosím znovu.",
  "onboarding.errorSaveProfile": "Nepodařilo se uložit profil.",
  "onboarding.errorSelectRole": "Vyberte prosím, jak chcete aplikaci používat.",
  "onboarding.errorSaveRole": "Nepodařilo se uložit roli.",
  "onboarding.errorVehicleFields": "Vyplňte prosím všechna pole vozidla.",
  "onboarding.errorSaveVehicle": "Nepodařilo se přidat vozidlo.",
  // Onboarding steps
  "onboarding.welcome.title": "Vítejte na spolujizda.online",
  "onboarding.welcome.description": "Sdílejte jízdy na festivaly, ušetřete a poznejte nové lidi. Najít nebo nabídnout spolujízdu nebylo nikdy snazší.",
  "onboarding.welcome.button": "Další",
  "onboarding.profile.title": "Nastavte si profil",
  "onboarding.profile.description": "Přidejte jméno a fotku, aby ostatní věděli, s kým jedou.",
  "onboarding.profile.button": "Pokračovat",
  "onboarding.role.title": "Jak chcete spolujízdu využívat?",
  "onboarding.role.description": "Řekněte nám, jestli chcete nabízet jízdy, hledat jízdy, nebo obojí. Můžete to kdykoli změnit.",
  "onboarding.role.button": "Pokračovat",
  "onboarding.vehicle.title": "Přidejte své vozidlo",
  "onboarding.vehicle.description": "Zadejte údaje o vozidle, aby cestující věděli, co hledat. Můžete to přeskočit a přidat později.",
  "onboarding.vehicle.button": "Přidat vozidlo",
  "onboarding.vehicle.skip": "Přeskočit",
  "onboarding.location.title": "Najděte jízdy ve vašem okolí",
  "onboarding.location.description": "Povolte přístup k poloze, abychom vám mohli zobrazit jízdy a místa vyzvednutí poblíž. Můžete to kdykoli změnit v Nastavení.",
  "onboarding.location.button": "Povolit polohu",
  "onboarding.location.skip": "Přeskočit",
  "onboarding.notifications.title": "Nepropásněte žádnou jízdu",
  "onboarding.notifications.description": "Dostávejte upozornění na potvrzení rezervací, připomínky jízd a zprávy od řidiče nebo spolucestujících.",
  "onboarding.notifications.button": "Povolit oznámení",
  "onboarding.notifications.skip": "Přeskočit",
  "onboarding.ready.title": "Vše je připraveno!",
  "onboarding.ready.description": "Začněte hledáním spolujízdy na váš další festival, nebo nabídněte svou jízdu ostatním.",
  "onboarding.ready.button": "Začít",

  // Legal / ToS consent
  "auth.agreeToTermsPre": "Souhlasím s",
  "auth.termsOfService": "Obchodními podmínkami",
  "auth.privacyPolicy": "Zásadami ochrany osobních údajů",
  "auth.mustAcceptTerms": "Musíte souhlasit s obchodními podmínkami a zásadami ochrany osobních údajů",
  "common.and": "a",

  // Ride detail
  "rideDetail.tripDetails": "Detaily cesty",
  "rideDetail.distance": "Vzdálenost",
  "rideDetail.duration": "Doba jízdy",
  "rideDetail.price": "Cena",
  "rideDetail.driver": "Řidič",
  "rideDetail.vehicle": "Vozidlo",
  "rideDetail.preferences": "Preference",
  "rideDetail.prefSmoking": "Kouření povoleno",
  "rideDetail.prefPets": "Zvířata vítána",
  "rideDetail.prefMusic": "Hudba zapnutá",
  "rideDetail.prefChat": "Povídání",
  "rideDetail.notes": "Poznámky",
  "rideDetail.booking": "Rezervace",
  "rideDetail.seatsAvailable": "{available} z {total} {seats} volných",
  "rideDetail.instant": "Okamžitá",
  "rideDetail.request": "Na žádost",
  "rideDetail.cancelBooking": "Zrušit rezervaci",
  "rideDetail.manageBookings": "Spravovat rezervace",
  "rideDetail.pendingRequest": "čekající žádost",
  "rideDetail.pendingRequests": "čekající žádosti",
  "rideDetail.liveLocation": "Živá poloha",
  "rideDetail.shareMyLocation": "Sdílet moji polohu",
  "rideDetail.starting": "Spouštím...",
  "rideDetail.stopSharing": "Zastavit sdílení",
  "rideDetail.waitingForDriver": "Jízda probíhá — čekám na polohu řidiče...",
  "rideDetail.completeRide": "Dokončit jízdu",
  "rideDetail.completing": "Dokončuji...",
  "rideDetail.confirmComplete": "Potvrdit dokončení?",
  "rideDetail.cannotCompleteBefore": "Nelze dokončit před odjezdem ({date} v {time})",
  "rideDetail.editRide": "Upravit jízdu",
  "rideDetail.cancelRide": "Zrušit jízdu",
  "rideDetail.rateThisRide": "Ohodnotit tuto jízdu",
  "rideDetail.rideCompleted": "Tato jízda byla dokončena.",
  "rideDetail.opening": "Otevírám...",
  "rideDetail.message": "Napsat {name}",
  "rideDetail.couldNotOpenConversation": "Nepodařilo se otevřít konverzaci",
  "rideDetail.failedToStartRide": "Nepodařilo se spustit jízdu",
  "rideDetail.failedToCompleteRide": "Nepodařilo se dokončit jízdu",
  "rideDetail.onlyDriverCanComplete": "Pouze řidič může dokončit tuto jízdu",
  "rideDetail.cannotCompleteStatus": "Tuto jízdu nelze dokončit z aktuálního stavu",
  "rideDetail.rideCompletedToast": "Jízda dokončena!",
  "rideDetail.locationSharingStarted": "Sdílení polohy zahájeno",
  "rideDetail.seatSingular": "místo",
  "rideDetail.seatPlural": "místa",

  // My Rides
  "myRides.title": "Moje jízdy",
  "myRides.asDriver": "Jako řidič",
  "myRides.asPassenger": "Jako cestující",
  "myRides.upcoming": "Nadcházející",
  "myRides.past": "Minulé",
  "myRides.noUpcomingRides": "Žádné nadcházející jízdy",
  "myRides.noPastRides": "Žádné minulé jízdy",
  "myRides.postRideHint": "Nabídněte jízdu a začněte!",
  "myRides.pastRidesHint": "Vaše dokončené a zrušené jízdy se zobrazí zde.",
  "myRides.postARide": "Nabídnout jízdu",
  "myRides.noUpcomingRidesPassenger": "Žádné nadcházející jízdy",
  "myRides.noRideHistory": "Zatím žádná historie jízd",
  "myRides.searchHint": "Vyhledejte jízdu a začněte!",
  "myRides.pastRidesPassengerHint": "Vaše minulé jízdy jako cestující se zobrazí zde.",
  "myRides.searchForARide": "Hledat jízdu",
  "myRides.cancelBooking": "Zrušit rezervaci",
  "myRides.seats": "míst",
  "myRides.seatSingular": "místo",
  "myRides.seatPlural": "místa",

  // Booking button
  "bookingButton.requestPending": "Žádost čeká",
  "bookingButton.booked": "Rezervováno ({seats} {seatWord})",
  "bookingButton.fullyBooked": "Plně obsazeno",
  "bookingButton.seats": "Místa",
  "bookingButton.bookSeats": "Rezervovat {count} {seatWord}",
  "bookingButton.requestSeats": "Požádat o {count} {seatWord}",
  "bookingButton.processing": "Zpracovávám...",
  "bookingButton.seatBooked": "Místo rezervováno!",
  "bookingButton.requestSent": "Žádost odeslána!",
  "bookingButton.notEnoughSeats": "Nedostatek volných míst",
  "bookingButton.alreadyBooked": "Na této jízdě již máte rezervaci",
  "bookingButton.cantBookOwn": "Nemůžete si rezervovat vlastní jízdu",
  "bookingButton.bookingFailed": "Rezervace selhala. Zkuste to znovu.",
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
  "auth.newPassword": "Nové heslo",
  "auth.newPasswordDescription": "Zadajte svoje nové heslo.",
  "auth.newPasswordLabel": "Nové heslo",
  "auth.confirmPasswordLabel": "Potvrďte heslo",
  "auth.confirmPasswordPlaceholder": "Zopakujte heslo",
  "auth.updatePassword": "Nastaviť heslo",
  "auth.updatingPassword": "Nastavujem...",
  "auth.passwordUpdatedTitle": "Heslo bolo zmenené",
  "auth.passwordUpdatedMessage": "Vaše heslo bolo úspešne aktualizované.",
  "auth.continueToApp": "Pokračovať do aplikácie",

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

  // Location sharing banner (LEGAL-03)
  "location.sharingWith": "Zdieľanie polohy s {names}",
  "location.stop": "Zastaviť",
  "location.passengers": "spolucestujúcimi",

  // Errors
  "errors.networkError": "Chyba siete. Skontrolujte pripojenie.",
  "errors.notFound": "Stránka nenájdená",
  "errors.serverError": "Chyba servera. Skúste to neskôr.",
  "errors.unauthorized": "Nemáte oprávnenie",
  "errors.rateLimited": "Príliš veľa požiadavkov. Skúste to neskôr.",

  // Nav secondary
  "nav.community": "Komunita",
  "nav.myStats": "Štatistiky",

  // Ride form
  "rideForm.whereGoing": "Kam idete?",
  "rideForm.from": "Odkiaľ",
  "rideForm.to": "Kam",
  "rideForm.pickupLocation": "Miesto vyzdvihnutia",
  "rideForm.destination": "Cieľ cesty",
  "rideForm.computingRoute": "Počítam trasu...",
  "rideForm.distance": "Vzdialenosť",
  "rideForm.duration": "Doba jazdy",
  "rideForm.suggested": "Odporúčané",
  "rideForm.whenLeaving": "Kedy vyrážate?",
  "rideForm.time": "Čas",
  "rideForm.availableSeats": "Voľné miesta",
  "rideForm.bookingMode": "Spôsob rezervácie",
  "rideForm.instant": "Okamžitá",
  "rideForm.instantDesc": "Cestujúci rezervujú ihneď",
  "rideForm.request": "Na žiadosť",
  "rideForm.requestDesc": "Schvaľujete každú rezerváciu",
  "rideForm.priceDetails": "Cena a detaily",
  "rideForm.recommended": "Odporúčané: {price} {currency} (na základe nákladov na palivo)",
  "rideForm.vehicleOptional": "Vozidlo (voliteľné)",
  "rideForm.selectVehicle": "Vyberte vozidlo",
  "rideForm.linkEvent": "Prepojiť s akciou (voliteľné)",
  "rideForm.noEvent": "Žiadna akcia",
  "rideForm.notesPlaceholder": "Miesto stretnutia, batožina, zvieratá, fajčenie...",
  "rideForm.notesLabel": "Poznámky pre cestujúcich (voliteľné)",
  "rideForm.postingRide": "Vytváranie jazdy...",
  "rideForm.next": "Ďalej",
  "rideForm.selectBothPoints": "Vyberte miesto odchodu aj príchodu.",
  "rideForm.route": "Trasa",
  "rideForm.when": "Kedy",
  "rideForm.aiPromptPlaceholder": "Popíšte svoju jazdu...",
  "rideForm.aiParsing": "Analyzujem...",
  "rideForm.chooseOnMap": "Vybrať na mape",
  "rideForm.selectOnMap": "Klepnite na mapu pre výber miesta",
  "rideForm.confirmLocation": "Potvrdiť miesto",

  // Search page
  "search.title": "Hľadať jazdy",
  "search.searchHint": "Vyhľadajte jazdy na festivaly, akcie a ďalšie",
  "search.noRidesFound": "Žiadne jazdy nenájdené",
  "search.noRidesHint": "Skúste rozšíriť oblasť vyhľadávania alebo zmeniť dátum.",
  "search.ridesFound": "jázd nájdených",
  "search.rideFound": "jazda nájdená",

  // Settings extra
  "settings.exportData": "Export mojich dát",
  "settings.inviteFriends": "Pozvať priateľov",
  "settings.supportUs": "Podporte nás",
  "settings.deleteConfirmTitle": "Zmazať účet",
  "settings.deleteConfirmMessage": "Naozaj chcete zmazať svoj účet? Túto akciu nemožno vrátiť. Všetky vaše dáta budú natrvalo odstránené.",
  "settings.aiSuggestions": "AI návrhy",
  "settings.aiSuggestionsDesc": "Zobrazovať AI návrhy a automatické vypĺňanie formulárov",

  // Profile extra
  "profile.title": "Profil",
  "profile.edit": "Upraviť",
  "profile.yourProfile": "Váš profil",
  "profile.tapToSetup": "Kliknite na Upraviť pre nastavenie profilu",
  "profile.phoneVerified": "Telefón overený",
  "profile.idVerified": "ID overené",
  "profile.idVerification": "Overenie identity",
  "profile.idVerifiedDesc": "Vaše ID bolo overené",
  "profile.uploadId": "Nahrať doklad totožnosti",
  "profile.uploadingId": "Nahrávam...",
  "profile.uploadIdDesc": "Nahrajte fotografiu svojho dokladu pre zvýšenie dôveryhodnosti.",
  "profile.clickToChangeAvatar": "Kliknite na avatar pre zmenu fotky",
  "profile.saveChanges": "Uložiť zmeny",
  "profile.saving": "Ukladám...",
  "profile.instagramUrl": "Instagram URL",
  "profile.facebookUrl": "Facebook URL",
  "profile.myVehicles": "Moje vozidlá",
  "profile.addVehicleHint": "Pridajte vozidlo pre ponúkanie jázd",
  "profile.manageVehicles": "Spravovať vozidlá",
  "profile.avatarRequired": "Profilová fotka je povinná",

  // Onboarding
  "onboarding.tapToAddPhoto": "Klepnite pre pridanie fotky",
  "onboarding.avatarRequired": "Pridajte prosím profilovú fotku pre pokračovanie.",
  "onboarding.saving": "Ukladám...",
  "onboarding.displayName": "Zobrazované meno",
  "onboarding.yourName": "Vaše meno",
  "onboarding.roleRider": "Chcem jazdiť",
  "onboarding.roleRiderDesc": "Nájdem spolujazdu na festivaly a akcie",
  "onboarding.roleDriver": "Chcem šoférovať",
  "onboarding.roleDriverDesc": "Ponúknem miesto vo svojom aute",
  "onboarding.roleBoth": "Oboje",
  "onboarding.roleBothDesc": "Chcem jazdiť aj ponúkať jazdy",
  "onboarding.vehicleMake": "Značka",
  "onboarding.vehicleModel": "Model",
  "onboarding.vehicleColor": "Farba",
  "onboarding.vehiclePlate": "ŠPZ",
  "onboarding.vehiclePhotoOptional": "Pridať fotku (voliteľné)",
  "onboarding.errorNameRequired": "Zadajte prosím meno (1–50 znakov).",
  "onboarding.errorPhotoRequired": "Pridajte prosím profilovú fotku pre pokračovanie.",
  "onboarding.errorNotAuthenticated": "Nie ste prihlásení. Prihláste sa prosím znova.",
  "onboarding.errorSaveProfile": "Nepodarilo sa uložiť profil.",
  "onboarding.errorSelectRole": "Vyberte prosím, ako chcete aplikáciu používať.",
  "onboarding.errorSaveRole": "Nepodarilo sa uložiť rolu.",
  "onboarding.errorVehicleFields": "Vyplňte prosím všetky polia vozidla.",
  "onboarding.errorSaveVehicle": "Nepodarilo sa pridať vozidlo.",
  // Onboarding steps
  "onboarding.welcome.title": "Vitajte na spolujizda.online",
  "onboarding.welcome.description": "Zdieľajte jazdy na festivaly, ušetrite a spoznajte nových ľudí. Nájsť alebo ponúknuť spolujazdu nebolo nikdy jednoduchšie.",
  "onboarding.welcome.button": "Ďalej",
  "onboarding.profile.title": "Nastavte si profil",
  "onboarding.profile.description": "Pridajte meno a fotku, aby ostatní vedeli, s kým idú.",
  "onboarding.profile.button": "Pokračovať",
  "onboarding.role.title": "Ako chcete spolujazdu využívať?",
  "onboarding.role.description": "Povedzte nám, či chcete ponúkať jazdy, hľadať jazdy, alebo oboje. Môžete to kedykoľvek zmeniť.",
  "onboarding.role.button": "Pokračovať",
  "onboarding.vehicle.title": "Pridajte svoje vozidlo",
  "onboarding.vehicle.description": "Zadajte údaje o vozidle, aby cestujúci vedeli, čo hľadať. Môžete to preskočiť a pridať neskôr.",
  "onboarding.vehicle.button": "Pridať vozidlo",
  "onboarding.vehicle.skip": "Preskočiť",
  "onboarding.location.title": "Nájdite jazdy vo vašom okolí",
  "onboarding.location.description": "Povoľte prístup k polohe, aby sme vám mohli zobraziť jazdy a miesta vyzdvihnutia v blízkosti. Môžete to kedykoľvek zmeniť v Nastaveniach.",
  "onboarding.location.button": "Povoliť polohu",
  "onboarding.location.skip": "Preskočiť",
  "onboarding.notifications.title": "Nepropásnite žiadnu jazdu",
  "onboarding.notifications.description": "Dostávajte upozornenia na potvrdenie rezervácií, pripomienky jázd a správy od vodiča alebo spolucestujúcich.",
  "onboarding.notifications.button": "Povoliť oznámenia",
  "onboarding.notifications.skip": "Preskočiť",
  "onboarding.ready.title": "Všetko je pripravené!",
  "onboarding.ready.description": "Začnite hľadaním spolujazdy na váš ďalší festival, alebo ponúknite svoju jazdu ostatným.",
  "onboarding.ready.button": "Začať",

  // Legal / ToS consent
  "auth.agreeToTermsPre": "Súhlasím s",
  "auth.termsOfService": "Obchodnými podmienkami",
  "auth.privacyPolicy": "Zásadami ochrany osobných údajov",
  "auth.mustAcceptTerms": "Musíte súhlasiť s obchodnými podmienkami a zásadami ochrany osobných údajov",
  "common.and": "a",

  // Ride detail
  "rideDetail.tripDetails": "Detaily jazdy",
  "rideDetail.distance": "Vzdialenosť",
  "rideDetail.duration": "Doba jazdy",
  "rideDetail.price": "Cena",
  "rideDetail.driver": "Vodič",
  "rideDetail.vehicle": "Vozidlo",
  "rideDetail.preferences": "Preferencie",
  "rideDetail.prefSmoking": "Fajčenie povolené",
  "rideDetail.prefPets": "Zvieratá vítané",
  "rideDetail.prefMusic": "Hudba zapnutá",
  "rideDetail.prefChat": "Rozprávanie",
  "rideDetail.notes": "Poznámky",
  "rideDetail.booking": "Rezervácia",
  "rideDetail.seatsAvailable": "{available} z {total} {seats} voľných",
  "rideDetail.instant": "Okamžitá",
  "rideDetail.request": "Na žiadosť",
  "rideDetail.cancelBooking": "Zrušiť rezerváciu",
  "rideDetail.manageBookings": "Spravovať rezervácie",
  "rideDetail.pendingRequest": "čakajúca žiadosť",
  "rideDetail.pendingRequests": "čakajúce žiadosti",
  "rideDetail.liveLocation": "Živá poloha",
  "rideDetail.shareMyLocation": "Zdieľať moju polohu",
  "rideDetail.starting": "Spúšťam...",
  "rideDetail.stopSharing": "Zastaviť zdieľanie",
  "rideDetail.waitingForDriver": "Jazda prebieha — čakám na polohu vodiča...",
  "rideDetail.completeRide": "Dokončiť jazdu",
  "rideDetail.completing": "Dokončujem...",
  "rideDetail.confirmComplete": "Potvrdiť dokončenie?",
  "rideDetail.cannotCompleteBefore": "Nemožno dokončiť pred odchodom ({date} o {time})",
  "rideDetail.editRide": "Upraviť jazdu",
  "rideDetail.cancelRide": "Zrušiť jazdu",
  "rideDetail.rateThisRide": "Ohodnotiť túto jazdu",
  "rideDetail.rideCompleted": "Táto jazda bola dokončená.",
  "rideDetail.opening": "Otváram...",
  "rideDetail.message": "Napísať {name}",
  "rideDetail.couldNotOpenConversation": "Nepodarilo sa otvoriť konverzáciu",
  "rideDetail.failedToStartRide": "Nepodarilo sa spustiť jazdu",
  "rideDetail.failedToCompleteRide": "Nepodarilo sa dokončiť jazdu",
  "rideDetail.onlyDriverCanComplete": "Iba vodič môže dokončiť túto jazdu",
  "rideDetail.cannotCompleteStatus": "Túto jazdu nemožno dokončiť z aktuálneho stavu",
  "rideDetail.rideCompletedToast": "Jazda dokončená!",
  "rideDetail.locationSharingStarted": "Zdieľanie polohy spustené",
  "rideDetail.seatSingular": "miesto",
  "rideDetail.seatPlural": "miesta",

  // My Rides
  "myRides.title": "Moje jazdy",
  "myRides.asDriver": "Ako vodič",
  "myRides.asPassenger": "Ako cestujúci",
  "myRides.upcoming": "Nadchádzajúce",
  "myRides.past": "Minulé",
  "myRides.noUpcomingRides": "Žiadne nadchádzajúce jazdy",
  "myRides.noPastRides": "Žiadne minulé jazdy",
  "myRides.postRideHint": "Ponúknite jazdu a začnite!",
  "myRides.pastRidesHint": "Vaše dokončené a zrušené jazdy sa zobrazia tu.",
  "myRides.postARide": "Ponúknuť jazdu",
  "myRides.noUpcomingRidesPassenger": "Žiadne nadchádzajúce jazdy",
  "myRides.noRideHistory": "Zatiaľ žiadna história jázd",
  "myRides.searchHint": "Vyhľadajte jazdu a začnite!",
  "myRides.pastRidesPassengerHint": "Vaše minulé jazdy ako cestujúci sa zobrazia tu.",
  "myRides.searchForARide": "Hľadať jazdu",
  "myRides.cancelBooking": "Zrušiť rezerváciu",
  "myRides.seats": "miest",
  "myRides.seatSingular": "miesto",
  "myRides.seatPlural": "miesta",

  // Booking button
  "bookingButton.requestPending": "Žiadosť čaká",
  "bookingButton.booked": "Rezervované ({seats} {seatWord})",
  "bookingButton.fullyBooked": "Plne obsadené",
  "bookingButton.seats": "Miesta",
  "bookingButton.bookSeats": "Rezervovať {count} {seatWord}",
  "bookingButton.requestSeats": "Požiadať o {count} {seatWord}",
  "bookingButton.processing": "Spracovávam...",
  "bookingButton.seatBooked": "Miesto rezervované!",
  "bookingButton.requestSent": "Žiadosť odoslaná!",
  "bookingButton.notEnoughSeats": "Nedostatok voľných miest",
  "bookingButton.alreadyBooked": "Na tejto jazde už máte rezerváciu",
  "bookingButton.cantBookOwn": "Nemôžete si rezervovať vlastnú jazdu",
  "bookingButton.bookingFailed": "Rezervácia zlyhala. Skúste to znova.",
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
  "auth.newPassword": "New password",
  "auth.newPasswordDescription": "Enter your new password.",
  "auth.newPasswordLabel": "New password",
  "auth.confirmPasswordLabel": "Confirm password",
  "auth.confirmPasswordPlaceholder": "Repeat password",
  "auth.updatePassword": "Set password",
  "auth.updatingPassword": "Updating...",
  "auth.passwordUpdatedTitle": "Password updated",
  "auth.passwordUpdatedMessage": "Your password has been successfully updated.",
  "auth.continueToApp": "Continue to app",

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

  // Location sharing banner (LEGAL-03)
  "location.sharingWith": "Sharing location with {names}",
  "location.stop": "Stop",
  "location.passengers": "passengers",

  // Errors
  "errors.networkError": "Network error. Check your connection.",
  "errors.notFound": "Page not found",
  "errors.serverError": "Server error. Try again later.",
  "errors.unauthorized": "Unauthorized",
  "errors.rateLimited": "Too many requests. Try again later.",

  // Nav secondary
  "nav.community": "Community",
  "nav.myStats": "My Stats",

  // Ride form
  "rideForm.whereGoing": "Where are you going?",
  "rideForm.from": "From",
  "rideForm.to": "To",
  "rideForm.pickupLocation": "Pickup location",
  "rideForm.destination": "Destination",
  "rideForm.computingRoute": "Computing route...",
  "rideForm.distance": "Distance",
  "rideForm.duration": "Duration",
  "rideForm.suggested": "Suggested",
  "rideForm.whenLeaving": "When are you leaving?",
  "rideForm.time": "Time",
  "rideForm.availableSeats": "Available seats",
  "rideForm.bookingMode": "Booking mode",
  "rideForm.instant": "Instant",
  "rideForm.instantDesc": "Passengers book immediately",
  "rideForm.request": "Request",
  "rideForm.requestDesc": "You approve each booking",
  "rideForm.priceDetails": "Price & details",
  "rideForm.recommended": "Recommended: {price} {currency} (based on fuel costs)",
  "rideForm.vehicleOptional": "Vehicle (optional)",
  "rideForm.selectVehicle": "Select a vehicle",
  "rideForm.linkEvent": "Link to event (optional)",
  "rideForm.noEvent": "No event",
  "rideForm.notesPlaceholder": "Meeting point, luggage info, pets, smoking policy...",
  "rideForm.notesLabel": "Notes for passengers (optional)",
  "rideForm.postingRide": "Posting ride...",
  "rideForm.next": "Next",
  "rideForm.selectBothPoints": "Please select both pickup and destination.",
  "rideForm.route": "Route",
  "rideForm.when": "When",
  "rideForm.aiPromptPlaceholder": "Describe your ride...",
  "rideForm.aiParsing": "Parsing...",
  "rideForm.chooseOnMap": "Choose on map",
  "rideForm.selectOnMap": "Tap the map to select a location",
  "rideForm.confirmLocation": "Confirm location",

  // Search page
  "search.title": "Search Rides",
  "search.searchHint": "Search for rides to festivals, events, and more",
  "search.noRidesFound": "No rides found",
  "search.noRidesHint": "Try expanding your search radius or changing the date.",
  "search.ridesFound": "rides found",
  "search.rideFound": "ride found",

  // Settings extra
  "settings.exportData": "Export My Data",
  "settings.inviteFriends": "Invite Friends",
  "settings.supportUs": "Support Us",
  "settings.deleteConfirmTitle": "Delete Account",
  "settings.deleteConfirmMessage": "Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed.",
  "settings.aiSuggestions": "AI Suggestions",
  "settings.aiSuggestionsDesc": "Show AI suggestions and auto-fill in forms",

  // Profile extra
  "profile.title": "Profile",
  "profile.edit": "Edit",
  "profile.yourProfile": "Your Profile",
  "profile.tapToSetup": "Tap Edit to set up your profile",
  "profile.phoneVerified": "Phone Verified",
  "profile.idVerified": "ID Verified",
  "profile.idVerification": "ID Verification",
  "profile.idVerifiedDesc": "Your ID has been verified",
  "profile.uploadId": "Upload ID Document",
  "profile.uploadingId": "Uploading...",
  "profile.uploadIdDesc": "Upload a photo of your ID to increase trust with other users.",
  "profile.clickToChangeAvatar": "Click avatar to change photo",
  "profile.saveChanges": "Save changes",
  "profile.saving": "Saving...",
  "profile.instagramUrl": "Instagram URL",
  "profile.facebookUrl": "Facebook URL",
  "profile.myVehicles": "My Vehicles",
  "profile.addVehicleHint": "Add a vehicle to offer rides",
  "profile.manageVehicles": "Manage Vehicles",
  "profile.avatarRequired": "Profile photo is required",

  // Onboarding
  "onboarding.tapToAddPhoto": "Tap to add a photo",
  "onboarding.avatarRequired": "Please add a profile photo to continue.",
  "onboarding.saving": "Saving...",
  "onboarding.displayName": "Display name",
  "onboarding.yourName": "Your name",
  "onboarding.roleRider": "I want to ride",
  "onboarding.roleRiderDesc": "Find rides to festivals and events",
  "onboarding.roleDriver": "I want to drive",
  "onboarding.roleDriverDesc": "Offer rides and share your journey",
  "onboarding.roleBoth": "Both",
  "onboarding.roleBothDesc": "Find and offer rides",
  "onboarding.vehicleMake": "Make",
  "onboarding.vehicleModel": "Model",
  "onboarding.vehicleColor": "Color",
  "onboarding.vehiclePlate": "License plate",
  "onboarding.vehiclePhotoOptional": "Add a photo (optional)",
  "onboarding.errorNameRequired": "Please enter your name (1-50 characters).",
  "onboarding.errorPhotoRequired": "Please add a profile photo to continue.",
  "onboarding.errorNotAuthenticated": "Not authenticated. Please sign in again.",
  "onboarding.errorSaveProfile": "Failed to save profile.",
  "onboarding.errorSelectRole": "Please select how you want to use Rideshare.",
  "onboarding.errorSaveRole": "Failed to save role.",
  "onboarding.errorVehicleFields": "Please fill in all vehicle fields.",
  "onboarding.errorSaveVehicle": "Failed to add vehicle.",
  // Onboarding steps
  "onboarding.welcome.title": "Welcome to spolujizda.online",
  "onboarding.welcome.description": "Share rides to festivals, save money, and meet fellow music lovers. Finding and offering rides has never been easier.",
  "onboarding.welcome.button": "Next",
  "onboarding.profile.title": "Set up your profile",
  "onboarding.profile.description": "Add your name and photo so others know who they are riding with.",
  "onboarding.profile.button": "Continue",
  "onboarding.role.title": "How will you use Rideshare?",
  "onboarding.role.description": "Let us know if you want to offer rides, find rides, or both. You can change this anytime.",
  "onboarding.role.button": "Continue",
  "onboarding.vehicle.title": "Add your vehicle",
  "onboarding.vehicle.description": "Add your car details so passengers know what to look for. You can skip this and add later from your profile.",
  "onboarding.vehicle.button": "Add Vehicle",
  "onboarding.vehicle.skip": "Skip for now",
  "onboarding.location.title": "Find rides near you",
  "onboarding.location.description": "Enable location access so we can show you rides and pickup points nearby. You can always change this in Settings later.",
  "onboarding.location.button": "Enable Location",
  "onboarding.location.skip": "Skip",
  "onboarding.notifications.title": "Never miss a ride",
  "onboarding.notifications.description": "Get notified about booking confirmations, ride reminders, and messages from your driver or passengers.",
  "onboarding.notifications.button": "Enable Notifications",
  "onboarding.notifications.skip": "Skip",
  "onboarding.ready.title": "You're all set!",
  "onboarding.ready.description": "Start by searching for a ride to your next festival, or post your own ride to share with others.",
  "onboarding.ready.button": "Get Started",

  // Legal / ToS consent
  "auth.agreeToTermsPre": "I agree to the",
  "auth.termsOfService": "Terms of Service",
  "auth.privacyPolicy": "Privacy Policy",
  "auth.mustAcceptTerms": "You must accept the Terms of Service and Privacy Policy",
  "common.and": "and",

  // Ride detail
  "rideDetail.tripDetails": "Trip Details",
  "rideDetail.distance": "Distance",
  "rideDetail.duration": "Duration",
  "rideDetail.price": "Price",
  "rideDetail.driver": "Driver",
  "rideDetail.vehicle": "Vehicle",
  "rideDetail.preferences": "Preferences",
  "rideDetail.prefSmoking": "Smoking allowed",
  "rideDetail.prefPets": "Pets welcome",
  "rideDetail.prefMusic": "Music on",
  "rideDetail.prefChat": "Chatty",
  "rideDetail.notes": "Notes",
  "rideDetail.booking": "Booking",
  "rideDetail.seatsAvailable": "{available} of {total} {seats} available",
  "rideDetail.instant": "Instant",
  "rideDetail.request": "Request",
  "rideDetail.cancelBooking": "Cancel Booking",
  "rideDetail.manageBookings": "Manage Bookings",
  "rideDetail.pendingRequest": "pending request",
  "rideDetail.pendingRequests": "pending requests",
  "rideDetail.liveLocation": "Live Location",
  "rideDetail.shareMyLocation": "Share My Location",
  "rideDetail.starting": "Starting...",
  "rideDetail.stopSharing": "Stop Sharing",
  "rideDetail.waitingForDriver": "Ride is in progress -- waiting for driver's location...",
  "rideDetail.completeRide": "Complete Ride",
  "rideDetail.completing": "Completing...",
  "rideDetail.confirmComplete": "Confirm Complete?",
  "rideDetail.cannotCompleteBefore": "Cannot complete before departure ({date} at {time})",
  "rideDetail.editRide": "Edit Ride",
  "rideDetail.cancelRide": "Cancel Ride",
  "rideDetail.rateThisRide": "Rate this ride",
  "rideDetail.rideCompleted": "This ride has been completed.",
  "rideDetail.opening": "Opening...",
  "rideDetail.message": "Message {name}",
  "rideDetail.couldNotOpenConversation": "Could not open conversation",
  "rideDetail.failedToStartRide": "Failed to start ride",
  "rideDetail.failedToCompleteRide": "Failed to complete ride",
  "rideDetail.onlyDriverCanComplete": "Only the ride driver can complete this ride",
  "rideDetail.cannotCompleteStatus": "This ride cannot be completed from its current status",
  "rideDetail.rideCompletedToast": "Ride completed!",
  "rideDetail.locationSharingStarted": "Location sharing started",
  "rideDetail.seatSingular": "seat",
  "rideDetail.seatPlural": "seats",

  // My Rides
  "myRides.title": "My Rides",
  "myRides.asDriver": "As Driver",
  "myRides.asPassenger": "As Passenger",
  "myRides.upcoming": "Upcoming",
  "myRides.past": "Past",
  "myRides.noUpcomingRides": "No upcoming rides",
  "myRides.noPastRides": "No past rides",
  "myRides.postRideHint": "Post a ride to get started!",
  "myRides.pastRidesHint": "Your completed and cancelled rides will appear here.",
  "myRides.postARide": "Post a Ride",
  "myRides.noUpcomingRidesPassenger": "No upcoming rides",
  "myRides.noRideHistory": "No ride history yet",
  "myRides.searchHint": "Search for a ride to get started!",
  "myRides.pastRidesPassengerHint": "Your past rides as a passenger will appear here.",
  "myRides.searchForARide": "Search for a Ride",
  "myRides.cancelBooking": "Cancel Booking",
  "myRides.seats": "seats",
  "myRides.seatSingular": "seat",
  "myRides.seatPlural": "seats",

  // Booking button
  "bookingButton.requestPending": "Request pending",
  "bookingButton.booked": "Booked ({seats} {seatWord})",
  "bookingButton.fullyBooked": "Fully booked",
  "bookingButton.seats": "Seats",
  "bookingButton.bookSeats": "Book {count} {seatWord}",
  "bookingButton.requestSeats": "Request {count} {seatWord}",
  "bookingButton.processing": "Processing...",
  "bookingButton.seatBooked": "Seat booked!",
  "bookingButton.requestSent": "Request sent!",
  "bookingButton.notEnoughSeats": "Not enough seats available",
  "bookingButton.alreadyBooked": "You already have a booking on this ride",
  "bookingButton.cantBookOwn": "You can't book your own ride",
  "bookingButton.bookingFailed": "Booking failed. Please try again.",
};

export const translations: Record<SupportedLocale, TranslationKeys> = {
  cs,
  sk,
  en,
};
