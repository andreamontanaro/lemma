import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const playfair = localFont({
  src: [
    {
      path: '../public/fonts/Playfair_Display/PlayfairDisplay-VariableFont_wght.ttf',
      style: 'normal',
    },
    {
      path: '../public/fonts/Playfair_Display/PlayfairDisplay-Italic-VariableFont_wght.ttf',
      style: 'italic',
    },
  ],
  variable: '--font-playfair',
})

const dmMono = localFont({
  src: [
    {
      path: '../public/fonts/DM_Mono/DMMono-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/DM_Mono/DMMono-LightItalic.ttf',
      weight: '300',
      style: 'italic',
    },
    {
      path: '../public/fonts/DM_Mono/DMMono-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/DM_Mono/DMMono-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../public/fonts/DM_Mono/DMMono-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/DM_Mono/DMMono-MediumItalic.ttf',
      weight: '500',
      style: 'italic',
    },
  ],
  variable: '--font-dm-mono',
})

export const metadata: Metadata = {
  title: 'lemma.',
  description: 'Il gioco delle parole di oggi.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${playfair.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
