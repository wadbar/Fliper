/**
 * NEURAL HEALER v5.0 (STATE-MACHINE PARSER)
 * Reconstructs even the most corrupted JSON signals.
 */
export function healJson(str) {
    if (!str || typeof str !== 'string') return null;
    
    try {
        // Step 1: Pre-clean
        let target = str.replace(/```json\s?|```/gi, '').trim();
        
        // Start Boundary
        const startIdx = target.search(/[\{\[]/);
        if (startIdx === -1) return null;
        target = target.substring(startIdx);

        try { return JSON.parse(target); } catch (e) {}

        // Step 2: Full State Reconstruction
        let result = "";
        let stack = [];
        let inString = false;
        let escaped = false;
        let quote = null;
        
        for (let i = 0; i < target.length; i++) {
            const char = target[i];
            
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                } else if (char === quote) {
                    inString = false;
                    quote = null;
                }
            } else {
                if (char === '"' || char === "'") {
                    inString = true;
                    quote = char;
                    result += '"'; // Normalize all to "
                    continue;
                } else if (char === '{') {
                    stack.push('}');
                } else if (char === '[') {
                    stack.push(']');
                } else if (char === '}' || char === ']') {
                    if (stack.length > 0 && stack[stack.length - 1] === char) {
                        stack.pop();
                    } else {
                        continue; // Skip mismatched
                    }
                }
            }
            
            result += char;

            // Termination Check
            if (!inString && stack.length === 0 && result.length > 2) {
                const last = result.trim().slice(-1);
                if (last === '}' || last === ']') break;
            }
        }

        // Repair dangling states
        if (inString) result += '"';
        while (stack.length > 0) result += stack.pop();

        // Key Fixes (ensure "key": value)
        let binaryFix = result.replace(/:\s*([^"\{\[0-9tfn][^,}\]]+)/g, (match, val) => {
            const t = val.trim();
            if (t.endsWith('}') || t.endsWith(']')) return match;
            return `: "${t.replace(/"/g, '\\"')}"`;
        });

        try { return JSON.parse(binaryFix); } catch (e) {
            const extraction = binaryFix.match(/\{.*\}/s) || binaryFix.match(/\[.*\]/s);
            if (extraction) return JSON.parse(extraction[0]);
            return null;
        }
    } catch (err) {
        return null;
    }
}
