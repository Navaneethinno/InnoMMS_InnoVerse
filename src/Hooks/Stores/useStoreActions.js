import { loadStores, saveStore, closeStore, reopenStore, loadStoreUsers, saveStoreUser, setStoreUserPin } from "@/Services/Store/store.api";
import { loadTxnTypes, loadPosProfiles, savePosProfile, setPosProfileActive, deletePosProfile, loadPosShifts, savePosShift, setPosShiftActive, deletePosShift } from "@/Services/Pos/pos.api";
import { loadTerminals, setupTerminal, requestTerminalBlock, loadTerminalSettings, saveTerminalSettings } from "@/Services/Terminal/terminal.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { loadStores, saveStore, closeStore, reopenStore, loadStoreUsers, saveStoreUser, setStoreUserPin, loadTxnTypes, loadPosProfiles, savePosProfile, setPosProfileActive, deletePosProfile, loadPosShifts, savePosShift, setPosShiftActive, deletePosShift, loadTerminals, setupTerminal, requestTerminalBlock, loadTerminalSettings, saveTerminalSettings };
export const useStoreActions = () => actions;
