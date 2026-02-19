#!/usr/bin/env python3
import argparse
import hashlib
import tarfile
from datetime import datetime, timezone
from pathlib import Path


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def add_file_deterministic(tar: tarfile.TarFile, file_path: Path, arcname: str):
    data = file_path.read_bytes()
    info = tarfile.TarInfo(name=arcname)
    info.size = len(data)
    info.mtime = 0
    info.uid = 0
    info.gid = 0
    info.uname = "root"
    info.gname = "root"
    tar.addfile(info, fileobj=__import__("io").BytesIO(data))


def main():
    parser = argparse.ArgumentParser(description="Create deterministic, timestamped evidence bundle")
    parser.add_argument("--source", default="artifacts/latest", help="Evidence source directory")
    parser.add_argument("--out-dir", default="evidence/bundles", help="Output bundle directory")
    parser.add_argument("--timestamp", default=None, help="Override UTC timestamp (YYYYMMDD-HHMMSS)")
    args = parser.parse_args()

    src = Path(args.source)
    if not src.exists():
        raise SystemExit(f"Source does not exist: {src}")

    stamp = args.timestamp or datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    bundle_name = f"evidence-bundle-{stamp}.tar.gz"
    bundle_path = out_dir / bundle_name
    manifest_path = out_dir / f"evidence-bundle-{stamp}.manifest.txt"
    checksum_path = out_dir / f"evidence-bundle-{stamp}.sha256"

    files = sorted([p for p in src.rglob("*") if p.is_file()])
    if not files:
        raise SystemExit(f"No files found in source: {src}")

    with tarfile.open(bundle_path, "w:gz", format=tarfile.PAX_FORMAT) as tar:
        for f in files:
            arcname = str(Path("evidence") / f.relative_to(src))
            add_file_deterministic(tar, f, arcname)

    manifest_lines = [
        f"bundle_timestamp={stamp}",
        f"source={src}",
        "",
        "# included_files_sha256",
    ]
    for f in files:
        rel = f.relative_to(src)
        manifest_lines.append(f"{sha256_file(f)}  {rel}")
    manifest_path.write_text("\n".join(manifest_lines) + "\n")

    checksum_path.write_text(f"{sha256_file(bundle_path)}  {bundle_path.name}\n")

    print(f"Created bundle: {bundle_path}")
    print(f"Manifest: {manifest_path}")
    print(f"Checksum: {checksum_path}")


if __name__ == "__main__":
    main()
