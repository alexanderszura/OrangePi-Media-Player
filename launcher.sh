#!/usr/bin/env bash
set -u

PIGEON_HOME="${PIGEON_HOME:-/opt/pigeon}"
PIGEON_APP="${PIGEON_APP:-/usr/bin/pigeon}"
RETROARCH_APP="${RETROARCH_APP:-/usr/bin/retroarch}"

EXIT_NORMAL=0
EXIT_RETROARCH=10
EXIT_RESTART=20

log() {
  printf '%s %s\n' "$(date -Is)" "$*" >> "${PIGEON_HOME}/launcher.log"
}

apply_launcher_update() {
  local staged="${PIGEON_HOME}/launcher.new"
  local target="${PIGEON_HOME}/launcher.sh"

  if [[ ! -f "${staged}" ]]; then
    return
  fi

  chmod +x "${staged}"
  mv "${staged}" "${target}"
  log "Applied staged launcher update"
}

mkdir -p "${PIGEON_HOME}"

while true; do
  apply_launcher_update

  "${PIGEON_APP}"
  status=$?

  case "${status}" in
    "${EXIT_NORMAL}")
      log "Pigeon exited normally"
      sleep 1
      ;;
    "${EXIT_RETROARCH}")
      log "Starting RetroArch"
      "${RETROARCH_APP}"
      ;;
    "${EXIT_RESTART}")
      log "Restart requested"
      ;;
    *)
      log "Pigeon exited with status ${status}; restarting shortly"
      sleep 1
      ;;
  esac
done
