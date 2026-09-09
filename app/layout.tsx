import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  ),
  title: "RhythmReview Requirements Workspace",
  description:
    "A fictional Blue Bridge demonstration of human-reviewed AI requirement drafting.",
  openGraph: {
    title: "RhythmReview Requirements Workspace",
    description:
      "From discovery evidence to an immutable, human-approved requirements baseline.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "RhythmReview Requirements Workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RhythmReview Requirements Workspace",
    description:
      "From discovery evidence to an immutable, human-approved requirements baseline.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
