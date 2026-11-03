import './globals.css';
import './enhancements.css';
import { SiteExperience } from './experience';

export const metadata = {
  metadataBase: new URL('https://solvihrafn.is'),
  title: { default: 'Sölvi Hrafn — Hugmyndir byrja hér.', template: '%s — Sölvi Hrafn' },
  description: 'Mitt eigið horn á internetinu. Hugmyndir, tilraunir og allt þar á milli.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }) {
  return <html lang="is"><body><SiteExperience>{children}</SiteExperience></body></html>;
}
