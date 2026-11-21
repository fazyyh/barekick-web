# Local shoe models

## Orange reference shoe

`orange-reference-shoe.glb` is a single-view reconstruction from the supplied shoe screenshot. It embeds the actual photograph as a projected side texture. The top, tongue, width, inner side, lining and outsole are inferred geometry/materials; this is not a full scan. The opposite side reuses the same photograph. Length is assumed at about 30 cm and should be calibrated in the app.

The asset contains 26,058 triangles, 10 material batches and one embedded PNG, about 1.2 MB in total. Select **Orange Reference** in the app (the new default) or open `/model-preview.html?shoe=orange-reference`. Use `npm run models:orange` to rebuild it; `scripts/create-orange-shoe.mjs` contains the geometry and photo projection. The supplied reference and branding retain their original rights; this model is not covered by the Studio 01 CC0 license.

## Included original model

`sole-studio-01.glb` is an original SOLE Studio testing sneaker. It includes a sculpted outsole with tread, rubber midsole, leather and suede upper panels, padded collar and lining, tongue label, crossed laces and bow, brass eyelets, toe perforation details, and individual stitches. It uses 12 material batches and 62,486 triangles. All materials and geometry are inside the GLB; no texture downloads are needed. See `Studio-01-LICENSE.txt` for CC0 licensing.

Open `/model-preview.html?shoe=studio-01` for an interactive Studio 01 preview with zoom, wireframe, and GLB download. The AR renderer normalizes model length to the foot rig, grounds the sole, and mirrors X for the opposite foot. This remains an approximate pose-based AR overlay, not a measurement of physical shoe fit.

Rebuild the GLB with `npm run models:generate`. The editable generator is `scripts/create-shoe.mjs`.

## Add another model

Place licensed `.glb` files in this folder, then register the path on the matching entry in `src/models/shoeCatalog.ts`:

```ts
{ id: 'my-shoe', name: 'My Shoe', brand: 'MY BRAND', category: 'LOW TOP', color: '#eee', accent: '#333', price: '$120', modelUrl: '/models/my-shoe.glb' }
```

The model loader keeps the stylized demo shoe visible if a file is missing or fails to load. Models should be centered near the origin, with the toe along local +Y and the sole near local Z=0 for the current alignment convention.
