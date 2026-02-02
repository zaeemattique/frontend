/**
 * Deal Detail Page
 *
 * Server component wrapper that renders the client component.
 * AWS Amplify handles dynamic routes natively - no generateStaticParams needed.
 */

import DealDetailClient from './DealDetailClient';

export default function DealDetailPage() {
  return <DealDetailClient />;
}
