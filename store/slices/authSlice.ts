import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

/**
 * User type definition
 */
export interface User {
  username?: string;
  email: string;
  groups?: string[];
  [key: string]: unknown; // Allow additional properties
}

/**
 * Auth state interface
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authChallenge: string | null;
}

/**
 * Initial state
 */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  authChallenge: null,
};

/**
 * Auth Slice (Best Practices)
 *
 * Features:
 * 1. Type-safe actions and reducers
 * 2. Immutable state updates via Immer
 * 3. Memoized selectors
 * 4. Clean action creators
 *
 * Replaces Zustand auth store with Redux Toolkit
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
    },
    setIsAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setAuthChallenge: (state, action: PayloadAction<string | null>) => {
      state.authChallenge = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.authChallenge = null;
    },
  },
});

// Action creators
export const { setUser, setIsAuthenticated, setAuthChallenge, logout } =
  authSlice.actions;

/**
 * Selectors (Memoized by default)
 * Use these instead of accessing state.auth directly
 */
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectAuthChallenge = (state: RootState) =>
  state.auth.authChallenge;
export const selectUserGroups = (state: RootState) =>
  state.auth.user?.groups ?? [];
export const selectUsername = (state: RootState) =>
  state.auth.user?.username ?? '';
export const selectUserEmail = (state: RootState) =>
  state.auth.user?.email ?? '';

// Reducer export
export default authSlice.reducer;
