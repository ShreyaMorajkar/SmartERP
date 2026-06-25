import type { Metadata } from "next";
import { AppProvider } from "../context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartERP - Billing, Inventory & Accounting Management",
  description: "Keyboard-driven Tally-inspired Cloud Accounting and Billing Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#090d16] text-[#f8fafc]">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
