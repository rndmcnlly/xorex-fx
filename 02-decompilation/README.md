# 02: Annotated decompilation

Implemented first inspection pass. Read [MECHANICS.md](MECHANICS.md) for the
annotated rules and [fidelity-report.json](fidelity-report.json) for byte checks.

## Reproduce

```sh
uv run --script 02-decompilation/decompile.py
```

Requires Java (uses the existing Homebrew OpenJDK here; otherwise set `JAVA`).
Downloads FFDec **26.4.0**, verifies its release SHA-256, exports readable code,
P-code and SVG shapes, and performs SWF → XML → SWF checks. Tool binaries and
full generated exports remain ignored. No global installs or original changes.
Download source: <https://github.com/jindrapetrik/jpexs-decompiler/releases/tag/version26.4.0>.

`recovered/` keeps only small game-specific unchanged exports for review.
`tag-manifest.json` fingerprints each original tag payload. `inspect.py` resolves
the omitted Haxe initializer; it is deliberately not a general AVM2 decoder.

## Fidelity policy

The XML roundtrip reproduces **every decompressed SWF byte**, including ABC
bytecode; compressed file bytes differ. This is not a source rebuild.
Do not maintain a byte-matching Haxe recompilation or historical Mochi toolchain:
Adam explicitly prefers a clean modern reconstruction to that maintenance cost.
The original and reproducible bytecode inspection remain the reference.

## Scope and remaining deliverables

- Reproducible commands/scripts with pinned tool versions and artifact checksums.
- Raw recovered code separate from human/agent annotations.
- Evidence about original language/toolchain: possibly Haxe, not necessarily
  handwritten ActionScript. Decompiler output syntax is not source provenance.
- An annotated mechanics specification: state, lane movement, inventory,
  conversion, charge, firing, color interactions, spawning, loss, scoring,
  input repeat, action ordering, and simulation timing.
- Small recorded/testable action traces usable as conformance fixtures.
- An inventory of external services and assets, separating gameplay from ads,
  analytics, platform APIs, sound, and visual presentation.

Input: immutable `../01-ruffle/Xorex.swf` and its recovered dependencies.
Do not overwrite the preservation reference. Distinguish measured facts from
inferences and unresolved questions. Keep downloaded decompiler binaries out of Git.
