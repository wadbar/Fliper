# shell_swap.ps1
# Script para Câmbio de Shell Seguro (Modo Cocktail Real / Self-Healing)

param(
    [switch]$EnableArcadeMode,
    [switch]$RestoreExplorer
)

$WinlogonKey = "HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
$PoliciesKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System"

if ($EnableArcadeMode) {
    Write-Host "Ativando Modo Cocktail e Isolamento..."
    
    # 1. Substitui Shell
    $FliperPath = "C:\Fliper\Fliper.exe"
    if (!(Test-Path $WinlogonKey)) { New-Item -Path $WinlogonKey -Force | Out-Null }
    Set-ItemProperty -Path $WinlogonKey -Name "Shell" -Value $FliperPath
    
    # 2. Desativa Gerenciador de Tarefas
    if (!(Test-Path $PoliciesKey)) { New-Item -Path $PoliciesKey -Force | Out-Null }
    Set-ItemProperty -Path $PoliciesKey -Name "DisableTaskMgr" -Value 1
    
    # 3. Desativa Sticky Keys (Teclas de Aderência)
    Set-ItemProperty -Path "HKCU:\Control Panel\Accessibility\StickyKeys" -Name "Flags" -Value "506"
    
    # 4. Silence Notifications (Focus Assist)
    # Requer invocação de WNF, mas em PowerShell habilitamos via DND no registro
    $QuietHours = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings"
    Set-ItemProperty -Path $QuietHours -Name "NOC_GLOBAL_SETTING_TOASTS_ENABLED" -Value 0 -ErrorAction SilentlyContinue
    
    Write-Host "Encerrando Explorer.exe..."
    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
}

if ($RestoreExplorer) {
    Write-Host "Acionando Self-Healing: Restaurando Windows..."
    
    Remove-ItemProperty -Path $WinlogonKey -Name "Shell" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $PoliciesKey -Name "DisableTaskMgr" -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKCU:\Control Panel\Accessibility\StickyKeys" -Name "Flags" -Value "510"
    
    $QuietHours = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings"
    Set-ItemProperty -Path $QuietHours -Name "NOC_GLOBAL_SETTING_TOASTS_ENABLED" -Value 1 -ErrorAction SilentlyContinue
    
    Start-Process "explorer.exe"
}
