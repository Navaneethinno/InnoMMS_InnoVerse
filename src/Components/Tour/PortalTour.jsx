import { Outlet } from "react-router-dom";
import Joyride, { ACTIONS, STATUS } from "react-joyride";
import { usePortalTour } from "@/Hooks/Tour/usePortalTour";
import { TourContext } from "@/Components/Tour/TourContext";
import TourButton from "@/Components/Tour/TourButton";
import TourTooltip from "@/Components/Tour/TourTooltip";

export default function PortalTour() {
  const { tour, start, stop, pathname, slug, signedInPage } = usePortalTour();
  return <TourContext.Provider value={{ start, running: Boolean(tour && tour.path === pathname) }}>
    <Outlet />
    {!signedInPage && slug !== 'signup' && <TourButton floating />}
    {tour?.path === pathname && <Joyride key={tour.id} run continuous showSkipButton scrollToFirstStep disableOverlayClose spotlightPadding={6} scrollOffset={120} steps={tour.steps} tooltipComponent={TourTooltip}
      callback={({ status, action }) => { if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || action === ACTIONS.CLOSE) stop(); }}
      styles={{ options: { zIndex: 10000, overlayColor: 'rgba(15,23,42,0.55)', arrowColor: 'rgb(var(--color-surface))' }, spotlight: { borderRadius: 12 } }} />}
  </TourContext.Provider>;
}
