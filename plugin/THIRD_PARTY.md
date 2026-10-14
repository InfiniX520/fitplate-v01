# Third-party notices for the @fitplate/plugin snapshot

This directory is the independently distributed `@fitplate/plugin` snapshot. Its own code is
MIT-licensed (`./LICENSE`, `Copyright (c) 2026 FitPlate project contributors`).

The workbench panel bundle (`extensions/main/client/index.js`) inlines the library below. It is
built by `scripts/build-client.mjs` with `legalComments: 'none'`, so the license comments are
stripped from the bundle bytes; their notice text is therefore reproduced in full here.

React / ReactDOM / `@agnes/cordis` / `@agnes/web-client` are **not** inlined or redistributed:
they are host-provided imports (the build keeps them external and fails if that list changes).

## Redistributed inside this snapshot

| Component | Version (installed) | License |
| --- | --- | --- |
| three.js | 0.186.1 | MIT |

```
The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

(the MIT text above is the license declared by the installed `node_modules/three@0.186.1`
package on the build machine; the same terms apply to any three.js release)

Build-time-only tooling (esbuild, TypeScript, Playwright) runs on the build/acceptance machine
and is not redistributed in this snapshot. The Agnes Harness host itself is not redistributed;
the plugin imports only its public, host-provided APIs. The repository-level
`THIRD_PARTY.md` documents those separately.
