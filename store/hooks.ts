import { useDispatch, useSelector, useStore } from 'react-redux';
import type { RootState, AppDispatch, AppStore } from './index';

/**
 * Typed Redux Hooks (Best Practice)
 *
 * Use these hooks instead of plain `useDispatch` and `useSelector`
 * for full TypeScript type safety throughout the application.
 *
 * Example usage:
 * ```tsx
 * const user = useAppSelector((state) => state.auth.user);
 * const dispatch = useAppDispatch();
 * dispatch(setUser(newUser));
 * ```
 */

// Use throughout your app instead of plain `useDispatch`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

// Use throughout your app instead of plain `useSelector`
export const useAppSelector = useSelector.withTypes<RootState>();

// Use throughout your app instead of plain `useStore`
export const useAppStore = useStore.withTypes<AppStore>();
