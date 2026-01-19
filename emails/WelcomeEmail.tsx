import * as React from 'react';

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
            <svg
              width="64"
              height="77"
              viewBox="0 0 64 77"
              fill="none"
              style={{ marginBottom: '16px' }}
            >
              <path d="M0 47.1949L4.85715 40.4733L7.71428 48.3393L22.1428 61.3536L25.5714 69.7913L32 72.7944V76.0839H26.1428L18.5714 61.7824L0 47.1949Z" fill="#9E77ED" />
              <path d="M16.8572 47.91L11.8572 38.042L26.2857 48.9112V50.3412H25.1429L16.8572 47.91Z" fill="#FDB022" />
              <path d="M7.85714 12.1563L32 44.3346V21.0869H21.133L3.57141 0V34.6096L7.85714 26.3147V12.1563Z" fill="#7F56D9" />
              <path d="M64 47.1949L59.1427 40.4733L56.2855 48.3393L41.8572 61.3536L38.4286 69.7913L32 72.7944V76.0839H37.8572L45.4284 61.7824L64 47.1949Z" fill="#9E77ED" />
              <path d="M47.1429 47.91L52.143 38.042L37.7142 48.9112V50.3412H38.8571L47.1429 47.91Z" fill="#FDB022" />
              <path d="M56.1428 12.1563L32 44.3346V21.0869H42.8668L60.4285 0V34.6096L56.1428 26.3147V12.1563Z" fill="#7F56D9" />
            </svg>
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
                href="https://instagram.com/zenkogg"
                style={{
                  display: 'inline-block',
                  marginRight: '16px',
                  verticalAlign: 'middle',
                }}
              >
                <svg width="24" height="24" fill="#7F56D9" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://x.com/zenkogg"
                style={{ display: 'inline-block', verticalAlign: 'middle' }}
              >
                <svg width="24" height="24" fill="#7F56D9" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
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
