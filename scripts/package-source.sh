#!/usr/bin/env bash
# Builds the source package for submission (backlog REL-01, SUB-01; ci-and-environments.md §7).
#
#   scripts/package-source.sh <release-ref> <team-folder-name> <output-dir-outside-the-repo>
#   e.g. scripts/package-source.sh v1.0-judging CEDA-Portal-Team ~/submission
#
# - Packs exactly the committed files of <release-ref> (git archive), so .env, node_modules, dist,
#   test output and local backups can never be included, whatever is on disk.
# - Refuses to finish if the archive holds anything that looks like a secret or personal document,
#   or if the third-party licence list is out of date for that commit.
# - Checks the 150 MB limit and prints the size, the commit and the SHA-256 for the run record.
set -euo pipefail

ref="${1:-}"; team="${2:-}"; out="${3:-}"
if [ -z "$ref" ] || [ -z "$team" ] || [ -z "$out" ]; then
  echo "usage: scripts/package-source.sh <release-ref> <team-folder-name> <output-dir-outside-the-repo>" >&2
  exit 2
fi
root="$(git rev-parse --show-toplevel)"
cd "$root"
commit="$(git rev-parse --verify "${ref}^{commit}")"
mkdir -p "$out"
out="$(cd "$out" && pwd)"
case "$out/" in "$root"/*) echo "Write the package outside the repository." >&2; exit 2 ;; esac
if [[ ! "$team" =~ ^[A-Za-z0-9._-]+$ ]]; then echo "Team folder name: letters, digits, dot, dash and underscore only." >&2; exit 2; fi

limit=$((150 * 1024 * 1024))
zip="$out/${team}-source-${commit:0:7}.zip"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# 1. Files that must never be in the package (checked on the commit's file list).
files="$(git ls-tree -r --name-only "$commit")"
bad="$(printf '%s\n' "$files" | grep -Ei '(^|/)\.env($|\.)|\.pem$|\.key$|\.p12$|\.pfx$|(^|/)backup-.*\.sql$|(^|/)id_(rsa|ed25519)|\.(sqlite|dump)$|(^|/)(cv|passport|id[-_ ]?copy|certificate)[^/]*\.(pdf|docx?|jpe?g|png)$' | grep -v '^\.env\.example$' || true)"
if [ -n "$bad" ]; then
  echo "These files must not be in the source package:" >&2; printf '  %s\n' $bad >&2; exit 1
fi

# 2. The licence list must match that commit's lockfiles.
git archive "$commit" | tar -x -C "$work"
( cd "$work" && node scripts/third-party-licences.mjs --check )

# 3. Build the package, all files under one folder named after the team.
rm -f "$zip"
git archive --format=zip --prefix="${team}/source/" -o "$zip" "$commit"
size=$(wc -c < "$zip")
if [ "$size" -gt "$limit" ]; then
  echo "Package is $((size / 1024 / 1024)) MB, over the 150 MB limit." >&2; exit 1
fi

sha=$(sha256sum "$zip" | cut -d' ' -f1)
echo "package  $zip"
echo "commit   $commit ($ref)"
echo "files    $(printf '%s\n' "$files" | wc -l)"
echo "size     $((size / 1024)) KB (limit 150 MB)"
echo "sha256   $sha"
