import * as React from 'react';

const BASE_URL = 'https://waitlist.zenko.gg';

export function WelcomeEmail() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0a' }}>
        <div
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            backgroundColor: '#0a0a0a',
            color: '#ffffff',
            padding: '40px 20px',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img
              src={`${BASE_URL}/images/zenko-logo.png`}
              alt="Zenko"
              width="64"
              height="77"
              style={{ marginBottom: '16px' }}
            />
            <h1
              style={{
                fontSize: '28px',
                fontWeight: '600',
                margin: '0',
                color: '#cbbaee',
              }}
            >
              Welcome to <span style={{ color: '#fdb022' }}>Zenko</span>
            </h1>
          </div>

          {/* Main Content */}
          <div
            style={{
              backgroundColor: '#101828',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '16px', lineHeight: '1.6', margin: '0' }}>
              You're on the waitlist! We'll let you know when early access opens.
            </p>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <div style={{ marginBottom: '16px' }}>
              <a
                href="https://www.instagram.com/zenkogg?igsh=YzdqYTc0N2ZuMzNx&utm_source=qr"
                style={{
                  display: 'inline-block',
                  marginRight: '16px',
                  verticalAlign: 'middle',
                }}
              >
                <img
                  src={`${BASE_URL}/images/icons/instagram.png`}
                  alt="Instagram"
                  width="24"
                  height="24"
                />
              </a>
              <a
                href="https://x.com/zenkogginc?s=21&t=aZd4S6kCPZBx-rpP3YEdAg"
                style={{ display: 'inline-block', verticalAlign: 'middle' }}
              >
                <img
                  src={`${BASE_URL}/images/icons/X.png`}
                  alt="X"
                  width="24"
                  height="24"
                />
              </a>
            </div>
            <p
              style={{
                fontSize: '12px',
                color: '#4b5563',
                margin: '0',
              }}
            >
              © 2026 Zenko. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
