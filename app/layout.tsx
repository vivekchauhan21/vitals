import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Health & Safety Companion', description: 'Calm, accessible first-aid guidance, translation, and emergency contact alerts.' }
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#f6f7f4', userScalable: true }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-background"><body>{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
