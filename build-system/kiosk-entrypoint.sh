#!/bin/bash
# Kiosk Entrypoint para FliperOS
# Inicia o servidor local e o navegador em modo fullscreen

echo "[FliperOS] Starting Backend Node.js Server..."
# Inicia o Express+Vite gerado pelo app
npm run start &
SERVER_PID=$!

# Aguarda o servidor subir
sleep 3

echo "[FliperOS] Launching Gamescope + Chromium in Kiosk Mode..."
# Inicia o Cage (Wayland Kiosk) dentro do Gamescope para máxima performance
# e abre o Chromium apontando para o localhost apontando para nossa interface React
gamescope -W 1920 -H 1080 -f -e -- cage -- chromium \
    --kiosk \
    --no-sandbox \
    --disable-infobars \
    --disable-dev-shm-usage \
    --app=http://localhost:3000 \
    --autoplay-policy=no-user-gesture-required

# Se o navegador fechar, encerra o servidor
kill $SERVER_PID
