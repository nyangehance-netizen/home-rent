#!/usr/bin/env bash
# Runs a build command. If it fails, the last lines of its output are posted as an
# error annotation so the reason shows on the GitHub Actions run page.
# Usage: scripts/ci-run.sh "Step name" command args...
name="$1"; shift
log="$(mktemp)"
"$@" 2>&1 | tee "$log"
code=${PIPESTATUS[0]}
if [ "$code" -ne 0 ]; then
  tail -n 60 "$log" | grep -v '^\s*$' | sed -e 's/%/%25/g' | awk 'BEGIN{ORS="%0A"}{print}' > "$log.tail"
  echo "::error title=${name} failed::$(cat "$log.tail")"
fi
exit "$code"
