import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>ShiftApp</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: webStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const webStyles = `
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
    background-color: #1E293B;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Pointer cursor on all interactive elements */
  button, [role="button"], a {
    cursor: pointer;
  }

  /* Hide scrollbars but keep scroll functionality */
  ::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }

  /* Text selection color */
  ::selection {
    background: rgba(74, 124, 247, 0.2);
    color: #0F172A;
  }

  /* Prevent blue tap highlight on mobile */
  * {
    -webkit-tap-highlight-color: transparent;
  }

  /* Smooth scrolling */
  * {
    scroll-behavior: smooth;
  }
`;
