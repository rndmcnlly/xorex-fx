# Public repository and Pages

- Repository: <https://github.com/rndmcnlly/xorex-fx>
- Prototype workbench: <https://rndmcnlly.github.io/xorex-fx/>

## Assets and Git LFS

Install Git LFS before cloning, or run `git lfs install` and `git lfs pull` after
cloning. Original SWF/audio, PDF/image/video/native Blender files, and retained
`generated/` experiment evidence are LFS-managed by `.gitattributes`. Small
source and readable design documents remain normal Git text. Original assets
have checksum/provenance records; see `RIGHTS.md` before reusing material.

Keep experimental artifacts without routinely deciding which screenshot is worth
saving. Installed tools, `.cache/`, virtual environments, browser profiles,
private material, `dist/`, and bulk `02-decompilation/generated/` tool output
stay excluded. The reviewed game-specific exports and byte-fidelity report are
retained; full third-party platform-library decompilation can be regenerated
locally rather than newly redistributed as source. LFS still has storage/bandwidth
quotas: it is not unlimited free storage. Repeated builds download LFS content;
public Pages visitors download deployed files, not LFS pointers.

## How Pages works with LFS

GitHub Pages cannot natively serve LFS pointer files. The custom Actions workflow
instead checks out **real LFS objects** with `lfs: true`, verifies original hashes,
runs portable tests, and invokes `tools/build_site.py`. That script rejects any
unresolved LFS pointer and assembles `dist/site/` from a runtime allowlist plus a
small gallery and the rules PDF. Native scenes and raw trial archives remain in
the repository, not in the deployed website.

The resolved site is uploaded with `upload-pages-artifact`, then deployed with
`deploy-pages`. Repository Pages settings use **GitHub Actions**, not a branch's
Jekyll build. Relative links/imports support the `/xorex-fx/` project-site prefix.
Third-party workflow actions are pinned to reviewed commit IDs.

References:
- <https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage>
- <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>

## Local publication checks

```sh
python3 check.py
python3 tools/build_site.py
```

Serve **`dist/site/`** to inspect exactly what will deploy, not the source checkout.
For a prefix-aware preview, serve `dist/` and use `/site/` in the browser. Check
the original, SVG, color/motion studies, live autoplay, planning Worker, rules PDF,
gallery, manual takeover, and keyboard focus. Static color support remains
hardware/browser-dependent and P3 SDR is not HDR.

Before first push, inspect the staged file inventory, run a redacted secret scan
and `git lfs fsck`, and confirm no credentials, private DAW files, downloaded tools,
or browser profiles are tracked. The initial local secret scanner is Gitleaks
8.30.1 downloaded into ignored `.cache/gitleaks/`, verified against release SHA-256
`b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5`.
Recheck source changes and traces produced after the initial scan. No project-wide
license is inferred from publication; `RIGHTS.md` records the current boundary.

Pushes to `main` run tests and deploy. Pull requests run the build without Pages
deployment. Avoid checking secrets into Git in the first place: LFS is not secret
storage and deleting a later pointer does not erase uploaded content.
