'use client';

import { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { makeStore, AppStore } from '@/store';
import { persistStore } from 'redux-persist';
import { configureAmplify } from '@/config/amplify';

/**
 * Redux Providers Component
 *
 * Best Practices Implemented:
 * 1. Per-request store instances for SSR safety
 * 2. useRef to prevent store recreation on re-renders
 * 3. PersistGate for hydration synchronization
 * 4. Client-side only with 'use client' directive
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | undefined>(undefined);
  const persistorRef = useRef<ReturnType<typeof persistStore> | undefined>(undefined);

  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();
    persistorRef.current = persistStore(storeRef.current);
  }

  // Configure Amplify early, as soon as the component mounts
  useEffect(() => {
    try {
      configureAmplify();
    } catch (error) {
      console.error('[Providers] Failed to configure Amplify:', error);
      // Don't throw - let the app render and show error in UI
    }
  }, []);

  return (
    <Provider store={storeRef.current}>
      <PersistGate
        loading={null}
        persistor={persistorRef.current!}
      >
        {children}
      </PersistGate>
    </Provider>
  );
}
