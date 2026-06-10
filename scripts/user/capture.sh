#!/bin/bash
# capture.sh — Capture card viewer


# Autodetect capture node (first /dev/video* that reports MJPG)
DEVICE=""
for dev in /dev/video*; do
    v4l2-ctl -d "$dev" --list-formats-ext 2>/dev/null | grep -q 'MJPG' && DEVICE="$dev" && break
done

if [[ -z "$DEVICE" ]]; then
    echo "[iuno] capture: no MJPG capture device found" >&2
    exit 1
fi

echo "[iuno] capture: using $DEVICE"

pw-loopback \
  --capture-props='target.object=alsa_input.usb-MACROSILICON_USB3_Video_20210623-02.analog-stereo audio.position=[ FL FR ]' \
  --playback-props='target.object=combined_sink audio.position=[ FL FR ]' &
PW_PID=$!

trap "kill $PW_PID" EXIT

mpv av://v4l2://"$DEVICE" \
  --demuxer-lavf-o=input_format=mjpeg,video_size=1920x1080,framerate=144 \
  --no-audio \
  --fullscreen \
  --no-cache \
  --profile=low-latency \
  --untimed
