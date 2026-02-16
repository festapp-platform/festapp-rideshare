/**
 * Localized email templates for Supabase Auth hook.
 *
 * 5 email types × 3 locales = 15 templates.
 * Uses table-based HTML layout with inline CSS for email client compatibility.
 * Branding matches send-notification's emailWrapper pattern.
 */

type EmailActionType =
  | "signup"
  | "recovery"
  | "magic_link"
  | "email_change"
  | "invite";
type Locale = "cs" | "sk" | "en";

export interface EmailTemplate {
  subject: string;
  html: string;
}

const APP_NAME = "spolujizda.online";
const APP_URL = Deno.env.get("APP_URL") ?? "https://spolujizda.online";
const BRAND_COLOR = "#6C63FF";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapEmail(content: string, lang: string): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f3;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:${BRAND_COLOR};padding:20px 24px;text-align:center;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">${APP_NAME}</span>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          ${content}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #eee;text-align:center;">
          <p style="margin:0;font-size:12px;color:#999;">${APP_NAME} &mdash; <a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none;">${APP_URL}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(url: string, label: string): string {
  return `<div style="margin:24px 0;text-align:center;">
  <a href="${escapeHtml(url)}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${escapeHtml(label)}</a>
</div>`;
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

interface TemplateStrings {
  subject: string;
  heading: string;
  body: string;
  button: string;
  footer: string;
}

