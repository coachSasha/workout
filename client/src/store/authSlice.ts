import { createSlice } from '@reduxjs/toolkit';
import { api } from '../api/baseApi';

interface AuthState {
  isAuthenticated: boolean;
  checked: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  checked: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setChecked(state, action: { payload: boolean }) {
      state.checked = action.payload;
    },
    logoutLocal(state) {
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(api.endpoints.getMe.matchFulfilled, (state) => {
        state.isAuthenticated = true;
        state.checked = true;
      })
      .addMatcher(api.endpoints.getMe.matchRejected, (state) => {
        state.isAuthenticated = false;
        state.checked = true;
      })
      .addMatcher(api.endpoints.login.matchFulfilled, (state) => {
        state.isAuthenticated = true;
        state.checked = true;
      })
      .addMatcher(api.endpoints.logout.matchFulfilled, (state) => {
        state.isAuthenticated = false;
      });
  },
});

export const { setChecked, logoutLocal } = authSlice.actions;
export default authSlice.reducer;
