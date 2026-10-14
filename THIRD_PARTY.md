# Third-party components

This repository's own code is MIT-licensed (see `LICENSE`). The components below are used by
the FitPlate pipeline; the license shown is the one declared by the *installed* package's own
metadata (`node_modules/<pkg>/package.json`, `pip show`, `importlib.metadata`) on this machine,
not a guess from a website. We claim no copyright over them.

## Redistributed inside this repository's build outputs

The workbench panel bundle (`plugin/extensions/main/client/index.js`, built by
`scripts/build-client.mjs`) inlines the following library, so its license text is reproduced
in full below. React / ReactDOM / `@agnes/cordis` / `@agnes/web-client` are **not** inlined:
they are host-provided imports (the build keeps them external and fails if that list changes).

| Component | Version (installed) | License | Where |
| --- | --- | --- | --- |
| three.js | 0.186.1 | MIT | inlined in the panel bundle |

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

## Used at runtime, installed separately (not redistributed here)

| Component | Version (installed) | License (declared by the package) | Role |
| --- | --- | --- | --- |
| CadQuery | 2.8.0 | Apache-2.0 | CAD kernel API used by `geometry/fitplate` |
| cadquery-ocp | 7.9.3.1.1 | Apache-2.0 (OCCT 7.9.3.1.1 build; OCCT itself is distributed by its own project) | OCCT Python bindings (B-rep kernel) |
| VTK | 9.6.2 | BSD (per `pip show vtk`) | transitive dependency of the OCP wheel (VTK/OCCT stack) |
| pytest | 9.1.1 | MIT | geometry/preflight test suites |
| jsonschema | 4.26.0 | MIT | schema validation in the geometry test suite |
| Playwright | 1.63.0 | Apache-2.0 | browser acceptance (`tests/browser`, `tests/native`) |
| esbuild | 0.28.2 | MIT | panel bundle build |
| TypeScript | 5.9.3 | Apache-2.0 | type checking for the panel sources |
| React / ReactDOM (types) | @types 18.3.12 / 18.3.1 | MIT | panel sources; the runtime instance is provided by the AGH host page |
| Agnes Harness (AGH) | local checkout `/home/Heliora/ANG/agnes-harness` | Apache-2.0 | the host that runs the plugin; **not redistributed** — the plugin only imports its public APIs through the daemon |

The transitive Python closure of CadQuery (numpy, scipy, casadi, ezdxf, multimethod, nlopt,
numba, trame/…, matplotlib) keeps its own upstream licenses (BSD/MIT/Apache-2.0/LGPL as each
project declares); it is installed into the project `.venv` from the recorded
`geometry/requirements.lock.txt`, not vendored into this repository.

## Asset and content provenance

All task/scene/design inputs in `fixtures/dev/` and `evaluation/input-cases/` are project-authored
synthetic teaching fixtures (`provenance.kind = "synthetic_teaching_fixture"`). These synthetic fixture inputs are project-authored. The separately registered Banner Q20PD
device card records a limited set of dimensional facts from Banner Engineering Q20 Series
instruction manual p/n 127816, with source URL, page references and coordinate derivations.
Banner and Q20PD names identify that source/device; no manufacturer logo or full datasheet PDF
is redistributed in this source package. Board layouts, obstacle envelopes, clearances and
other design assumptions are identified separately from vendor dimensions. No affiliation or
manufacturer approval is claimed. The AGH web workbench assets served by
`scripts/agh/web.mjs` are the locally installed AGH build, loaded from that checkout at runtime;
they are not copied into this repository.
