import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const baseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL?.replace(/\/$/, "") || "";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Higgins MC" />
        <meta name="theme-color" content="#0b1416" />
        <link rel="apple-touch-icon" href={`${baseUrl}/apple-touch-icon.png`} />
        <link rel="manifest" href={`${baseUrl}/manifest.webmanifest`} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
