import type { Metadata } from 'next'
import localFont from 'next/font/local'
import ThemeToggle from '@/components/ThemeToggle'
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

// Inline script — runs synchronously before paint to prevent theme flash.
// Must be a plain string (not JSX expression) so Next.js serialises it correctly.
const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'auto';var d=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${playfair.variable} ${dmMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <div className="fixed top-3 right-3 z-50">
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  )
}
