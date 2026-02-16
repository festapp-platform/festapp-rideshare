import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Obchodní podmínky | Terms of Service | spolujizda.online",
  description:
    "Obchodní podmínky platformy spolujizda.online pro sdílení jízd. Terms of service for the free community carpooling platform.",
};

export default function TermsPage() {
  return (
    <article className="prose prose-lg mx-auto max-w-3xl px-4 py-12">
      {/* ==================== CZECH ==================== */}
      <h1>Obchodní podmínky</h1>
      <p className="text-sm text-gray-500">Poslední aktualizace: únor 2026</p>

      <h2>1. Úvodní ustanovení</h2>
      <p>
        Platforma spolujizda.online (dále jen &bdquo;Platforma&ldquo;) je bezplatná komunitní
        služba umožňující propojení řidičů s volnými místy ve vozidle a
        spolucestujících směřujících stejným směrem. Provozovatelem Platformy je
        komunitní projekt spolujizda.online. Používáním Platformy vyjadřujete
        souhlas s těmito obchodními podmínkami (dále jen &bdquo;Podmínky&ldquo;). Pokud
        s Podmínkami nesouhlasíte, Platformu prosím nepoužívejte.
      </p>

      <h2>2. Definice pojmů</h2>
      <ul>
        <li>
          <strong>Řidič</strong> &ndash; uživatel, který nabízí volná místa ve svém
          vozidle prostřednictvím Platformy.
        </li>
        <li>
          <strong>Spolucestující (cestující)</strong> &ndash; uživatel, který si
          rezervuje místo v nabídnuté jízdě.
        </li>
        <li>
          <strong>Jízda</strong> &ndash; nabídka sdílené přepravy vytvořená řidičem
          na Platformě.
        </li>
        <li>
          <strong>Příspěvek na náklady</strong> &ndash; dobrovolný finanční příspěvek
          spolucestujícího na sdílení nákladů na pohonné hmoty a mýtné.
        </li>
      </ul>

      <h2>3. Registrace a uživatelský účet</h2>
      <p>
        Pro používání Platformy je nutné vytvořit si uživatelský účet. Registrací
        potvrzujete, že:
      </p>
      <ul>
        <li>Jste starší 18 let.</li>
        <li>
          Pokud nabízíte jízdy jako řidič, disponujete platným řidičským oprávněním
          a pojištěním odpovědnosti z provozu vozidla (povinné ručení).
        </li>
        <li>
          Údaje, které uvádíte ve svém profilu, jsou pravdivé, přesné a aktuální.
        </li>
      </ul>
      <p>
        Jste odpovědní za zachování důvěrnosti svých přihlašovacích údajů a za
        veškerou aktivitu provedenou prostřednictvím vašeho účtu.
      </p>

      <h2>4. Pravidla používání</h2>
      <p>Při používání Platformy je zakázáno:</p>
      <ul>
        <li>
          Využívat Platformu ke komerční přepravě osob (Platforma slouží výhradně
          ke sdílení jízd, nikoli k poskytování taxislužby nebo jiné komerční
          přepravy).
        </li>
        <li>
          Přepravovat nezákonné zboží, nebezpečné látky nebo cokoli v rozporu
          s platnými právními předpisy.
        </li>
        <li>
          Obtěžovat, vyhrožovat nebo jinak nevhodně se chovat vůči ostatním
          uživatelům.
        </li>
        <li>
          Zveřejňovat spam, podvodné nabídky nebo zavádějící informace.
        </li>
      </ul>
      <p>
        Řidič je plně odpovědný za technický stav svého vozidla, dodržování
        pravidel silničního provozu a bezpečnost přepravy.
      </p>

      <h2>5. Sdílení nákladů</h2>
      <p>
        Ceny zobrazené na Platformě představují doporučené příspěvky na sdílení
        nákladů na pohonné hmoty a mýtné. spolujizda.online není komerční
        přepravní služba. Řidič nesmí prostřednictvím Platformy dosahovat zisku
        &ndash; příspěvky slouží výhradně k pokrytí nákladů spojených s jízdou.
        Řidič stanoví výši příspěvku; Platforma může zobrazit doporučenou částku
        na základě vzdálenosti.
      </p>

      <h2>6. Hodnocení a recenze</h2>
      <p>
        Po dokončení jízdy mohou uživatelé vzájemně hodnotit své zkušenosti.
        Hodnocení a recenze musí být pravdivé, věcné a nesmí obsahovat
        urážlivý, diskriminační nebo pomlouvačný obsah. Platforma si vyhrazuje
        právo odstranit hodnocení, která porušují tato pravidla.
      </p>

      <h2>7. Ochrana soukromí</h2>
      <p>
        Vaše soukromí je pro nás důležité. Podrobné informace o zpracování
        osobních údajů naleznete v naší{" "}
        <a href="/privacy">Zásadách ochrany osobních údajů</a>. Sdílení polohy
        v reálném čase je dobrovolné a vyžaduje váš výslovný souhlas.
      </p>

      <h2>8. Omezení odpovědnosti</h2>
      <p>
        Platforma slouží jako zprostředkovatel &ndash; propojuje řidiče a
        spolucestující, ale není smluvní stranou dohody o jízdě. Platforma:
      </p>
      <ul>
        <li>Negarantuje dostupnost, kvalitu ani bezpečnost nabízených jízd.</li>
        <li>
          Nenese odpovědnost za škody, úrazy nebo ztráty vzniklé v souvislosti
          s jízdami zprostředkovanými prostřednictvím Platformy.
        </li>
        <li>
          Nezaručuje chování, spolehlivost ani totožnost ostatních uživatelů.
        </li>
      </ul>
      <p>
        Uživatelé jsou odpovědní za vlastní pojištění a dodržování platných
        právních předpisů.
      </p>

      <h2>9. Zrušení jízd</h2>
      <p>
        Uživatelé by měli zrušit rezervaci s dostatečným předstihem, aby
        nezpůsobili potíže ostatním. Opakované rušení jízd na poslední chvíli
        může negativně ovlivnit vaše hodnocení spolehlivosti na Platformě.
      </p>

      <h2>10. Změny podmínek</h2>
      <p>
        Provozovatel si vyhrazuje právo tyto Podmínky kdykoli aktualizovat.
        O podstatných změnách budou uživatelé informováni prostřednictvím
        Platformy. Pokračující používání Platformy po zveřejnění změn znamená
        souhlas s aktualizovanými Podmínkami.
      </p>

      <h2>11. Rozhodné právo a řešení sporů</h2>
      <p>
        Tyto Podmínky se řídí právním řádem České republiky, zejména zákonem
        č.&nbsp;89/2012&nbsp;Sb., občanský zákoník. Případné spory budou
        řešeny příslušnými soudy České republiky.
      </p>

      <h2>12. Kontakt</h2>
      <p>
        V případě dotazů k těmto Podmínkám nás kontaktujte na{" "}
        <a href="mailto:contact@spolujizda.online">contact@spolujizda.online</a>.
      </p>

      {/* ==================== ENGLISH ==================== */}
      <hr className="my-12" />

      <h1>Terms of Service</h1>
      <p className="text-sm text-gray-500">Last updated: February 2026</p>

      <h2>1. Introduction</h2>
      <p>
        spolujizda.online (the &ldquo;Platform&rdquo;) is a free community carpooling service
        that connects drivers with empty seats to passengers heading in the same
        direction. The Platform is operated as a community project. By using the
        Platform, you agree to these Terms of Service. If you do not agree,
        please do not use the Platform.
      </p>

      <h2>2. Definitions</h2>
      <ul>
        <li>
          <strong>Driver</strong> &ndash; a user who offers available seats in their
          vehicle through the Platform.
        </li>
        <li>
          <strong>Passenger</strong> &ndash; a user who books a seat in an offered
          ride.
        </li>
        <li>
          <strong>Ride</strong> &ndash; a shared transport offer created by a driver
          on the Platform.
        </li>
        <li>
          <strong>Cost contribution</strong> &ndash; a voluntary financial
          contribution by the passenger toward shared fuel and toll costs.
        </li>
      </ul>

      <h2>3. Registration and Account</h2>
      <p>
        To use the Platform, you must create a user account. By registering, you
        confirm that:
      </p>
      <ul>
        <li>You are at least 18 years old.</li>
        <li>
          If you offer rides as a driver, you hold a valid driver&apos;s license and
          appropriate vehicle insurance.
        </li>
        <li>
          The information you provide in your profile is truthful, accurate, and
          up to date.
        </li>
      </ul>

      <h2>4. Usage Rules</h2>
      <ul>
        <li>
          The Platform must not be used for commercial passenger transport
          (ride-sharing only, not taxi or commercial transport).
        </li>
        <li>
          Transporting illegal goods, hazardous materials, or anything in
          violation of applicable law is prohibited.
        </li>
        <li>
          Harassment, threats, or abusive behavior toward other users is
          prohibited.
        </li>
        <li>Spam, fraudulent listings, or misleading information is prohibited.</li>
      </ul>
      <p>
        Drivers are fully responsible for their vehicle&apos;s condition, compliance
        with traffic laws, and transport safety.
      </p>

      <h2>5. Cost Sharing</h2>
      <p>
        Prices displayed on the Platform are suggested contributions for fuel and
        toll cost sharing only. spolujizda.online is not a commercial transport
        service. Drivers must not profit from rides &mdash; contributions are
        intended to cover travel costs only.
      </p>

      <h2>6. Ratings and Reviews</h2>
      <p>
        After completing a ride, users may rate their experience. Ratings and
        reviews must be honest, factual, and must not contain offensive,
        discriminatory, or defamatory content.
      </p>

      <h2>7. Privacy</h2>
      <p>
        Your privacy is important to us. Please review our{" "}
        <a href="/privacy">Privacy Policy</a> for details on how we collect, use,
        and protect your personal data. Real-time location sharing is voluntary
        and requires your explicit consent.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        The Platform acts as an intermediary &mdash; it connects drivers and
        passengers but is not a party to any ride agreement. The Platform does
        not guarantee ride availability, quality, or safety, and is not liable
        for any incidents, damages, or losses arising from rides arranged through
        the service. Users are responsible for their own insurance and compliance
        with applicable laws.
      </p>

      <h2>9. Cancellations</h2>
      <p>
        Users should cancel bookings with reasonable notice. Repeated
        last-minute cancellations may affect your reliability score on the
        Platform.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the
        Platform after changes are published constitutes acceptance of the
        updated terms.
      </p>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the Czech Republic. Disputes
        shall be resolved by the competent courts of the Czech Republic.
      </p>

      <h2>12. Contact</h2>
      <p>
        For questions about these Terms, contact us at{" "}
        <a href="mailto:contact@spolujizda.online">contact@spolujizda.online</a>.
      </p>
    </article>
  );
}
