/**
 * Generate SOW Page
 *
 * Server component wrapper that renders the client component.
 * AWS Amplify handles dynamic routes natively - no generateStaticParams needed.
 */

import GenerateSOWClient from './GenerateSOWClient';

export default function GenerateSOWPage() {
  return <GenerateSOWClient />;
}
