# Duel Knights: notes for Claude

## Workflow
- Commit and push straight to `main`. No feature branches or pull requests unless asked:
  the owner prefers speed here, and a briefly broken build is acceptable.
- Pushes to `main` publish to GitHub Pages, which is where the owner play-tests.

## Checks
- `node tests/sim.mjs 1` is a quick smoke test: every pairing plays one AI-vs-AI match and
  the run fails on a page error or a match that never ends. Use `20`+ matches when tuning balance.
- For visual changes, take screenshots with Playwright. With `?debug`, `window.__duel.cam(pos, look)`
  pins the camera; add `&silent` to skip audio.
- `node tests/save.mjs` covers saved data, the settings screen and the pause menu.

## Code map
See the README's "Project layout". Knights are data in `src/characters.js`; weapons in
`src/weapons.js`; attack timings in `src/moves.js`; capes and heraldry in `src/textures.js`; saved data in `src/save.js`.
