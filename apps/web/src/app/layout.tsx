import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "FitnessCoach", template: "%s | FitnessCoach" },
  description: "All-in-one fitness coaching platform",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7FA" },
    { media: "(prefers-color-scheme: dark)",  color: "#0D0E14" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
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
