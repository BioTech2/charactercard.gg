import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://charactercard.gg"),
  title: {
    default: "CharacterCard.gg",
    template: "%s | CharacterCard.gg"
  },
  description:
    "Create collectible World of Warcraft character cards from Mythic+, raid, Raider.IO, Blizzard, and Warcraft Logs data.",
  applicationName: "CharacterCard.gg",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "CharacterCard.gg",
    description:
      "Create collectible World of Warcraft character cards from Mythic+, raid, Raider.IO, Blizzard, and Warcraft Logs data.",
    url: "https://charactercard.gg",
    siteName: "CharacterCard.gg",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "CharacterCard.gg",
    description: "Create collectible World of Warcraft character cards from live character data."
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
