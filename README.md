# minskiist.github.io

Portfolio site for **Minna Purkunen** — real-time interactive audiovisual systems.

Live at **https://minnapurkunen.com**

## Structure

```
index.html      Entire site, single file. HTML + CSS + JS, no build step.
media/          Video loops and stills.
.nojekyll       Tells GitHub Pages to serve files as-is.
```

## Editing

Text lives directly in `index.html`. Every piece of copy exists twice:

```html
<span data-fi>Suomenkielinen teksti</span>
<span data-en>English text</span>
```

Edit both, or the language toggle will show a gap.

## Stack

Plain HTML, CSS and vanilla JavaScript. No framework, no dependencies, no build.
Fonts from Google Fonts. Hero background is a canvas flow field rendered in the browser.

## Related

- [TD Gesture Control Framework](https://github.com/Minskiist) — gesture control protocol and technical reference for TouchDesigner
