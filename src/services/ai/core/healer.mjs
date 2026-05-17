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

        // Key Fixes: Replace unquoted keys and fix trailing commas
        let binaryFix = result
            .replace(/,\s*([}\]])/g, '$1') // Fix trailing commas
            .replace(/([{,]\s*)([a-zA-Z0-9_\u0080-\uffff]+)(\s*:)/g, '$1"$2"$3') // Quote unquoted keys (including unicode)
            .replace(/:\s*'([^']*)'/g, ': "$1"'); // Convert single quotes to double quotes for values

        try { return JSON.parse(binaryFix); } catch (e) {
            // Attempt to close open strings/quotes if JSON.parse still fails
            if (binaryFix.split('"').length % 2 === 0) {
                 binaryFix += '"';
            }
            const extraction = binaryFix.match(/\{.*\}/s) || binaryFix.match(/\[.*\]/s);
            if (extraction) return JSON.parse(extraction[0]);
            return null;
        }
    } catch (err) {
        return null;
    }
}
