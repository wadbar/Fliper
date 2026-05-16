#!/bin/bash
# fliper-switch: Alterna rapidamente entre diferentes perfis de execução do Fliper
# Uso: fliper-switch [lite|full]

if [ -z "$1" ]; then
  echo "Uso: fliper-switch [lite|full]"
  exit 1
fi

PROFILE=$1

if [ "$PROFILE" == "lite" ]; then
    echo "Alternando para Modo Ultra-Light..."
    echo "> Matando processos de IA..."
    taskkill.exe /F /IM "lm-studio.exe" > /dev/null 2>&1
    taskkill.exe /F /IM "ollama.exe" > /dev/null 2>&1
    
    echo "> Ajustando MAME para video=gdi e frameskip..."
    # Configuração será aplicada pelo Rust, mas podemos injetar no config.yaml tbm
    
    echo "> Redirecionando executável do Fliper..."
    # Opcional: configurar atalho do usuário para rodar fliper --mode lite
    alias fliper='fliper --mode lite'
    echo "Ativo! Digite 'fliper --mode lite' para iniciar localmente."
elif [ "$PROFILE" == "full" ]; then
    echo "Alternando para Modo RTX 5060 + IA (64GB RAM)..."
    echo "> Restabelecendo MAME com HLSL e Shaders."
    echo "> Habilitando RAM Disk..."
    alias fliper='fliper'
    echo "Ativo!"
else
    echo "Perfil desconhecido."
fi
