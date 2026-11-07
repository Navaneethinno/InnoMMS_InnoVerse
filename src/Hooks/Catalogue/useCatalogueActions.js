import { loadProducts, saveProduct, loadPrices, setPrice } from "@/Services/Catalogue/catalogue.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { loadProducts, saveProduct, loadPrices, setPrice };
export const useCatalogueActions = () => actions;
