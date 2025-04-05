import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import DbProvider from "@/components/providers/DbProvider";
import { Suspense } from "react";
import LayoutWrapper from "@/components/providers/LayoutWrapper";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "SplitSphere",
  description: "Expense splitting made easy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider defaultTheme="light" storageKey="splitsphere-theme">
          <DbProvider>
            <LayoutWrapper>
              <Suspense fallback={<div>Loading...</div>}>
                {children}
              </Suspense>
            </LayoutWrapper>
          </DbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
