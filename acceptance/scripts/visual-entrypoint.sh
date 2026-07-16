#!/bin/sh
set -eu

mkdir -p "$HOME" /app/.obsidian-cache /app/acceptance/artifacts

Xvfb "$DISPLAY" -screen 0 1030x824x24 -nolisten tcp -ac >/tmp/tasks-eye-xvfb.log 2>&1 &

attempt=0
until xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 50 ]; then
    echo "Xvfb did not become ready" >&2
    exit 1
  fi
  sleep 0.1
done

herbstluftwm >/tmp/tasks-eye-window-manager.log 2>&1 &
xdotool mousemove --sync 1029 823

exec dbus-run-session -- "$@"
