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

## Birting

GitHub Actions byggir Next.js sjálfkrafa og birtir `out/` á GitHub Pages þegar breyting er send á `main`.
Slóðirnar eru https://solvihrafn.is/ og https://solvihrafn.is/ferilskra/.

`pnpm build` býr til statískar síður í `out/`; mappan er ekki geymd í Git.
GitHub Pages notar **GitHub Actions** sem birtingaruppsprettu.
`public/CNAME` varðveitir eigið lén í útflutningnum.

Síðurnar eru statískar. Innskráning, gagnagrunnur og Next.js aðgerðir sem þurfa þjón krefjast sér bakenda eða annarrar hýsingar.
