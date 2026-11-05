import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { usePortalTour } from "@/Hooks/Tour/usePortalTour";
import { TourContext } from "@/Components/Tour/TourContext";
import TourButton from "@/Components/Tour/TourButton";

const TourRunner = lazy(() => import("@/Components/Tour/TourRunner"));

export default function PortalTour() {
  const { tour, start, stop, pathname, slug, signedInPage } = usePortalTour();
  return <TourContext.Provider value={{ start, running: Boolean(tour && tour.path === pathname) }}>
    <Outlet />
    {!signedInPage && slug !== 'signup' && <TourButton floating />}
    {tour?.path === pathname && <Suspense fallback={null}><TourRunner key={tour.id} steps={tour.steps} onStop={stop} /></Suspense>}
  </TourContext.Provider>;
}