const templates: Record<EmailActionType, Record<Locale, TemplateStrings>> = {
  signup: {
    cs: {
      subject: "Potvrďte svou e-mailovou adresu",
      heading: "Vítejte na spolujizda.online!",
      body: "Děkujeme za registraci. Potvrďte prosím svou e-mailovou adresu kliknutím na tlačítko níže.",
      button: "Potvrdit e-mail",
      footer:
        "Pokud jste si tento účet nevytvořili, můžete tento e-mail ignorovat.",
    },
    sk: {
      subject: "Potvrďte svoju e-mailovú adresu",
      heading: "Vitajte na spolujizda.online!",
      body: "Ďakujeme za registráciu. Potvrďte prosím svoju e-mailovú adresu kliknutím na tlačidlo nižšie.",
      button: "Potvrdiť e-mail",
      footer:
        "Ak ste si tento účet nevytvorili, môžete tento e-mail ignorovať.",
    },
    en: {
      subject: "Confirm your email address",
      heading: "Welcome to spolujizda.online!",
      body: "Thanks for signing up. Please confirm your email address by clicking the button below.",
      button: "Confirm email",
      footer:
        "If you didn't create this account, you can safely ignore this email.",
    },
  },
  recovery: {
    cs: {
      subject: "Obnovte své heslo",
      heading: "Obnovení hesla",
      body: "Obdrželi jsme žádost o obnovení hesla k vašemu účtu. Klikněte na tlačítko níže pro nastavení nového hesla.",
      button: "Obnovit heslo",
      footer:
        "Pokud jste o obnovení hesla nežádali, můžete tento e-mail ignorovat.",
    },
    sk: {
      subject: "Obnovte svoje heslo",
      heading: "Obnovenie hesla",
      body: "Dostali sme žiadosť o obnovenie hesla k vášmu účtu. Kliknite na tlačidlo nižšie pre nastavenie nového hesla.",
      button: "Obnoviť heslo",
      footer:
        "Ak ste o obnovenie hesla nežiadali, môžete tento e-mail ignorovať.",
    },
    en: {
      subject: "Reset your password",
      heading: "Password reset",
      body: "We received a request to reset your account password. Click the button below to set a new password.",
      button: "Reset password",
      footer:
        "If you didn't request a password reset, you can safely ignore this email.",
    },
  },
  magic_link: {
    cs: {
      subject: "Váš přihlašovací odkaz",
      heading: "Přihlášení do spolujizda.online",
      body: "Klikněte na tlačítko níže pro přihlášení do svého účtu. Tento odkaz je platný 1 hodinu.",
      button: "Přihlásit se",
      footer:
        "Pokud jste o přihlášení nežádali, můžete tento e-mail ignorovat.",
    },
    sk: {
      subject: "Váš prihlasovací odkaz",
      heading: "Prihlásenie do spolujizda.online",
      body: "Kliknite na tlačidlo nižšie pre prihlásenie do svojho účtu. Tento odkaz je platný 1 hodinu.",
      button: "Prihlásiť sa",
      footer:
        "Ak ste o prihlásenie nežiadali, môžete tento e-mail ignorovať.",
    },
    en: {
      subject: "Your login link",
      heading: "Sign in to spolujizda.online",
      body: "Click the button below to sign in to your account. This link is valid for 1 hour.",
      button: "Sign in",
      footer:
        "If you didn't request this login link, you can safely ignore this email.",
    },
  },
  email_change: {
    cs: {
      subject: "Potvrďte změnu e-mailu",
      heading: "Změna e-mailové adresy",
      body: "Obdrželi jsme žádost o změnu e-mailové adresy vašeho účtu. Klikněte na tlačítko níže pro potvrzení.",
      button: "Potvrdit změnu",
      footer:
        "Pokud jste o změnu e-mailu nežádali, můžete tento e-mail ignorovat.",
    },
    sk: {
      subject: "Potvrďte zmenu e-mailu",
      heading: "Zmena e-mailovej adresy",
      body: "Dostali sme žiadosť o zmenu e-mailovej adresy vášho účtu. Kliknite na tlačidlo nižšie pre potvrdenie.",
      button: "Potvrdiť zmenu",
      footer:
        "Ak ste o zmenu e-mailu nežiadali, môžete tento e-mail ignorovať.",
    },
    en: {
      subject: "Confirm email change",
      heading: "Email address change",
      body: "We received a request to change the email address for your account. Click the button below to confirm.",
      button: "Confirm change",
      footer:
        "If you didn't request this email change, you can safely ignore this email.",
    },
  },
  invite: {
    cs: {
      subject: "Pozvánka do spolujizda.online",
      heading: "Byli jste pozváni!",
      body: "Někdo vás pozval k používání spolujizda.online — bezplatné platformy pro sdílení jízd. Klikněte na tlačítko níže pro vytvoření účtu.",
      button: "Přijmout pozvánku",
      footer: "Pokud jste pozvánku nečekali, můžete tento e-mail ignorovat.",
    },
    sk: {
      subject: "Pozvánka do spolujizda.online",
      heading: "Boli ste pozvaní!",
      body: "Niekto vás pozval na používanie spolujizda.online — bezplatnej platformy pre zdieľanie jázd. Kliknite na tlačidlo nižšie pre vytvorenie účtu.",
      button: "Prijať pozvánku",
      footer:
        "Ak ste pozvánku nečakali, môžete tento e-mail ignorovať.",
    },
    en: {
      subject: "You're invited to spolujizda.online",
      heading: "You've been invited!",
      body: "Someone invited you to use spolujizda.online — a free ride-sharing platform. Click the button below to create your account.",
      button: "Accept invitation",
      footer:
        "If you weren't expecting this invitation, you can safely ignore this email.",
    },
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getEmailTemplate(
  actionType: string,
  locale: string,
  confirmationUrl: string,
): EmailTemplate {
  const validAction = (
    Object.keys(templates).includes(actionType) ? actionType : "signup"
  ) as EmailActionType;
  const validLocale = (
    ["cs", "sk", "en"].includes(locale) ? locale : "cs"
  ) as Locale;

  const t = templates[validAction][validLocale];

  const content = `
    <h2 style="margin:0 0 16px;color:#333;font-size:20px;font-weight:700;">${escapeHtml(t.heading)}</h2>
    <p style="margin:0 0 8px;color:#555;font-size:15px;line-height:1.6;">${escapeHtml(t.body)}</p>
    ${ctaButton(confirmationUrl, t.button)}
    <p style="margin:16px 0 0;color:#999;font-size:13px;line-height:1.5;">${escapeHtml(t.footer)}</p>`;

  return {
    subject: t.subject,
    html: wrapEmail(content, validLocale),
  };
}
