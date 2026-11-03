import { AnimatedPage, Reveal, SiteHeader, SiteFooter } from '../experience';
export const metadata = { title: 'Ferilskrá', description: 'Starfsreynsla, menntun og verkefni Sölva Hrafns Péturssonar.' };
export default function Resume() {
  return <><SiteHeader /><AnimatedPage className="wrap cv-main">
    <Reveal className="cv-intro" aria-labelledby="cv-title">
      <div><p className="eyebrow"><span className="status-dot"></span> FERILSKRÁ</p><h1 id="cv-title">Sölvi Hrafn<br/><em>Pétursson.</em></h1><p className="cv-tagline">Sala og þjónusta. Tækni og forvitni.</p></div>
      <div className="cv-contact"><p className="eyebrow">HAFÐU SAMBAND</p><a href="mailto:solvihrafnpetursson@gmail.com">solvihrafnpetursson@gmail.com <span aria-hidden="true">↗</span></a></div>
    </Reveal>
    <Reveal className="cv-section" aria-labelledby="about-title">
      <div className="cv-heading"><p className="eyebrow">01 / KYNNING</p><h2 id="about-title">Um mig</h2></div>
      <div className="cv-content"><p className="cv-lead">Ég er jákvæður, opinn og ábyrgur starfsmaður með reynslu af sölu, þjónustu og vinnu með börnum.</p><p>Ég vinn sjálfstætt, á auðvelt með samstarf og legg metnað í að skila verkefnum vel. Ég hef mikinn áhuga á tækni, forritun og tölvuleikjaþróun og stefni á frekara nám á því sviði í Svíþjóð eða Noregi.</p></div>
    </Reveal>
    <Reveal className="cv-section" aria-labelledby="experience-title">
      <div className="cv-heading"><p className="eyebrow">02 / REYNSLA</p><h2 id="experience-title">Starfsreynsla</h2></div>
      <div className="cv-content cv-jobs">
        <article className="cv-job"><div className="cv-job-top"><h3>ELKO</h3><p className="cv-date">Janúar 2025 – núverandi</p></div><p className="cv-role">Sölumaður</p></article>
        <article className="cv-job"><div className="cv-job-top"><h3>Sports Direct</h3><p className="cv-date">2024 · 2025</p></div><p>Dag- og helgavaktir.</p></article>
        <article className="cv-job"><div className="cv-job-top"><h3>Bónus</h3><p className="cv-date">2023–2024</p></div><p className="cv-role">Þjónustufulltrúi</p></article>
        <article className="cv-job"><div className="cv-job-top"><h3>Kópavogsbær</h3><p className="cv-date">Sumarið 2023</p></div><p className="cv-role">Skólagarðar</p></article>
        <article className="cv-job"><div className="cv-job-top"><h3>Kópavogsbær</h3><p className="cv-date">Sumarið 2022</p></div><p className="cv-role">Félagsmiðstöðin Dimma · Frístundarfulltrúi</p><p>Almenn störf og ábyrgð á börnum.</p></article>
        <article className="cv-job"><div className="cv-job-top"><h3>Kópavogsbær</h3><p className="cv-date">Sumrin 2018–2021</p></div><p className="cv-role">Unglingavinna</p></article>
      </div>
    </Reveal>
    <Reveal className="cv-section" aria-labelledby="education-title">
      <div className="cv-heading"><p className="eyebrow">03 / NÁM</p><h2 id="education-title">Menntun</h2></div>
      <div className="cv-content"><div className="cv-job-top"><h3>Tækniskólinn</h3><p className="cv-date">Áætluð útskrift í mars 2027</p></div></div>
    </Reveal>
    <Reveal className="cv-section" aria-labelledby="skills-title">
      <div className="cv-heading"><p className="eyebrow">04 / FÆRNI</p><h2 id="skills-title">Tungumál og<br/>tölvukunnátta</h2></div>
      <div className="cv-content cv-skills"><div><h3>Tungumál</h3><p>Mjög góð færni í íslensku, sænsku og ensku. Bjó í Svíþjóð í átta ár.</p><ul className="cv-tags" aria-label="Tungumál"><li>Íslenska</li><li>Sænska</li><li>Enska</li></ul></div><div><h3>Tölvukunnátta</h3><p>Góð almenn tölvukunnátta og þekking á Microsoft Office og Google-forritum. Reynsla af forritun tölvuleikja.</p></div></div>
    </Reveal>
    <Reveal className="cv-section" aria-labelledby="projects-title">
      <div className="cv-heading"><p className="eyebrow">05 / FORVITNI</p><h2 id="projects-title">Áhugamál<br/>og verkefni</h2></div>
      <div className="cv-content"><p className="cv-lead">Frá hugmynd að tölvuleik.</p><p>Ég vinn að þróun tölvuleiks með félögum mínum og stefnum við á útgáfu á Steam. Ég nýti frítímann til að læra meira um forritun og tækni. Önnur áhugamál eru Formúla 1 og samvera með fjölskyldu og vinum.</p><a className="cv-github" href="https://github.com/SolviHrafn06" target="_blank" rel="noopener noreferrer">Skoða GitHub <span aria-hidden="true">↗</span></a></div>
    </Reveal>
  </AnimatedPage><SiteFooter /></>;
}
