"""Install reviewed portable CPU runtime files inside the ignored workspace."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys
import urllib.request
import zipfile
import zlib
from inspect_runtime_archive import RemoteArchive

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / '.tmp' / 'ai-runtime'
CLOUDFLARED_URL = 'https://github.com/cloudflare/cloudflared/releases/download/2026.10.5/cloudflared-windows-amd64.exe'
CLOUDFLARED_SHA256 = 'db4e4c413612a0916f3e1679d3caaf376f94911952d163028fb726fb2e0516a9'
CLOUDFLARED_BYTES = 55343328


def within_target(path):
    path.resolve().relative_to(TARGET.resolve())
    return path


def selected(info):
    parts = PurePosixPath(info.filename).parts
    return not info.is_dir() and (parts == ('ollama.exe',) or
        len(parts) == 3 and parts[:2] == ('lib', 'ollama') and
        re.fullmatch(r'[A-Za-z0-9_.+\-]+', parts[-1]) is not None)


def main():
    if sys.argv[1:] not in ([], ['--plan'], ['--install']):
        raise ValueError('Use --plan or --install; sources and destinations are pinned.')
    install = sys.argv[1:] == ['--install']
    TARGET.resolve().relative_to(ROOT.resolve())
    with zipfile.ZipFile(RemoteArchive()) as archive:
        files = [info for info in archive.infolist() if selected(info)]
        if not any(info.filename == 'ollama.exe' for info in files) or len(files) > 60:
            raise ValueError('Unexpected portable CPU source inventory.')
        if sum(info.compress_size for info in files) > 60 * 1024**2 or sum(info.file_size for info in files) > 120 * 1024**2:
            raise ValueError('Portable CPU files exceeded the reviewed size boundary.')
        if not install:
            print(json.dumps({'mode':'plan', 'ollama_version':'0.40.12', 'cpu_files':len(files),
                'cpu_compressed_bytes':sum(info.compress_size for info in files),
                'tunnel_bytes':CLOUDFLARED_BYTES, 'target':'.tmp/ai-runtime', 'system_install':False}))
            return
        TARGET.mkdir(parents=True, exist_ok=True)
        manifest = []
        for info in files:
            destination = within_target(TARGET / 'ollama' / info.filename)
            if destination.exists():
                data = destination.read_bytes()
                if len(data) != info.file_size or zlib.crc32(data) != info.CRC:
                    raise ValueError('Existing runtime differs; no existing file was replaced.')
            else:
                # Read in bounded chunks; ZipFile verifies CRC32 at end of member.
                with archive.open(info) as member:
                    data = b''.join(iter(lambda: member.read(1024 * 1024), b''))
                destination.parent.mkdir(parents=True, exist_ok=True)
                with destination.open('xb') as output:
                    output.write(data)
            manifest.append({'path':destination.relative_to(ROOT).as_posix(), 'bytes':len(data),
                             'sha256':hashlib.sha256(data).hexdigest(), 'zip_crc32_verified':True})
        tunnel_path = within_target(TARGET / 'cloudflared.exe')
        if tunnel_path.exists():
            data = tunnel_path.read_bytes()
        else:
            request = urllib.request.Request(CLOUDFLARED_URL, headers={'User-Agent':'ERPX-AI-runtime-setup'})
            with urllib.request.urlopen(request, timeout=90) as response:
                data = response.read(CLOUDFLARED_BYTES + 1)
            if len(data) != CLOUDFLARED_BYTES or hashlib.sha256(data).hexdigest() != CLOUDFLARED_SHA256:
                raise ValueError('Cloudflared release SHA-256 or size did not match.')
            with tunnel_path.open('xb') as output:
                output.write(data)
        if len(data) != CLOUDFLARED_BYTES or hashlib.sha256(data).hexdigest() != CLOUDFLARED_SHA256:
            raise ValueError('Existing cloudflared differs from reviewed release.')
        manifest.append({'path':tunnel_path.relative_to(ROOT).as_posix(), 'bytes':len(data),
                         'sha256':CLOUDFLARED_SHA256, 'published_sha256_verified':True})
        (TARGET / 'download-manifest.json').write_text(json.dumps({'ollama_version':'0.40.12',
            'source':'official GitHub HTTPS release; selected CPU files verified by ZIP CRC32; no whole-archive SHA-256 claim',
            'cloudflared_version':'2026.10.5', 'files':manifest}, indent=2), encoding='utf-8')
        print(json.dumps({'installed':True, 'cpu_files':len(files), 'cloudflared_sha256_verified':True,
                          'system_install':False, 'programs_started':False}))


if __name__ == '__main__':
    main()
