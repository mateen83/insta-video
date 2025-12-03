import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

// <CHANGE> Updated metadata for Instagram & Facebook Video Downloader
export const metadata: Metadata = {
  title: "Instagram & Facebook Video Downloader - Download Reels & Videos",
  description:
    "Download Instagram and Facebook videos, reels, and IGTV content for free. Fast, secure, and easy to use.",
  generator: "Social video downloader",
  icons: {
    icon: "/fav-icon.png",
  },
}


export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
