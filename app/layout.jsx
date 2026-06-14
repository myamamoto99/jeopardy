import './globals.css'

export const metadata = {
  title: 'Jeopardy React',
  description: 'Host and play a custom Jeopardy game',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
