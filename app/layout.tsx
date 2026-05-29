import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  metadataBase: new URL('https://ugar-duet.vercel.app'),
  title: 'Check Result - DUET',
  description: 'Check your admission result - Dhaka University of Engineering & Technology',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: 'Check Result - DUET',
    description: 'Check your admission result - Dhaka University of Engineering & Technology',
    images: [
      {
        url: '/images/website_preview.png',
        width: 1200,
        height: 630,
        alt: 'DUET Admission Result Portal',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Check Result - DUET',
    description: 'Check your admission result - Dhaka University of Engineering & Technology',
    images: ['/images/website_preview.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${nunito.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
