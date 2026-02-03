import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'

import { ToastProvider } from '../context/ToastContext'
import { ToastContainer } from '../components/ToastContainer'
import GlobalMonitor from '../components/GlobalMonitor'

import { ThemeProvider } from '../context/ThemeContext'
import { MonitoringProvider } from '../context/MonitoringContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EduSmart AI - Hệ Thống Học Tập Tích Hợp AI',
  description: 'Nền tảng học tập thông minh cho học sinh THCS và THPT',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <MonitoringProvider>
            <ToastProvider>
              {children}
              <ToastContainer />
              <GlobalMonitor />
            </ToastProvider>
          </MonitoringProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

