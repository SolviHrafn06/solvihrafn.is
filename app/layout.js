import './globals.css';
import './enhancements.css';
import './showcase.css';
import { SiteExperience } from './experience';

export const metadata = {
  metadataBase: new URL('https://solvihrafn.is'),
  title: { default: 'Sölvi Hrafn — Kóði sem þú getur prófað.', template: '%s — Sölvi Hrafn' },
  description: 'Forritun, leikjaþróun og gagnvirkar prufur. Prófaðu JavaScript, Python, SQL, HTML, CSS, Markdown og reiknilíkön með Java, C# og C++ kóða.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }) {
  return <html lang="is"><body><SiteExperience>{children}</SiteExperience></body></html>;
}
