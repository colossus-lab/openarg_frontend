'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggleEditorial from './ThemeToggleEditorial';

interface NavLink {
  href: string;
  label: string;
}

const LINKS: NavLink[] = [
  { href: '/dashboards', label: 'Dashboards' },
  { href: '/como-funciona', label: 'Cómo funciona' },
  { href: '/datasets', label: 'Datasets' },
];

export default function TopbarEditorial() {
  const pathname = usePathname();
  return (
    <header className="ed-topbar">
      <Link href="/" className="ed-topbar-mark" aria-label="OpenArg, ir al inicio">
        <span className="ed-topbar-mark-name">OpenArg</span>
        <span className="ed-topbar-mark-sub">por Colossus Lab</span>
      </Link>

      <nav className="ed-topbar-nav" aria-label="Navegación principal">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? 'is-active' : ''}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="ed-topbar-right">
        <ThemeToggleEditorial />
        <Link href="/chat" className="ed-topbar-cta">
          Abrir chat <span aria-hidden="true">→</span>
        </Link>
      </div>
    </header>
  );
}
