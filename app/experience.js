'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { motion, MotionConfig, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';

const Experience = createContext({});
const colors = [
  { id: 'orange', value: '#ee754c', name: '01 — Appelsínugulur' },
  { id: 'blue', value: '#658ac0', name: '02 — Blár' },
  { id: 'green', value: '#87a16a', name: '03 — Grænn' },
];

export function SiteExperience({ children }) {
  const [color, setColor] = useState('orange');
  const [enabled, setEnabled] = useState(true);
  const prefersReduced = useReducedMotion();
  const reduced = !enabled || prefersReduced;
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 150, damping: 30 });
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sh-color');
      if (colors.some(item => item.id === saved)) setColor(saved);
      setEnabled(localStorage.getItem('sh-motion') !== 'off');
    } catch { /* Preferences are optional when browser storage is unavailable. */ }
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', colors.find(item => item.id === color).value);
    document.documentElement.dataset.motion = reduced ? 'off' : 'on';
  }, [color, reduced]);
  const chooseColor = value => {
    setColor(value);
    try { localStorage.setItem('sh-color', value); } catch {}
  };
  const toggleMotion = () => {
    setEnabled(value => { try { localStorage.setItem('sh-motion', value ? 'off' : 'on'); } catch {} return !value; });
  };
  return <Experience.Provider value={{ color, chooseColor, reduced, enabled, toggleMotion }}>
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <motion.div className="reading-progress" aria-hidden="true" style={{ scaleX: reduced ? scrollYProgress : progress }} />
      {children}
    </MotionConfig>
  </Experience.Provider>;
}

export function SiteHeader() {
  const path = usePathname();
  return <><a className="skip" href="#main">Fara í efni</a><header className="header wrap">
    <Link href="/" className="brand" aria-label="Sölvi Hrafn, forsíða">sölvi hrafn<span className="brand-dot">.</span></Link>
    <nav aria-label="Aðalvalmynd">
      <Link href={path === '/' ? '/#um' : '/'}>{path === '/' ? 'Um síðuna' : 'Forsíða'}</Link>
      <Link href="/ferilskra/" aria-current={path.startsWith('/ferilskra') ? 'page' : undefined}>Ferilskrá</Link>
      <a href="https://github.com/SolviHrafn06" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
    </nav>
  </header></>;
}

export function SiteFooter() {
  const { enabled, toggleMotion } = useContext(Experience);
  return <footer className="footer wrap"><Link className="brand" href="/">sölvi hrafn<span className="brand-dot">.</span></Link>
    <span>Sölvi Hrafn Pétursson</span>
    <button className="motion-toggle" onClick={toggleMotion} aria-pressed={enabled}>Hreyfingar: {enabled ? 'á' : 'af'}</button>
    <a href="#">Aftur upp ↑</a>
  </footer>;
}

export function AnimatedPage({ children, className }) {
  const path = usePathname();
  const { reduced } = useContext(Experience);
  return <motion.main id="main" key={path} className={className} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>{children}</motion.main>;
}

export function Reveal({ children, className, id, ...props }) {
  const { reduced } = useContext(Experience);
  return <motion.section className={className} id={id} {...props} initial={reduced ? false : { opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={{ duration: .7, ease: [.22, 1, .36, 1] }}>{children}</motion.section>;
}

export function MagneticButton({ href, children }) {
  const { reduced } = useContext(Experience);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 }), sy = useSpring(y, { stiffness: 220, damping: 18 });
  function follow(event) {
    if (reduced || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - bounds.left - bounds.width / 2) * .16);
    y.set((event.clientY - bounds.top - bounds.height / 2) * .2);
  }
  return <motion.a className="button" href={href} style={{ x: sx, y: sy }} onPointerMove={follow} onPointerLeave={() => { x.set(0); y.set(0); }} whileTap={{ scale: .97 }}>{children}<span aria-hidden="true">↗</span></motion.a>;
}

export function Palette() {
  const { color, chooseColor } = useContext(Experience);
  return <div className="palette"><div className="swatches" role="group" aria-label="Veldu áherslulit síðunnar">{colors.map(item => <motion.button key={item.id} className={`swatch ${color === item.id ? 'selected' : ''}`} data-color={item.id} aria-label={item.name.split(' — ')[1]} aria-pressed={color === item.id} onClick={() => chooseColor(item.id)} whileHover={{ y: -6, scale: 1.08 }} whileTap={{ scale: .92 }}><span /></motion.button>)}</div><p aria-live="polite">{colors.find(item => item.id === color).name}</p></div>;
}

export function OrbitalArt() {
  const { reduced } = useContext(Experience);
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotateY = useSpring(useTransform(x, [-.5, .5], [-9, 9]), { stiffness: 110, damping: 20 });
  const rotateX = useSpring(useTransform(y, [-.5, .5], [8, -8]), { stiffness: 110, damping: 20 });
  const { scrollY } = useScroll();
  const lift = useTransform(scrollY, [0, 800], [0, -55]);
  function tilt(event) {
    if (reduced || event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - box.left) / box.width - .5);
    y.set((event.clientY - box.top) / box.height - .5);
  }
  return <div className="art-stage" aria-hidden="true" onPointerMove={tilt} onPointerLeave={() => { x.set(0); y.set(0); }}>
    <motion.div className="art" style={{ rotateX: reduced ? 0 : rotateX, rotateY: reduced ? 0 : rotateY, y: reduced ? 0 : lift }}>
      <span className="art-label">HUGMYND Í MÓTUN / 001</span>
      <svg viewBox="0 0 560 560" className="orbital">
        <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="currentColor" strokeOpacity=".09" /></pattern><radialGradient id="sun-light"><stop stopColor="white" stopOpacity=".22"/><stop offset="1" stopColor="white" stopOpacity="0"/></radialGradient></defs>
        <rect width="560" height="560" fill="url(#grid)" />
        <circle className="sun" cx="280" cy="280" r="161" /><circle cx="240" cy="240" r="190" fill="url(#sun-light)"/>
        <g className="orbit-spin" fill="none" stroke="currentColor" strokeWidth="1.3"><ellipse cx="280" cy="280" rx="232" ry="89" transform="rotate(-35 280 280)"/><ellipse cx="280" cy="280" rx="232" ry="89" transform="rotate(35 280 280)"/><ellipse cx="280" cy="280" rx="232" ry="89" transform="rotate(90 280 280)"/><circle cx="104" cy="316" r="9" fill="currentColor"/><circle cx="400" cy="133" r="6" fill="currentColor"/></g>
        <motion.g animate={reduced ? { y: 0, rotate: 0 } : { y: [0, -12, 0], rotate: [0, -3, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
          <path className="bird" d="M132 310C177 239 223 222 276 255C302 193 355 177 421 196C369 215 338 248 318 292L351 324L307 313C275 342 234 352 204 332L152 349L175 321Z"/><circle cx="323" cy="253" r="4" fill="var(--paper)"/>
        </motion.g>
        <path d="M448 404v22m-11-11h22M89 133v16m-8-8h16" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
      <div className="art-caption"><span>ALLT BYRJAR Á EINNI HUGMYND.</span><span>↗</span></div>
    </motion.div><div className="floating-note"><span>✳</span> Forvitnin ræður för.</div>
  </div>;
}

export function Marquee() {
  return <div className="marquee" aria-hidden="true"><div className="marquee-track">{[0, 1, 2, 3].map(i => <span key={i}>HUGMYNDIR <b>✳</b> FORRITUN <b>✳</b> FORVITNI <b>✳</b> SKÖPUN <b>✳</b> </span>)}</div></div>;
}
