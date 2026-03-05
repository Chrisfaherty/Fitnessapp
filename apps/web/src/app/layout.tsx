import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "FitnessCoach", template: "%s | FitnessCoach" },
  description: "All-in-one fitness coaching platform",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7FA" },
    { media: "(prefers-color-scheme: dark)",  color: "#0B0C10" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast: "bg-surface border border-border text-foreground rounded-xl shadow-lg",
                error: "border-danger/30 bg-danger-muted",
                success: "border-success/30 bg-success-muted",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
