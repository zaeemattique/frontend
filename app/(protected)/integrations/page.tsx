/**
 * Integrations Page
 */

'use client';

import { useEffect } from 'react';

export default function IntegrationsPage() {
  useEffect(() => {
    document.title = 'Integrations - SOW Generator';
    return () => {
      document.title = 'SOW Generator';
    };
  }, []);

  return (
    <div>
      <h1 className="text-3xl text-gray-900" style={{ marginBottom: '2rem' }}>
        Integrations
      </h1>

      <div className="card">
        <h3 className="text-lg text-gray-900" style={{ marginBottom: '1rem' }}>
          🔌 Connected Services
        </h3>
        <p className="text-gray-600">
          Manage third-party integrations and connected services for the SOW Generator platform.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* HubSpot Integration */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🔗</div>
            <div style={{ flex: 1 }}>
              <h3 className="text-lg text-gray-900" style={{ marginBottom: '0.5rem' }}>
                HubSpot CRM
              </h3>
              <p className="text-gray-600" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                Sync deals, companies, and contacts from HubSpot CRM
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981'
                }} />
                <span className="text-gray-600" style={{ fontSize: '0.875rem' }}>Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Avoma Integration */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🎤</div>
            <div style={{ flex: 1 }}>
              <h3 className="text-lg text-gray-900" style={{ marginBottom: '0.5rem' }}>
                Avoma
              </h3>
              <p className="text-gray-600" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                Import meeting transcripts and notes for context-aware SOW generation
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981'
                }} />
                <span className="text-gray-600" style={{ fontSize: '0.875rem' }}>Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* AWS Bedrock */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🤖</div>
            <div style={{ flex: 1 }}>
              <h3 className="text-lg text-gray-900" style={{ marginBottom: '0.5rem' }}>
                AWS Bedrock
              </h3>
              <p className="text-gray-600" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                AI-powered document generation using Claude Sonnet on AWS Bedrock
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981'
                }} />
                <span className="text-gray-600" style={{ fontSize: '0.875rem' }}>Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* AWS S3 */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>☁️</div>
            <div style={{ flex: 1 }}>
              <h3 className="text-lg text-gray-900" style={{ marginBottom: '0.5rem' }}>
                AWS S3
              </h3>
              <p className="text-gray-600" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                Secure file storage for uploaded documents and generated SOWs
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981'
                }} />
                <span className="text-gray-600" style={{ fontSize: '0.875rem' }}>Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem', backgroundColor: '#fef3c7', borderColor: '#fbbf24' }}>
        <h3 className="text-lg text-gray-900" style={{ marginBottom: '0.5rem' }}>
          ⚙️ Configuration
        </h3>
        <p className="text-gray-600" style={{ fontSize: '0.875rem' }}>
          Integration settings are managed through environment variables and AWS infrastructure. Contact your administrator to modify integration configurations.
        </p>
      </div>
    </div>
  );
}
