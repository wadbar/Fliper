/**
 * TESTE DE VALIDAÇÃO DO MOTOR DE IA RESILIENTE (TDD)
 */
import { generate } from '../src/services/aiEngine.mjs';

async function runTest() {
    console.log('\n\x1b[35m=== INICIANDO PROTOCOLO DE TESTE AI-ENGINE ===\x1b[0m\n');

    const testParams = {
        prompt: 'Gere um relatório técnico curto sobre a saúde térmica de um cluster de servidores Linux fictício.',
        systemInstruction: 'Você deve responder como um Kernel Debugger Senior. Se solicitado JSON, forneça apenas o objeto.',
        responseType: 'json',
        temperature: 0.1
    };

    try {
        const result = await generate(testParams);
        
        console.log('\n\x1b[36m--- RESULTADO DA INFERÊNCIA ---\x1b[0m');
        console.log(JSON.stringify(result, null, 4));
        
        if (result.success) {
            console.log('\n\x1b[32m[TESTE:PASS] O pipeline reagiu conforme esperado.\x1b[0m');
        } else {
            console.log('\n\x1b[31m[TESTE:FAIL] O pipeline falhou em todos os níveis.\x1b[0m');
        }
    } catch (err) {
        console.error('\x1b[31m[CRITICAL_SYSTEM_ERROR]:\x1b[0m', err);
    }
}

runTest();
