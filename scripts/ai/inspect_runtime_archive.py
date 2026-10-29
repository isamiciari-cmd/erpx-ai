"""Read the official portable archive index with bounded HTTPS byte ranges."""
import io
import json
import urllib.request
import zipfile

URL = 'https://github.com/ollama/ollama/releases/download/v0.40.12/ollama-windows-amd64.zip'
SIZE = 1601458136


class RemoteArchive(io.RawIOBase):
    def __init__(self):
        self.position = 0
        self.cache_start = -1
        self.cache = b''

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.position

    def seek(self, offset, whence=0):
        self.position = offset if whence == 0 else self.position + offset if whence == 1 else SIZE + offset
        if not 0 <= self.position <= SIZE:
            raise ValueError('Archive seek outside reviewed size.')
        return self.position

    def read(self, count=-1):
        count = SIZE - self.position if count < 0 else min(count, SIZE - self.position)
        if count == 0: return b''
        if count > 8 * 1024 * 1024:
            raise ValueError('Archive read exceeds bounded request size.')
        if not (self.cache_start <= self.position and self.position + count <= self.cache_start + len(self.cache)):
            start = self.position
            end = min(SIZE - 1, start + max(count, 4 * 1024 * 1024) - 1)
            request = urllib.request.Request(URL, headers={'Range':f'bytes={start}-{end}', 'User-Agent':'ERPX-AI-runtime-setup'})
            with urllib.request.urlopen(request, timeout=60) as response:
                if response.status != 206 or response.headers.get('Content-Range') != f'bytes {start}-{end}/{SIZE}':
                    raise ValueError('Official archive host did not honor the bounded byte range.')
                data = response.read(end - start + 2)
                if len(data) != end - start + 1:
                    raise ValueError('Archive range length did not match.')
            self.cache_start, self.cache = start, data
        offset = self.position - self.cache_start
        data = self.cache[offset:offset + count]
        self.position += len(data)
        return data


if __name__ == '__main__':
    with zipfile.ZipFile(RemoteArchive()) as archive:
        print(json.dumps([{'name':item.filename, 'compressed_bytes':item.compress_size,
                           'bytes':item.file_size} for item in archive.infolist()], indent=2))
