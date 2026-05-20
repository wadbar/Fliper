import { useEffect, useCallback, useRef } from 'react';

/**
 * V9 UNIVERSAL GAMEPAD CONTROLLER
 * Maps physical gamepad inputs to browser events and custom callbacks.
 */
export function useGamepad(onAction?: (action: string) => void) {
  const requestRef = useRef<number | null>(null);
  const lastState = useRef<Record<number, boolean>>({});

  const checkGamepad = useCallback(() => {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; // Primary controller

    if (gp) {
      // Map SNES/Xbox/PS Layout
      const buttons = {
        A: gp.buttons[0].pressed, // South
        B: gp.buttons[1].pressed, // East
        X: gp.buttons[2].pressed, // West
        Y: gp.buttons[3].pressed, // North
        L: gp.buttons[4].pressed,
        R: gp.buttons[5].pressed,
        SELECT: gp.buttons[8].pressed,
        START: gp.buttons[9].pressed,
        UP: gp.buttons[12].pressed || gp.axes[1] < -0.5,
        DOWN: gp.buttons[13].pressed || gp.axes[1] > 0.5,
        LEFT: gp.buttons[14].pressed || gp.axes[0] < -0.5,
        RIGHT: gp.buttons[15].pressed || gp.axes[0] > 0.5,
      };

      // Pulse Detection (Trigger action only once per press)
      Object.entries(buttons).forEach(([key, pressed]) => {
        const id = key as keyof typeof buttons;
        if (pressed && !lastState.current[gp.index * 100 + Object.keys(buttons).indexOf(key)]) {
          onAction?.(key);
          
          // Emit synthetic keyboard events for menu navigation compatibility
          let keyCode = '';
          if (key === 'UP') keyCode = 'ArrowUp';
          if (key === 'DOWN') keyCode = 'ArrowDown';
          if (key === 'LEFT') keyCode = 'ArrowLeft';
          if (key === 'RIGHT') keyCode = 'ArrowRight';
          if (key === 'A' || key === 'START') keyCode = 'Enter';
          if (key === 'B' || key === 'SELECT') keyCode = 'Escape';

          if (keyCode) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: keyCode, bubbles: true }));
          }
        }
        lastState.current[gp.index * 100 + Object.keys(buttons).indexOf(key)] = pressed;
      });
    }

    requestRef.current = requestAnimationFrame(checkGamepad);
  }, [onAction]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(checkGamepad);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [checkGamepad]);
}
