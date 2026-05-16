/**
 * Fliper - Input Hooking & Cocktail Mode Isolation
 * Language: Rust (Windows API)
 */
use std::ptr::null_mut;
use winapi::um::winuser::{
    SetWindowsHookExW, UnhookWindowsHookEx, CallNextHookEx, 
    WH_KEYBOARD_LL, KBDLLHOOKSTRUCT, WM_KEYDOWN, WM_SYSKEYDOWN,
    VK_LWIN, VK_RWIN, VK_ESCAPE, VK_TAB, VK_CONTROL, VK_MENU, VK_DELETE
};
use crate::ai_manager::{AI_CORE, ResourcePriority};

/// ID do Hook Global
static mut HOOK_ID: winapi::shared::windef::HHOOK = null_mut();

/// Callback Intrusivo: Intercepta chamadas de teclado em baixo nível
/// O objetivo é bloquear Alt+Tab, WinKey, Ctrl+Esc, Ctrl+Alt+Del e Alt+F4
unsafe extern "system" fn low_level_keyboard_proc(code: i32, wparam: usize, lparam: isize) -> isize {
    if code >= 0 {
        let kb_struct = *(lparam as *const KBDLLHOOKSTRUCT);
        let key = kb_struct.vkCode as i32;
        
        let is_key_down = wparam as u32 == WM_KEYDOWN || wparam as u32 == WM_SYSKEYDOWN;

        if is_key_down {
            let alt_pressed = (winapi::um::winuser::GetAsyncKeyState(VK_MENU) as i16) < 0;
            let ctrl_pressed = (winapi::um::winuser::GetAsyncKeyState(VK_CONTROL) as i16) < 0;

            let mut blocked = false;

            // Bloquear Tecla Windows
            if key == VK_LWIN || key == VK_RWIN { blocked = true; }
            // Bloquear Alt+Tab
            if alt_pressed && key == VK_TAB { blocked = true; }
            // Bloquear Alt+F4
            if alt_pressed && key == winapi::um::winuser::VK_F4 { blocked = true; }
            // Bloquear Ctrl+Esc
            if ctrl_pressed && key == VK_ESCAPE { blocked = true; }
            
            if blocked {
                if let Ok(core_ai) = AI_CORE.lock() {
                    core_ai.trigger_skill("SHELL_ESCAPE_ATTEMPT", "Teclas Restritas");
                }
                return 1;
            }
            
            // Nota: Ctrl+Alt+Del é gerenciado via GPO/Registry (DisableTaskMgr),
            // pois o kernel do Windows não permite hook de C+A+D diretamente pelo Ring 3.
        }
    }
    
    // Deixa as outras teclas passarem (ex: inputs pro jogo)
    CallNextHookEx(HOOK_ID, code, wparam, lparam)
}

/// Instala o Hook global. Chamado ao Entrar no Modo Arcade.
pub fn install_arcade_hook() {
    unsafe {
        if HOOK_ID.is_null() {
            HOOK_ID = SetWindowsHookExW(
                WH_KEYBOARD_LL, 
                Some(low_level_keyboard_proc), 
                null_mut(), 
                0
            );
            println!("Arcade Input Hook Instalado. Usuário preso no sistema.");
        }
    }
}

/// Remove o Hook. Chamado ao sair via autenticação.
pub fn remove_arcade_hook() {
    unsafe {
        if !HOOK_ID.is_null() {
            UnhookWindowsHookEx(HOOK_ID);
            HOOK_ID = null_mut();
            println!("Arcade Input Hook Removido.");
        }
    }
}

/// Mutar notificações do Windows (Focus Assist / Do Not Disturb)
/// Em C#/Rust, isso envolve chamar a WNF (Windows Notification Facility) 
/// ou setar chaves de registro em tempo real.
pub fn enable_windows_dnd() {
    println!("Ativando 'Alarms Only' focus assist via RegKey ou Shell API.");
}
