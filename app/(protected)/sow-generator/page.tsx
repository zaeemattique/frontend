/**
 * SOW Generator Page
 */

'use client';

import { useEffect } from 'react';

export default function SOWGeneratorPage() {
  useEffect(() => {
    document.title = 'SOW Generator - SOW Generator';
    return () => {
      document.title = 'SOW Generator';
    };
  }, []);

  return (
    <div>
      <h1 className="text-3xl text-gray-900" style={{ marginBottom: '2rem' }}>
        SOW Generator
      </h1>

      <div className="card">
        <h3 className="text-lg text-gray-900" style={{ marginBottom: '1rem' }}>
          📄 AI-Powered Statement of Work Generator
        </h3>
        <p className="text-gray-600" style={{ marginBottom: '1rem' }}>
          Generate comprehensive Statements of Work using AI-powered analysis of your deals and requirements.
        </p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', color: '#6B7280' }}>
          <li>Automated SOW creation from deal information</li>
          <li>Architecture diagram generation</li>
          <li>Pricing calculator integration</li>
          <li>Template customization</li>
        </ul>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="text-lg text-gray-900" style={{ marginBottom: '1rem' }}>
          How It Works
        </h3>
        <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li>Navigate to a deal from the Deals page</li>
          <li>Upload scoping documents and requirements</li>
          <li>Select or assign a SOW template</li>
          <li>Click &quot;Generate SOW&quot; to start AI-powered generation</li>
          <li>Review and download generated documents</li>
        </ol>
      </div>
    </div>
  );
}
