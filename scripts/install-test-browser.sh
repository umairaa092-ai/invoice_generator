#!/usr/bin/env bash
# Linux x86-64 developer/cloud testing helper. Buyers do not run this script.
# Downloads the official Google Chrome stable package and unpacks it under /tmp.
# Does not install OS packages, modify managed policies, or start a browser.
set -euo pipefail

if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
  printf '%s\n' 'This helper requires Linux x86-64.' >&2
  exit 1
fi
for prerequisite in curl gpg python3 dpkg-deb realpath; do
  if ! command -v "$prerequisite" >/dev/null 2>&1; then
    printf 'Missing required developer tool: %s\n' "$prerequisite" >&2
    exit 1
  fi
done

test_browser_root=$(realpath -m "${CELLSPRAY_TEST_BROWSER_ROOT:-/tmp/cellspray-test-browser}")
case "$test_browser_root" in
  /tmp/*) ;;
  *) printf '%s\n' 'The test browser cache must be a directory under /tmp.' >&2; exit 1 ;;
esac
mkdir -p "$test_browser_root/gnupg"
chmod 700 "$test_browser_root/gnupg"

vendor_repository='https://dl.google.com/linux/chrome/deb'
vendor_key='https://dl.google.com/linux/linux_signing_key.pub'
# Google Inc. Linux Packages Signing Authority primary-key fingerprint.
expected_fingerprint='EB4C1BFD4F042F6DDDCCEC917721F63BD38B4796'
curl --fail --location --silent --show-error --max-time 60 "$vendor_key" -o "$test_browser_root/signing-key.pub"
actual_fingerprint=$(gpg --homedir "$test_browser_root/gnupg" --batch --show-keys --with-colons "$test_browser_root/signing-key.pub" | python3 -c 'import sys; print(next(line.split(":")[9] for line in sys.stdin if line.startswith("fpr:")))')
if [[ "$actual_fingerprint" != "$expected_fingerprint" ]]; then
  printf '%s\n' 'Google signing key fingerprint changed. Verify the vendor key before updating this helper.' >&2
  exit 1
fi
gpg --homedir "$test_browser_root/gnupg" --batch --import "$test_browser_root/signing-key.pub"
curl --fail --location --silent --show-error --max-time 60 "$vendor_repository/dists/stable/Release" -o "$test_browser_root/Release"
curl --fail --location --silent --show-error --max-time 60 "$vendor_repository/dists/stable/Release.gpg" -o "$test_browser_root/Release.gpg"
gpg --homedir "$test_browser_root/gnupg" --batch --verify "$test_browser_root/Release.gpg" "$test_browser_root/Release"
curl --fail --location --silent --show-error --max-time 60 "$vendor_repository/dists/stable/main/binary-amd64/Packages.gz" -o "$test_browser_root/Packages.gz"

python3 - "$test_browser_root" <<'PY'
import gzip, hashlib, json, pathlib, re, sys

root = pathlib.Path(sys.argv[1])
release = (root / 'Release').read_text()
match = re.search(r'^SHA256:\n((?: [^\n]+\n)+)', release, flags=re.MULTILINE)
if not match:
    raise SystemExit('Signed release metadata contains no SHA256 index hashes.')
entries = [line.split() for line in match.group(1).splitlines()]
entry = next((entry for entry in entries if len(entry) == 3 and entry[2] == 'main/binary-amd64/Packages.gz'), None)
if entry is None:
    raise SystemExit('Signed release metadata does not describe the package index.')
index = (root / 'Packages.gz').read_bytes()
if len(index) != int(entry[1]) or hashlib.sha256(index).hexdigest() != entry[0]:
    raise SystemExit('Package index does not match the signed release SHA256 and size.')
blocks = gzip.decompress(index).decode().split('\n\n')
block = next((block for block in blocks if block.startswith('Package: google-chrome-stable\n')), None)
if block is None:
    raise SystemExit('Official index contains no Google Chrome stable package.')
metadata = dict(line.split(': ', 1) for line in block.splitlines() if ': ' in line and not line.startswith(' '))
filename = metadata.get('Filename', '')
if not re.fullmatch(r'pool/main/g/google-chrome-stable/google-chrome-stable_[A-Za-z0-9.+~:-]+_amd64\.deb', filename):
    raise SystemExit('Unexpected vendor package filename.')
if not re.fullmatch(r'[a-f0-9]{64}', metadata.get('SHA256', '')) or not metadata.get('Size', '').isdigit():
    raise SystemExit('Official index contains invalid package verification metadata.')
selected = {key: metadata[key] for key in ['Package', 'Version', 'Filename', 'SHA256', 'Size']}
(root / 'package-meta.json').write_text(json.dumps(selected))
(root / 'package-url.txt').write_text('https://dl.google.com/linux/chrome/deb/' + filename)
print('Verified signed vendor metadata for Google Chrome ' + metadata['Version'])
PY

verify_package() {
  python3 - "$test_browser_root/package-meta.json" "$1" <<'PY'
import hashlib, json, pathlib, sys

metadata = json.loads(pathlib.Path(sys.argv[1]).read_text())
artifact = pathlib.Path(sys.argv[2])
if not artifact.is_file() or artifact.stat().st_size != int(metadata['Size']):
    raise SystemExit(1)
digest = hashlib.sha256()
with artifact.open('rb') as stream:
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(chunk)
if digest.hexdigest() != metadata['SHA256']:
    raise SystemExit(1)
PY
}

if verify_package "$test_browser_root/chrome.deb"; then
  printf '%s\n' 'Reusing package with verified SHA256 and size.'
else
  package_url=$(cat "$test_browser_root/package-url.txt")
  curl --fail --location --silent --show-error --max-time 300 "$package_url" -o "$test_browser_root/chrome.deb.download"
  if ! verify_package "$test_browser_root/chrome.deb.download"; then
    printf '%s\n' 'Downloaded package does not match the signed vendor SHA256 and size. Nothing was installed.' >&2
    exit 1
  fi
  mv "$test_browser_root/chrome.deb.download" "$test_browser_root/chrome.deb"
fi

# Extract into a fresh directory only after complete signature/checksum verification.
# Leave previous verified versions available; no package maintainer scripts execute.
test_browser_unpack=$(mktemp -d "$test_browser_root/unpacked.XXXXXX")
dpkg-deb -x "$test_browser_root/chrome.deb" "$test_browser_unpack"
test_browser_binary="$test_browser_unpack/opt/google/chrome/chrome"
"$test_browser_binary" --version
printf '%s\n' "$test_browser_binary" > "$test_browser_root/executable-path.txt"
printf 'Verified test browser: %s\n' "$test_browser_binary"
printf '%s\n' 'Use CHROMIUM_PATH for isolated developer test contexts. Buyer files require no browser installer.'
