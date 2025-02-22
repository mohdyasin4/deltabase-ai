import Provider from "@/app/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import AuthWrapper from "@/components/wrapper/auth-wrapper";
import { Analytics } from "@vercel/analytics/react";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

export const metadata: Metadata = {
  metadataBase: new URL("https://deltabase.vercel.app"),
  title: {
    default:
      "Deltabase - AI-Powered Business Intelligence & Data Visualization",
    template: `%s | Deltabase`,
  },
  description:
    "Deltabase: The AI-Powered Business Intelligence and Data Visualization Tool for seamless insights and analysis.",
  openGraph: {
    description:
      "Deltabase: The AI-Powered Business Intelligence and Data Visualization Tool for seamless insights and analysis.",
    images: ["https://yourdomain.com/path-to-image.png"],
    url: "https://deltabase.vercel.app/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deltabase - AI-Powered Business Intelligence & Data Visualization",
    description:
      "Deltabase: The AI-Powered Business Intelligence and Data Visualization Tool for seamless insights and analysis.",
    siteId: "",
    creator: "@https://x.com/MohdYasin04",
    creatorId: "",
    images: ["https://yourdomain.com/path-to-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthWrapper>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link
            rel="preload"
            href="https://utfs.io/f/31dba2ff-6c3b-4927-99cd-b928eaa54d5f-5w20ij.png"
            as="image"
          />
          <link
            href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-
awesome.min.css"
            rel="stylesheet"
            integrity="sha384-
wvfXpqpZZVQGK6TAh5PVlGOfQNHSoD2xbE+QkPxCAFlNEevoEH3Sl0sibVcOQVnN"
          />
          <link
            rel="preload"
            href="https://utfs.io/f/69a12ab1-4d57-4913-90f9-38c6aca6c373-1txg2.png"
            as="image"
          />
        </head>
        <body className={GeistSans.className}>
          <NextTopLoader height={3} color="#ffbe19" showSpinner={false} />
          <Provider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </Provider>
          <Analytics />
        </body>
      </html>
    </AuthWrapper>
  );
}
