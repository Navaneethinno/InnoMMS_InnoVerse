import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TOUR_PAGE_ROUTES, PUBLIC_TOUR_ROUTES } from "@/Utils/Config/tourConfig";

const visible = el => Boolean(el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';

// One engine discovers the controls rendered by every page. It never clicks
// service options or submits a form, so a walkthrough preserves entered data.
export function usePortalTour() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const [tour, setTour] = useState(null);
  useEffect(() => setTour(null), [pathname, i18n.language]);
  const slug = pathname.replace(/^\/+|\/+$/g, '');
  const signedInPage = TOUR_PAGE_ROUTES.includes(slug) && !PUBLIC_TOUR_ROUTES.includes(slug);
  const start = () => {
    const root = document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('main') || document.body;
    const heading = [...root.querySelectorAll('h1,h2')].find(visible);
    const options = [...root.querySelectorAll('[data-tour="mode-option"]')].filter(visible);
    const selected = options.find(option => option.getAttribute('aria-checked') === 'true');
    const steps = [{ target: options.length ? options[0].parentElement : heading || 'body', placement: options.length || heading ? 'bottom' : 'center', title: options.length ? t('portalTour.chooseService') : heading?.textContent?.trim() || t('portalTour.page'), content: options.length ? t('portalTour.chooseServiceBody') : t(`portalTour.page.${slug}`, { defaultValue: t('portalTour.intro') }) }];
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
  return { tour, start, stop: () => setTour(null), pathname, slug, signedInPage };
}
