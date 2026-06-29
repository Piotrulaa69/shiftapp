import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

const GTM_ID = 'GTM-MW74QC2H';

const gtmHeadScript = `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
`.trim();

const gclidInitScript = `
(function(){
  try {
    var p = new URLSearchParams(window.location.search);
    var g = p.get('gclid');
    if (g) {
      var e = new Date();
      e.setDate(e.getDate() + 90);
      document.cookie = 'gclid=' + encodeURIComponent(g) + ';domain=.shiftapp.pl;path=/;expires=' + e.toUTCString() + ';SameSite=Lax';
    }
  } catch(ex) {}
})();
`.trim();

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
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: gtmHeadScript }} />
        {/* GCLID cookie init */}
        <script dangerouslySetInnerHTML={{ __html: gclidInitScript }} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: webStyles }} />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
        {children}
      </body>
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
