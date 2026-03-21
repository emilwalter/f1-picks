import type { Metadata } from "next";
import { Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/lib/convex";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Attribution } from "@/components/layout/attribution";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "F1 Picks",
  description: "Make predictions and compete with friends on Formula 1 races",
};

// Prevent static prerendering of auth-dependent pages (fixes CI when secrets
// aren't available for fork PRs; production deployment has env vars set)
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || "";

  // When key is missing (e.g. CI from fork PR where secrets aren't passed),
  // render minimal layout so build succeeds. Production always has the key.
  if (!publishableKey) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex min-h-screen flex-col items-center justify-center bg-paddock-bg font-sans">
              <p className="text-paddock-on-muted">Loading...</p>
            </div>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider publishableKey={publishableKey}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ConvexClientProvider>
              <div className="flex min-h-screen flex-col bg-paddock-bg font-sans">
                <AppHeader />
                <main className="flex-1 dark:telemetry-grid">{children}</main>
                <Attribution />
              </div>
              <Toaster />
            </ConvexClientProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
