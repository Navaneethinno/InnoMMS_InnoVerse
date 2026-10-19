import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Joyride, { ACTIONS, STATUS } from 'react-joyride';
import { Compass, X } from 'lucide-react';

const Context = createContext(null);
const pages = {
  dashboard: 'Review your wallets, recent activity and shortcuts to merchant services.',
  send: 'Choose a recipient and wallet, enter an amount, then review the details before authorizing a payment.',
  history: 'Filter transactions by wallet, type or date. Open a transaction to inspect its receipt and available actions.',
  cards: 'Review your cards and the management options available for your account.',
  statements: 'Choose a wallet and date range to view or download an account statement.',
  notifications: 'Read account updates and payment notifications. Open a message for its details.',
  profile: 'Review your personal and business information and use the available edit controls to keep it up to date.',
  verification: 'Review your verification status and provide the information required for an account upgrade.',
  security: 'Manage your sign-in and transaction security using the options available for your account.',
  agent: 'Choose a cash service and enter the customer details. Review the information before authorizing a transaction.',
  signups: 'Track customer registrations and start a new assisted signup.',
  'signups/new': 'Work through the customer registration sections and check the required details before submitting.',
  'my-agents': 'Review agents linked to your account and use the available controls to manage them.',
  stores: 'Review your merchant locations and use the available controls to add or manage a store.',
  'mobile-money': 'Choose a mobile money service and recipient, enter an amount and review the payment details.',
  'bank-transfer': 'Choose the bank and beneficiary, enter an amount and check the details before authorizing the transfer.',
  airtime: 'Select a provider, enter the mobile number and amount, then review the purchase.',
  electricity: 'Choose a provider and enter the meter details to review and pay for electricity.',
  bills: 'Choose a biller and enter the requested customer reference to review your payment.',
  'my-code': 'Let customers use your payment code to pay you. Check the merchant details before sharing it.',
  terminals: 'Review payment terminals linked to your merchant account and their available management options.',
  login: 'Choose your sign-in method and enter your credentials to access your merchant account.',
  activate: 'Follow the activation instructions and enter the requested details to set up portal access.',
  'forgot-password': 'Enter your account details and follow the verification steps to reset your password.',
  'forgot-pin': 'Enter your account details and follow the verification steps to recover access.',
  terms: 'Read the terms that apply to your merchant account and portal services.',
  privacy: 'Read how your personal information is handled and protected.',
};
const publicPages = ['login', 'activate', 'forgot-password', 'forgot-pin', 'terms', 'privacy'];
const visible = el => Boolean(el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';

function Tooltip({ index, size, step, isLastStep, backProps, primaryProps, skipProps, closeProps, tooltipProps }) {
  const { t } = useTranslation();
  return <div {...tooltipProps} className="w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-ink/15 bg-surface p-5 text-ink shadow-2xl">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-forest dark:text-lime">{t('portalTour.step', { step: index + 1, total: size })}</p>
      <button {...closeProps} aria-label={t('onboarding.tour.close')} className="rounded-lg p-1 hover:bg-ink/5"><X size={16} /></button>
    </div>
    <h3 className="mt-2 text-base font-bold">{step.title}</h3>
    <div className="mt-2 text-sm leading-relaxed text-slate-500">{step.content}</div>
    <div className="mt-4 flex flex-wrap justify-center gap-1" aria-hidden="true">{Array.from({ length: size }, (_, i) => <span key={i} className={`h-1.5 rounded-full ${i === index ? 'w-4 bg-forest dark:bg-lime' : 'w-1.5 bg-ink/15'}`} />)}</div>
    <div className="mt-4 flex items-center gap-2">
      {!isLastStep && <button {...skipProps} className="text-xs font-semibold text-slate-500">{t('onboarding.tour.skip')}</button>}
      <div className="ml-auto flex gap-2">
        {index > 0 && <button {...backProps} className="rounded-xl border border-ink/15 px-3 py-2 text-xs font-bold">{t('onboarding.tour.back')}</button>}
        <button {...primaryProps} className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white dark:bg-lime dark:text-on-secondary">{t(isLastStep ? 'onboarding.tour.last' : 'onboarding.tour.next')}</button>
      </div>
    </div>
  </div>;
}

export function TourButton({ floating = false }) {
  const tour = useContext(Context);
  const { t } = useTranslation();
  if (!tour) return null;
  return <button type="button" onClick={tour.start} disabled={tour.running} aria-label={t('signup.takeTour')} title={t('signup.takeTour')}
    className={`${floating ? 'fixed bottom-5 right-5 z-40 shadow-lg' : ''} flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-forest px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-lime dark:text-on-secondary`}>
    <Compass size={15} /><span className={floating ? '' : 'hidden md:inline'}>{t('signup.takeTour')}</span>
  </button>;
}

export default function PortalTour() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const [tour, setTour] = useState(null);
  useEffect(() => setTour(null), [pathname, i18n.language]);
  const slug = pathname.replace(/^\/+|\/+$/g, '');
  const signedInPage = Boolean(pages[slug]) && !publicPages.includes(slug);
  const start = () => {
    const root = document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('main') || document.body;
    const heading = [...root.querySelectorAll('h1,h2')].find(visible);
    const options = [...root.querySelectorAll('[data-tour="mode-option"]')].filter(visible);
    const selected = options.find(option => option.getAttribute('aria-checked') === 'true');
    const steps = [{ target: options.length ? options[0].parentElement : heading || 'body', placement: options.length || heading ? 'bottom' : 'center', title: options.length ? t('portalTour.chooseService') : heading?.textContent?.trim() || t('portalTour.page'), content: options.length ? t('portalTour.chooseServiceBody') : t(`portalTour.page.${slug}`, { defaultValue: pages[slug] || t('portalTour.intro') }) }];
    options.forEach(option => steps.push({ target: option, title: option.dataset.tourTitle, content: option.dataset.tourDescription || t('portalTour.viewsBody') }));
    if (selected) steps.push({ target: root.querySelector('form') || selected, title: t('portalTour.selected', { service: selected.dataset.tourTitle }), content: t('portalTour.selectedBody', { service: selected.dataset.tourTitle }) });
    const mode = selected?.dataset.tourMode;
    // Describe labels only. Never read entered credentials, values or balances.
    const targets = new Set();
    [...root.querySelectorAll('input:not([type="hidden"]),select,textarea,[role="combobox"]')].filter(visible).forEach(control => {
      const label = control.labels?.[0] || control.closest('label');
      const phone = control.closest('[data-tour="phone-field"]');
      const name = phone?.dataset.tourLabel || control.getAttribute('aria-label') || label?.textContent?.trim().replace(/\s+/g, ' ');
      const target = phone || control.closest('[data-tour="field"]') || control;
      if (!name || targets.has(target) || steps.length >= 12) return;
      targets.add(target);
      const fieldName = phone ? 'phone' : control.name;
      const agentField = slug === 'agent' && selected && ['phone', 'amount', 'note'].includes(fieldName) ? fieldName : null;
      steps.push({ target, title: name, content: agentField ? t(`portalTour.agent.${agentField}.${mode || 'cashIn'}`, { defaultValue: t('portalTour.field', { field: name }) }) : t('portalTour.field', { field: name }) });
    });
    const table = [...root.querySelectorAll('table,[role="table"]')].find(visible);
    if (table) steps.push({ target: table, title: t('portalTour.results'), content: t('portalTour.resultsBody') });
    const tabs = [...root.querySelectorAll('[role="tablist"]')].find(visible);
    if (tabs) steps.push({ target: tabs, title: t('portalTour.views'), content: t('portalTour.viewsBody') });
    const submit = [...root.querySelectorAll('button[type="submit"]')].find(visible);
    const wallet = root.querySelector('[data-tour="agent-wallet"]');
    if (wallet && visible(wallet)) steps.push({ target: wallet, title: t('wallet.purpose.AGENT_FLOAT'), content: t('agent.floatHint') });
    if (submit) steps.push({ target: submit, title: submit.textContent?.trim(), content: slug === 'agent' && selected ? t(`portalTour.agent.review.${mode}`) : t('portalTour.submit') });
    setTour({ path: pathname, id: Date.now(), steps: steps.map(step => ({ ...step, disableBeacon: true })) });
  };
  return <Context.Provider value={{ start, running: Boolean(tour && tour.path === pathname) }}>
    <Outlet />
    {!signedInPage && slug !== 'signup' && <TourButton floating />}
    {tour?.path === pathname && <Joyride key={tour.id} run continuous showSkipButton scrollToFirstStep disableOverlayClose spotlightPadding={6} scrollOffset={120} steps={tour.steps} tooltipComponent={Tooltip}
      callback={({ status, action }) => { if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || action === ACTIONS.CLOSE) setTour(null); }}
      styles={{ options: { zIndex: 10000, overlayColor: 'rgba(15,23,42,0.55)', arrowColor: 'rgb(var(--color-surface))' }, spotlight: { borderRadius: 12 } }} />}
  </Context.Provider>;
}
