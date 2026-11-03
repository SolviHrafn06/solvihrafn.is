import { AnimatedPage, Reveal, SiteHeader, SiteFooter, OrbitalArt, Palette, MagneticButton, Marquee } from './experience';

export default function Home() {
  return <><SiteHeader /><AnimatedPage>
    <Reveal className="hero wrap" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow"><span className="status-dot"></span> VELKOMIN Á SOLVIHRAFN.IS</p>
        <h1 id="hero-title"><span className="title-line">Hugmyndir</span><span className="title-line">byrja <em>hér.</em></span></h1>
        <p className="intro">Ég er Sölvi Hrafn.<br/>Þetta er mitt eigið horn á internetinu<br className="desktop-break"/> fyrir hugmyndir, tilraunir og allt þar á milli.</p>
        <MagneticButton href="#tilraun">Prófum eitthvað</MagneticButton>
        <p className="hero-note">Lítil byrjun. Ótal möguleikar.</p>
      </div>
      <OrbitalArt />
    </Reveal>
    <Marquee />
    <Reveal id="um" className="about wrap" aria-labelledby="about-title">
      <p className="eyebrow section-label">01 / MITT SVÆÐI</p>
      <div><h2 id="about-title">Pláss fyrir það<br/>sem kemur næst.</h2><p>Þessi síða er byrjunin á einhverju nýju. Hér fær forvitnin að ráða för og hugmyndir að taka á sig mynd, ein tilraun í einu.</p></div>
      <span className="asterisk" aria-hidden="true">✳</span>
    </Reveal>
    <Reveal id="tilraun" className="lab wrap" aria-labelledby="lab-title">
      <div className="lab-copy"><p className="eyebrow">02 / LÍTIL TILRAUN</p><h2 id="lab-title">Sama hugmynd.<br/>Annar litur.</h2><p>Stundum þarf bara að sjá hlutina í nýju ljósi.<br/>Veldu lit og sjáðu síðuna breytast.</p></div>
      <Palette />
    </Reveal>
    <Reveal className="closing wrap"><p>Framhaldið er óskrifað.</p><a href="https://github.com/SolviHrafn06" target="_blank" rel="noopener noreferrer">Fylgstu með á GitHub <span aria-hidden="true">↗</span></a></Reveal>
  </AnimatedPage><SiteFooter /></>;
}
