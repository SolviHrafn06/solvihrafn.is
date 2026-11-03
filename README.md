# Sölvi Hrafn — solvihrafn.is

Persónuleg vefsíða og ferilskrá í Next.js App Router, React og Motion.

## Keyra á tölvunni

Node.js 22 eða nýrra og pnpm 10.28.2:

```sh
pnpm install
pnpm dev
```

Opnaðu http://localhost:3000. Breytingar sjást jafnóðum á meðan þróunarþjónninn keyrir.

## Hvar breyti ég?

- `app/page.js`: forsíðan.
- `app/ferilskra/page.js`: ferilskráin.
- `app/experience.js`: valmynd, litaval, hreyfingar og fótur.
- `app/globals.css`: grunnútlit og ferilskrá.
- `app/enhancements.css`: hreyfingar og sjónræn áhrif.
- `public/`: favicon, CNAME og aðrar opinberar skrár.

Litaval og hreyfirofi eru vistuð í vafranum. Síðan virðir kerfisstillinguna fyrir minni hreyfingar.

## Prófanir á forsíðu

Prófustofan inniheldur JavaScript, HTML, CSS, Markdown, Python, SQL, Java, C# og C++.
JavaScript keyrir í sér Web Worker og stöðvast eftir tvær sekúndur ef keyrslu lýkur ekki.
Python notar Pyodide 314.0.7, sótt af jsDelivr við fyrstu keyrslu, og keyrir í module worker.
SQL notar SQLite/sql.js með nýjum sýnigagnagrunni við hverja keyrslu; WASM-skrár eru afritaðar sjálfkrafa í prebuild.
HTML, CSS og Markdown birtast í einangruðum iframe með lokuðum skriftum og nettilföngum.
Java, C# og C++ sýna gagnvirk JavaScript-reiknilíkön ásamt samsvarandi, niðurhalanlegum frumkóða. Þau þýða ekki almennan Java/C#/C++ kóða í vafranum.
Leikjahlutinn vísar á https://solvihrafn.itch.io/.

## Stjörnuhlaup

„Prófa leik“ við itch.io-hlekkinn opnar lítinn Canvas-platformer með CRT-áferð.
Örvar eða A/D hreyfa leikmann, bilslá/W/upp ör hoppar, P gerir hlé og R byrjar aftur.
Snertihnappar eru einnig í boði. Fjögur borð hafa ólíka palla og liti; safna þarf þremur stjörnum á hverju borði og komast að fánanum. Tími og föll teljast saman yfir öll borðin; hlé stöðvar klukkuna.
`app/platformer.js` sér um leikglugga og stýringu; `app/platformer-engine.mjs` um eðlisfræði og teikningu; `app/platformer.css` um útlit og CRT-áferð.

Sameiginlega metataflan notar sér Sites-þjónustu, skilgreinda í `app/leaderboard.js`. Vefsíðan og lénið eru áfram á GitHub Pages. Hver keppnisferð fær einnota auðkenni og sendir þjappaða upptöku af tökkum. Þjónninn spilar ferðina aftur í sömu eðlisfræði, staðfestir öll fjögur borðin og reiknar tímann sjálfur. Besti tími hvers nafns birtist á topp 20. Þetta hindrar tilbúna innsenda tíma en er ekki vörn gegn vélmennum.
Nöfn eru síuð á þjóninum með einkalista sem er ekki í þessu opinbera safni. Nöfn og tímar eru opinber; engin innskráning er nauðsynleg. Ferðir yfir tíu mínútur fara ekki á metatöfluna og auðkenni renna út eftir 30 mínútur. Ef þjónustan næst ekki er hægt að spila æfingaferð án mets.

## Birting á GitHub Pages

GitHub Actions byggir Next.js sjálfkrafa og birtir `out/` á GitHub Pages þegar breyting er send á `main`.
Slóðirnar eru https://solvihrafn.is/ og https://solvihrafn.is/ferilskra/.

`pnpm build` býr til statískar síður í `out/`; mappan er ekki geymd í Git.
GitHub Pages notar **GitHub Actions** sem birtingaruppsprettu.
`public/CNAME` varðveitir eigið lén í útflutningnum.

Síðurnar eru statískar. Innskráning, gagnagrunnur og Next.js aðgerðir sem þurfa þjón krefjast sér bakenda eða annarrar hýsingar.
