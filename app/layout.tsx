import type {Metadata} from 'next';
import { Playfair_Display, Dancing_Script, Caveat, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css'; // Global styles

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-handwriting',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-casual',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Enveloppe Cadeau Interactive',
  description: 'Une enveloppe interactive romantique et personnalisable',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fr" className={`${playfair.variable} ${dancingScript.variable} ${caveat.variable} ${plusJakarta.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased bg-[#f5efe6] text-neutral-800">{children}</body>
    </html>
  );
}
