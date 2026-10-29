"""Build the public DSH plugin ZIP using only the explicit distribution files."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

FILES = ("LICENSE", "README.md", "cordis.patch.yml", "identity.mjs", "index.js", "package.json", "status.mjs")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    source = Path(__file__).resolve().parents[1] / "dsh"
    manifest = json.loads((source / "package.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?", version):
        raise ValueError("Invalid package version")
    if manifest.get("scripts"):
        raise ValueError("This distribution must not require installation scripts")
    files = [(name, (source / name).read_bytes()) for name in FILES]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    target = args.output_dir / f"dafeiyu-dsh-{version}.zip"
    if target.exists() or (args.output_dir / "SHA256SUMS").exists():
        raise FileExistsError("Use a fresh output directory to preserve prior release evidence")
    with ZipFile(target, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, content in files:
            entry = ZipInfo(f"dafeiyu-dsh/{name}", date_time=(2026, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = (0o100755 if name == "status.mjs" else 0o100644) << 16
            entry.compress_type = ZIP_DEFLATED
            archive.writestr(entry, content, compresslevel=9)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    (args.output_dir / "SHA256SUMS").write_text(f"{digest}  {target.name}\n", encoding="ascii")
    print(json.dumps({"package": str(target), "sha256": digest, "files": list(FILES)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
