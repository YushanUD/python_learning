import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Python Learning",
  description: "Python learning portal for students and instructors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Navbar />
          <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
