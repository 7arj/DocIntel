import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "DocIntel — Document Intelligence Platform",
  description: "Extract structured intelligence from unstructured documents. Entity extraction, risk flagging, and key findings powered by AI.",
  keywords: ["document analysis", "AI", "entity extraction", "intelligence", "risk assessment"],
  openGraph: {
    title: "DocIntel — Document Intelligence Platform",
    description: "AI-powered document intelligence for professionals",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(17, 32, 49, 0.95)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              color: '#E8F4FD',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
      </body>
    </html>
  );
}
