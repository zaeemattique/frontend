/**
 * AWS Amplify Configuration
 *
 * Configures AWS Amplify for Cognito authentication.
 * MUST be called on client-side only (browser environment).
 *
 * Best Practice: Call this in a client component that wraps your app
 */

import { Amplify } from 'aws-amplify';

/**
 * Check if we're in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

// Track if Amplify has been configured to make this function idempotent
let isConfigured = false;

/**
 * Configure AWS Amplify with Cognito settings
 * This should be called once when the app initializes on the client-side
 * Safe to call multiple times - will only configure once
 */
export function configureAmplify(): void {
  // Only configure on client-side
  if (!isBrowser) {
    console.warn('[Amplify] Skipping configuration - not in browser environment');
    return;
  }

  // If already configured, skip
  if (isConfigured) {
    console.log('[Amplify] Already configured, skipping');
    return;
  }

  // Validate required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_AWS_REGION',
    'NEXT_PUBLIC_COGNITO_USER_POOL_ID',
    'NEXT_PUBLIC_COGNITO_CLIENT_ID',
    'NEXT_PUBLIC_COGNITO_DOMAIN',
  ];

  // Debug: Log all available NEXT_PUBLIC_* variables
  // Note: In Next.js with output: 'export', env vars are replaced at build time
  // In dev mode, they should still be available from .env.local
  const availableEnvVars = Object.keys(process.env).filter(key => 
    key.startsWith('NEXT_PUBLIC_')
  );


  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName] || process.env[varName] === ''
  );

  if (missingVars.length > 0 && false) {
    console.error(
      '[Amplify] Missing required environment variables:',
      missingVars
    );
    console.error(
      '[Amplify] Debug info:',
      {
        availableVars: availableEnvVars,
        missingVars,
        nodeEnv: process.env.NODE_ENV,
        // Log the actual values (without exposing secrets)
        values: requiredEnvVars.reduce((acc, key) => {
          acc[key] = process.env[key] ? '***SET***' : '***MISSING***';
          return acc;
        }, {} as Record<string, string>)
      }
    );
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      `Make sure .env.local exists and contains these variables. ` +
      `Restart the dev server after creating/updating .env.local.`
    );
  }

  const region = process.env.NEXT_PUBLIC_AWS_REGION!;
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

  try {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId: clientId,
          loginWith: {
            oauth: {
              domain: `${domain}.auth.${region}.amazoncognito.com`,
              scopes: ['openid', 'email', 'profile'],
              redirectSignIn: [appUrl],
              redirectSignOut: [appUrl],
              responseType: 'code',
            },
          },
          // Optional: Set password policy for client-side validation
          passwordFormat: {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireNumbers: true,
            requireSpecialCharacters: true,
          },
        },
      },
    }, {
      // Amplify v6 configuration options
      ssr: false, // Disable SSR mode (we're using static export)
    });

    console.log('[Amplify] Configuration successful');
    isConfigured = true;
  } catch (error) {
    console.error('[Amplify] Configuration error:', error);
    isConfigured = false; // Reset on error so it can be retried
    throw error;
  }
}

/**
 * Check if Amplify has been configured
 */
export function isAmplifyConfigured(): boolean {
  return isConfigured;
}

/**
 * Get Cognito configuration values
 * Useful for debugging or displaying in UI
 */
export function getAmplifyConfig() {
  return {
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  };
}
