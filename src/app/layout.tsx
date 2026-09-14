import type { Metadata } from "next";
import { Syne } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Texas Accelerate - Apply",
  description: "Apply to Texas Accelerate. Connect with real work at Austin startups, nonprofits, and campaigns.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${syne.variable} antialiased`}>
      <body className="bg-bg text-white">
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
