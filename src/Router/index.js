// Routes grouped by sidebar module, like payseFrontend's Router: one list per
// module, each built from the route files in that module's folder
// (Router/<Module>/<menu>Routes.jsx). Add a module = add a folder + one
// export here + one spread in Router.jsx.
import { categoryRoutes } from "./Example/categoryRoutes";

export { publicRoutes } from "./publicRoutes";
export { dashboardRoutes } from "./dashboardRoutes";

// Example module (sample) — replace with this project's real modules.
export const exampleRoutes = [...categoryRoutes];
