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

## Birting

GitHub Actions byggir Next.js sjálfkrafa og birtir `out/` á GitHub Pages þegar breyting er send á `main`.
Slóðirnar eru https://solvihrafn.is/ og https://solvihrafn.is/ferilskra/.

`pnpm build` býr til statískar síður í `out/`; mappan er ekki geymd í Git.
GitHub Pages notar **GitHub Actions** sem birtingaruppsprettu.
`public/CNAME` varðveitir eigið lén í útflutningnum.

Síðurnar eru statískar. Innskráning, gagnagrunnur og Next.js aðgerðir sem þurfa þjón krefjast sér bakenda eða annarrar hýsingar.
