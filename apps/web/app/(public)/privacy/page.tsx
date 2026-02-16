import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zásady ochrany osobních údajů | Privacy Policy | spolujizda.online",
  description:
    "Zásady ochrany osobních údajů platformy spolujizda.online. Privacy policy for spolujizda.online.",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-lg mx-auto max-w-3xl px-4 py-12">
      {/* ==================== CZECH ==================== */}
      <h1>Zásady ochrany osobních údajů</h1>
      <p className="text-sm text-gray-500">Poslední aktualizace: únor 2026</p>

      <h2>1. Jaké údaje shromažďujeme</h2>
      <p>Shromažďujeme následující typy osobních údajů:</p>
      <ul>
        <li>
          <strong>Identifikační údaje:</strong> Jméno (zobrazované jméno),
          e-mailová adresa nebo telefonní číslo, profilová fotografie.
        </li>
        <li>
          <strong>Údaje o vozidle:</strong> Značka, model, barva a registrační
          značka vozidla (pouze řidiči).
        </li>
        <li>
          <strong>Údaje o poloze:</strong> Vaše poloha v reálném čase, pokud se
          rozhodnete ji sdílet během jízdy (sdílení polohy je dobrovolné).
        </li>
        <li>
          <strong>Údaje o jízdách:</strong> Nabídky jízd, rezervace, trasy,
          hodnocení a recenze.
        </li>
        <li>
          <strong>Komunikace:</strong> Zprávy mezi účastníky jízdy v rámci
          chatovací funkce Platformy.
        </li>
        <li>
          <strong>Technické údaje:</strong> Typ prohlížeče, operační systém,
          identifikátory zařízení pro doručování push notifikací, údaje o
          používání Platformy.
        </li>
      </ul>

      <h2>2. Jak údaje používáme</h2>
      <ul>
        <li>
          <strong>Propojení řidičů a spolucestujících</strong> &ndash; párování
          nabídek a poptávek jízd na základě trasy, data a preferencí.
        </li>
        <li>
          <strong>Zasílání oznámení</strong> &ndash; informace o aktualizacích
          jízd, potvrzeních rezervací, zprávách a připomínkách.
        </li>
        <li>
          <strong>Hodnocení a bezpečnost</strong> &ndash; zobrazování hodnocení
          spolehlivosti a recenzí ostatním uživatelům.
        </li>
        <li>
          <strong>Analytika a zlepšování</strong> &ndash; anonymizovaná analýza
          využívání Platformy pro její vylepšování.
        </li>
      </ul>

      <h2>3. Právní základ zpracování</h2>
      <p>
        Vaše osobní údaje zpracováváme na základě následujících právních
        titulů dle Nařízení (EU) 2016/679 (GDPR):
      </p>
      <ul>
        <li>
          <strong>Souhlas</strong> (čl. 6 odst. 1 písm. a) GDPR) &ndash; pro
          sdílení polohy v reálném čase a zasílání marketingových sdělení.
        </li>
        <li>
          <strong>Plnění smlouvy</strong> (čl. 6 odst. 1 písm. b) GDPR)
          &ndash; pro provozování uživatelského účtu a zprostředkování jízd.
        </li>
        <li>
          <strong>Oprávněný zájem</strong> (čl. 6 odst. 1 písm. f) GDPR)
          &ndash; pro zajištění bezpečnosti Platformy, prevenci podvodů a
          zlepšování služeb.
        </li>
      </ul>

      <h2>4. Sdílení údajů</h2>
      <p>Vaše osobní údaje nesdáváme ani neprodáváme třetím stranám. Údaje sdílíme pouze:</p>
      <ul>
        <li>
          <strong>S ostatními uživateli</strong> &ndash; vaše zobrazované jméno,
          profilová fotografie, hodnocení a informace o vozidle jsou viditelné
          ostatním účastníkům jízdy.
        </li>
        <li>
          <strong>S poskytovateli služeb</strong> &ndash; pro provoz Platformy
          využíváme služby třetích stran: Supabase (hosting databáze a
          autentizace, AWS eu-central-1, Frankfurt), OneSignal (doručování push
          notifikací), AWS SES/SNS (e-mailová a SMS komunikace), Google Maps
          (výpočet tras a zobrazení map).
        </li>
      </ul>

      <h2>5. Uchovávání údajů</h2>
      <ul>
        <li>
          <strong>Aktivní účet:</strong> Vaše údaje uchováváme po celou dobu
          existence vašeho účtu.
        </li>
        <li>
          <strong>Smazaný účet:</strong> Po smazání účtu uchováváme vaše údaje
          po dobu 30 dnů (ochranná lhůta pro obnovení), poté jsou trvale
          odstraněny.
        </li>
        <li>
          <strong>Audit logy:</strong> Záznamy o aktivitě jsou uchovávány po
          dobu 1 roku pro účely bezpečnosti a řešení sporů.
        </li>
      </ul>

      <h2>6. Vaše práva</h2>
      <p>
        V souladu s GDPR (čl. 15&ndash;22) máte následující práva:
      </p>
      <ul>
        <li>
          <strong>Právo na přístup:</strong> Můžete si vyžádat kopii svých
          osobních údajů.
        </li>
        <li>
          <strong>Právo na opravu:</strong> Můžete opravit nepřesné nebo
          neúplné údaje.
        </li>
        <li>
          <strong>Právo na výmaz:</strong> Můžete požádat o smazání svých
          osobních údajů.
        </li>
        <li>
          <strong>Právo na přenositelnost:</strong> Můžete si vyexportovat svá
          data v strojově čitelném formátu z Nastavení &gt; Export mých dat.
        </li>
        <li>
          <strong>Právo vznést námitku:</strong> Můžete vznést námitku proti
          zpracování vašich údajů pro určité účely.
        </li>
        <li>
          <strong>Právo na omezení zpracování:</strong> Můžete požádat o
          omezení zpracování vašich údajů.
        </li>
      </ul>

      <h2>7. Soubory cookie</h2>
      <p>
        Platforma používá výhradně funkční soubory cookie nezbytné pro přihlášení
        a správné fungování služby. Nepoužíváme reklamní ani sledovací cookies
        třetích stran.
      </p>

      <h2>8. Změny zásad</h2>
      <p>
        Tyto zásady můžeme příležitostně aktualizovat. O podstatných změnách
        budete informováni prostřednictvím e-mailu nebo notifikace v Platformě.
      </p>

      <h2>9. Kontakt</h2>
      <p>
        V případě dotazů ohledně ochrany osobních údajů nebo pro uplatnění
        svých práv nás kontaktujte na{" "}
        <a href="mailto:contact@spolujizda.online">contact@spolujizda.online</a>.
        Vzhledem k tomu, že spolujizda.online je malý komunitní projekt, není
        jmenován pověřenec pro ochranu osobních údajů (DPO).
      </p>

      {/* ==================== ENGLISH ==================== */}
      <hr className="my-12" />

      <h1>Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: February 2026</p>

      <h2>1. What Data We Collect</h2>
      <p>We collect the following types of personal data:</p>
      <ul>
        <li>
          <strong>Identity information:</strong> Display name, email address or
          phone number, profile photo.
        </li>
        <li>
          <strong>Vehicle information:</strong> Make, model, color, and license
          plate (drivers only).
        </li>
        <li>
          <strong>Location data:</strong> Your real-time location when you choose
          to share it during a ride (location sharing is voluntary).
        </li>
        <li>
          <strong>Ride data:</strong> Ride offers, bookings, routes, ratings, and
          reviews.
        </li>
        <li>
          <strong>Communications:</strong> Messages exchanged between ride
          participants through the Platform&apos;s chat feature.
        </li>
        <li>
          <strong>Technical data:</strong> Browser type, operating system, device
          identifiers for push notifications, and usage data.
        </li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>
          <strong>Matchmaking:</strong> Connecting drivers and passengers based on
          route, date, and preferences.
        </li>
        <li>
          <strong>Notifications:</strong> Sending ride updates, booking
          confirmations, messages, and reminders.
        </li>
        <li>
          <strong>Safety and ratings:</strong> Displaying reliability scores and
          reviews to other users.
        </li>
        <li>
          <strong>Analytics:</strong> Anonymized analysis of Platform usage for
          improvements.
        </li>
      </ul>

      <h2>3. Legal Basis for Processing</h2>
      <p>
        We process your personal data based on the following legal bases under
        Regulation (EU) 2016/679 (GDPR):
      </p>
      <ul>
        <li>
          <strong>Consent</strong> (Art. 6(1)(a)) &ndash; for real-time location
          sharing and marketing communications.
        </li>
        <li>
          <strong>Contract performance</strong> (Art. 6(1)(b)) &ndash; for
          operating your account and facilitating rides.
        </li>
        <li>
          <strong>Legitimate interest</strong> (Art. 6(1)(f)) &ndash; for
          Platform security, fraud prevention, and service improvements.
        </li>
      </ul>

      <h2>4. Data Sharing</h2>
      <p>
        We do not sell your personal data. Information is shared only:
      </p>
      <ul>
        <li>
          <strong>With other users:</strong> Your display name, profile photo,
          ratings, and vehicle information are visible to ride participants.
        </li>
        <li>
          <strong>With service providers:</strong> Supabase (database and
          authentication hosting, AWS eu-central-1, Frankfurt), OneSignal (push
          notifications), AWS SES/SNS (email and SMS), Google Maps (route
          calculation and maps).
        </li>
      </ul>

      <h2>5. Data Retention</h2>
      <ul>
        <li>
          <strong>Active account:</strong> Data is retained for the duration of
          your account.
        </li>
        <li>
          <strong>Deleted account:</strong> Data is kept for 30 days (grace
          period for recovery), then permanently deleted.
        </li>
        <li>
          <strong>Audit logs:</strong> Activity records are retained for 1 year
          for security and dispute resolution.
        </li>
      </ul>

      <h2>6. Your Rights (GDPR)</h2>
      <p>
        Under GDPR (Articles 15&ndash;22), you have the right to:
      </p>
      <ul>
        <li>
          <strong>Access:</strong> Request a copy of your personal data.
        </li>
        <li>
          <strong>Rectification:</strong> Correct inaccurate or incomplete data.
        </li>
        <li>
          <strong>Erasure:</strong> Request deletion of your personal data.
        </li>
        <li>
          <strong>Data portability:</strong> Export your data in a
          machine-readable format from Settings &gt; Export My Data.
        </li>
        <li>
          <strong>Objection:</strong> Object to processing for certain purposes.
        </li>
        <li>
          <strong>Restriction:</strong> Request restriction of processing.
        </li>
      </ul>

      <h2>7. Cookies</h2>
      <p>
        The Platform uses only functional cookies necessary for authentication
        and proper operation. We do not use advertising or third-party tracking
        cookies.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Significant changes will be
        communicated via email or in-Platform notification.
      </p>

      <h2>9. Contact</h2>
      <p>
        For questions about this Privacy Policy or to exercise your data rights,
        contact us at{" "}
        <a href="mailto:contact@spolujizda.online">contact@spolujizda.online</a>.
        As spolujizda.online is a small community project, a Data Protection
        Officer (DPO) is not designated.
      </p>
    </article>
  );
}
