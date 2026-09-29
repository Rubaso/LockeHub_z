import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Header from '@/components/Header'
import { APP_NAME } from '@/lib/constants'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Tracker de nuzlocke y torneo',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Header />
        <main className="mx-auto max-w-screen-2xl px-4 py-6">{children}</main>
        <a
          href="https://github.com/Rubaso/LockeHub_z"
          target="_blank"
          rel="noreferrer"
          aria-label="Ver el repositorio de LockeHub en GitHub"
          title="LockeHub en GitHub"
          className="fixed bottom-4 right-4 z-50 rounded-full bg-zinc-900/80 p-3 text-zinc-400 opacity-50 shadow-lg transition duration-200 hover:scale-110 hover:opacity-90 focus-visible:scale-110 focus-visible:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.53v-2.08c-3.1.67-3.76-1.31-3.76-1.31-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.77 2.08 3.3 1.58.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.11-1.45 3.04-1.15 3.04-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.62 5.23-5.11 5.51.4.35.75 1.03.75 2.08V22c0 .29.2.63.77.52A11.1 11.1 0 0 0 12 .9Z" />
          </svg>
        </a>
      </body>
    </html>
  )
}
