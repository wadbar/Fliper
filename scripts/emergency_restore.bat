@echo off
:: Fliper - Script de Emergencia para Windows
echo Realizando Self-Healing do ambiente Desktop...

:: Restaura Shell
REG DELETE "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Winlogon" /v Shell /f >nul 2>&1

:: Devolve o Gerenciador de Tarefas
REG DELETE "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /f >nul 2>&1

:: Restaura Sticky Keys para padrao
REG ADD "HKCU\Control Panel\Accessibility\StickyKeys" /v Flags /t REG_SZ /d 510 /f >nul 2>&1

:: Permite Notificacoes Novamente
REG ADD "HKCU\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings" /v NOC_GLOBAL_SETTING_TOASTS_ENABLED /t REG_DWORD /d 1 /f >nul 2>&1

echo Ambientes Restaurados. Iniciando o Windows Explorer...
start explorer.exe

echo Recuperacao concluida. Pode fechar esta jenela.
pause
