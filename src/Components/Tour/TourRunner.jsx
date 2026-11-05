import Joyride, { ACTIONS, STATUS } from "react-joyride";
import TourTooltip from "@/Components/Tour/TourTooltip";

// The running tour. Apart from PortalTour so the tour library loads only when a
// tour starts.
export default function TourRunner({ steps, onStop }) {
  return <Joyride run continuous showSkipButton scrollToFirstStep disableOverlayClose spotlightPadding={6} scrollOffset={120} steps={steps} tooltipComponent={TourTooltip}
    callback={({ status, action }) => { if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || action === ACTIONS.CLOSE) onStop(); }}
    styles={{ options: { zIndex: 10000, overlayColor: 'rgba(15,23,42,0.55)', arrowColor: 'rgb(var(--color-surface))' }, spotlight: { borderRadius: 12 } }} />;
}
