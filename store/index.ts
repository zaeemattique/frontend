import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { api } from './services/api';
import authReducer from './slices/authSlice';

/**
 * Redux Store Configuration with Best Practices
 *
 * Features:
 * 1. RTK Query for API state management
 * 2. Redux Persist for auth state persistence
 * 3. Proper middleware configuration
 * 4. TypeScript type safety
 * 5. Per-request store instances (Next.js best practice)
 */

// Persist configuration for auth slice only
const authPersistConfig = {
  key: 'auth',
  version: 1,
  storage,
  whitelist: ['user', 'isAuthenticated'], // Only persist these fields
  blacklist: ['authChallenge'], // Don't persist challenge for security
};

// Root reducer with persisted auth
const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  auth: persistReducer(authPersistConfig, authReducer),
});

/**
 * Store factory function (Next.js best practice for SSR)
 * Creates a new store instance for each request
 */
export const makeStore = () => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types from redux-persist
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
          // Ignore these paths in the state
          ignoredPaths: ['register'],
        },
      }).concat(api.middleware),
    devTools: process.env.NODE_ENV !== 'production',
  });

  // Enable refetchOnFocus/refetchOnReconnect behaviors
  setupListeners(store.dispatch);

  return store;
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
