import Link from 'next/link';
import { AnimatedPage, Reveal, SiteHeader, SiteFooter, Palette, MagneticButton } from './experience';
import { HeroConsole, Playground, LanguageRibbon } from './playground';
import { GameLauncher } from './platformer';

export default function Home() {
  return <><SiteHeader /><AnimatedPage>
    <Reveal className="hero developer-hero wrap" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow"><span className="status-dot"></span> SÖLVI HRAFN / FORRITUN & LEIKJAÞRÓUN</p>
        <h1 id="hero-title"><span className="title-line">Minna tal.</span><span className="title-line">Meiri <em>kóði.</em></span></h1>
        <p className="intro">Ég er Sölvi Hrafn. Ég hef áhuga á forritun og tölvuleikjaþróun. Hér geturðu fiktað í kóðanum, prófað hugmyndir og séð hvað gerist.</p>
        <div className="hero-actions"><MagneticButton href="#profustofa">Prófa kóðann</MagneticButton><a className="text-link" href="https://solvihrafn.itch.io" target="_blank" rel="noopener noreferrer">Leikirnir mínir <span aria-hidden="true">↗</span></a></div>
        <p className="hero-note">Ekki bara lesa um það. Prófaðu það.</p>
      </div>
      <HeroConsole />
    </Reveal>
    <LanguageRibbon />
    <Reveal id="profustofa" className="showcase-section wrap" aria-labelledby="playground-title">
      <div className="section-intro"><div><p className="eyebrow">01 / PRÓFUSTOFAN</p><h2 id="playground-title">Kóði sem þú<br/>getur <em>snert.</em></h2></div><p>Veldu tungumál, breyttu kóðanum eða stillingunum og prófaðu. Frá einföldum vefkortum yfir í gagnagrunnsfyrirspurnir og hreyfingar í leikjum.</p></div>
      <Playground />
    </Reveal>
    <Reveal id="leikir" className="games-section wrap" aria-labelledby="games-title">
      <div className="game-world" aria-hidden="true"><div className="game-sun"/><span className="game-cloud cloud-one"/><span className="game-cloud cloud-two"/><div className="game-mountain mountain-one"/><div className="game-mountain mountain-two"/><div className="game-platform platform-one"/><div className="game-platform platform-two"/><div className="game-avatar"/><span className="game-star star-one">✦</span><span className="game-star star-two">✦</span><span className="game-star star-three">✦</span><div className="game-ground"/><span className="game-world-label">HUGMYND → KÓÐI → LEIKUR</span></div>
      <div className="games-copy"><p className="eyebrow">02 / LEIKJAÞRÓUN</p><h2 id="games-title">Kóðinn fær<br/>sitt eigið líf.</h2><p>Ég vinn að tölvuleikjum og set verkefnin mín á itch.io. Þar má sjá leikjahugmyndirnar mínar og það sem ég er að vinna í.</p><div className="game-links"><a className="button itch-button" href="https://solvihrafn.itch.io" target="_blank" rel="noopener noreferrer">Skoða á itch.io <span aria-hidden="true">↗</span></a><GameLauncher /></div><span className="itch-address">solvihrafn.itch.io</span></div>
    </Reveal>
    <Reveal id="um" className="about developer-about wrap" aria-labelledby="about-title"><p className="eyebrow section-label">03 / Á BAK VIÐ KÓÐANN</p><div><h2 id="about-title">Forvitni er<br/>drifkrafturinn.</h2><p>Ég nýti frítímann til að læra meira um tækni, forritun og leikjaþróun. Mér finnst skemmtilegast þegar hugmynd verður að einhverju sem aðrir geta prófað.</p><Link className="text-link" href="/ferilskra/">Skoða ferilskrá <span aria-hidden="true">↗</span></Link></div><span className="asterisk" aria-hidden="true">✳</span></Reveal>
    <Reveal className="color-footer wrap" aria-labelledby="color-title"><div><p className="eyebrow">LÍTIL AUKATILRAUN</p><h2 id="color-title">Veldu þinn lit.</h2></div><Palette /></Reveal>
    <Reveal className="closing wrap"><p>Næsta hugmynd er í þróun.</p><a href="https://github.com/SolviHrafn06" target="_blank" rel="noopener noreferrer">Skoða kóðann á GitHub <span aria-hidden="true">↗</span></a></Reveal>
  </AnimatedPage><SiteFooter /></>;
}
