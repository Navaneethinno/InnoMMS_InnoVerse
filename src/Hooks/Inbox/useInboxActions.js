import { listNotifications, markNotificationsRead } from "@/Services/Inbox/inbox.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { listNotifications, markNotificationsRead };
export const useInboxActions = () => actions;
