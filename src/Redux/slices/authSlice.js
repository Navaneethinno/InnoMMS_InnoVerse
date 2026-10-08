import { createSlice } from "@reduxjs/toolkit";
import { hasSession, readAuthUser } from "@/Services/api/authStorage";
const authSlice = createSlice({
  name: "auth",
  initialState: {
    authenticated: hasSession(),
    user: readAuthUser(),
  },
  reducers: {
    sessionEstablished(state, action) {
      state.authenticated = true;
      state.user = action.payload;
    },
    // PIN status etc. changed (me, PIN reset): keep the rest.
    userUpdated(state, action) {
      state.user = { ...state.user, ...action.payload };
    },
    sessionCleared(state) {
      state.authenticated = false;
      state.user = null;
    },
  },
});
export const { sessionEstablished, userUpdated, sessionCleared } = authSlice.actions;
export default authSlice.reducer;
