/**
 * Document Template Detail Page
 *
 * Server component wrapper that renders the client component.
 * AWS Amplify handles dynamic routes natively - no generateStaticParams needed.
 */

import DocumentTemplateClient from './DocumentTemplateClient';

export default function DocumentTemplateDetailPage() {
  return <DocumentTemplateClient />;
}
