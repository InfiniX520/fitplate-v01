# fitplate (geometry package)

The FitPlate geometry layer: the frozen TaskSpec/SceneSpec contract, the CadQuery model
generator, the independent STEP measurement (G01–G08 acceptance report), the strict
pre-generation input classifier (`fitplate.preflight`), and the evidence-bound export bundle.

This package lives in `geometry/` next to the `schemas/` directory it loads (`<repo>/schemas`),
so it is installed from, and always runs against, this repository's checkout.

```bash
# from the repository root, with the project venv (CadQuery 2.8.0 / OCCT 7.9.3.1.1 / VTK 9.6.2)
.venv/bin/python -m pytest tests/geometry -q     # 116 passed
.venv/bin/python -m pytest tests/preflight -q    # 15 passed
```

See the repository README for the full pipeline (contracts → CAD → plugin → browser → export).
