import { logger } from "./Logger";
import { queueManager } from "./QueueManager";
import { KernelProxy } from "./KernelProxy";
import { KeyManager } from "./KeyManager";
import { BuildObserver } from "./BuildObserver";
import { SystemIntegritySuite } from "./SystemIntegritySuite";

export interface DistroRecipe {
    id: string;
    base: 'arch' | 'debian' | 'alpine' | 'universal-hybrid';
    kernel: 'zen' | 'hardened' | 'lts' | 'realtime' | 'adaptive-multikernel';
    desktop: 'fliper-shell' | 'minimal' | 'plasma' | 'fluid-dynamic';
    arch: 'x86_64' | 'i686' | 'aarch64' | 'armhf' | 'multi-arch-wrap';
    profile: 'adaptive' | 'legacy_lite' | 'extreme_workstation' | 'sovereign-universal';
    packages: string[];
    optimizeFor: 'handheld' | 'desktop' | 'arcade-cabinet' | 'mobile_phone' | 'universal';
}

/**
 * DISTRO FACTORY CORE
 * Orchestrates the creation of custom Linux images.
 */
export class DistroFactory {
    private static recipes = new Map<string, DistroRecipe>();

    public static PRESETS: Record<string, Partial<DistroRecipe>> = {
        'universal_sovereign': {
            base: 'universal-hybrid',
            kernel: 'adaptive-multikernel',
            desktop: 'fluid-dynamic',
            arch: 'multi-arch-wrap',
            profile: 'sovereign-universal',
            packages: ['fliper-core', 'auto-driver-detect', 'vulkan-layer-dynamic', 'legacy-accel-shim'],
            optimizeFor: 'universal'
        },
        'ultimate_handheld': {
            base: 'arch',
            kernel: 'zen',
            desktop: 'fliper-shell',
            packages: ['mesa', 'vulkan-radeon', 'gamescope', 'steam-native', 'retroarch'],
            optimizeFor: 'handheld'
        },
        'arcade_cabinet': {
            base: 'debian',
            kernel: 'lts',
            desktop: 'minimal',
            packages: ['mame', 'attract-mode', 'xorg-server', 'alsa-utils'],
            optimizeFor: 'arcade-cabinet'
        }
    };

    public static getRecommendation() {
        return {
            title: "FliperOS Ultimate (Recomendado)",
            reason: "Baseado em Arch Linux com Zen Kernel para latência zero. É a mesma base utilizada no hardware do Steam Deck.",
            recipe: this.PRESETS['ultimate_handheld']
        };
    }

    public static async initiateBuild(recipe: DistroRecipe) {
        // AI Tailoring Simulation: Probing environment for optimal flags
        const aiAnalysis = `KERNEL_TUNING: Applied ${recipe.profile} optimizations. Target [${recipe.arch}] detected. 
        Injecting custom hardware microcode for ${recipe.optimizeFor}.`;
        
        logger.info(`FliperOS_AI: ${aiAnalysis}`);

        // Circuit Breaker: Auditing System before accepting orders
        const audit = await SystemIntegritySuite.runSuite();
        if (audit.some(r => !r.passed)) {
             throw new Error("BUILD_SYSTEM_LOCKED: Integrity Suite detected critical failures.");
        }

        logger.info(`DistroFactory: Starting build sequence for [${recipe.id}]...`);
        
        const task = queueManager.addTask('distro_build', `OS_BUILD: ${recipe.id}`, { recipe });
        
        // Em um ambiente real, aqui invocaríamos 'mkarchiso' ou 'debootstrap' via KernelProxy
        // Para a nossa distro FliperOS, vamos orquestrar via QueueManager.
        return task;
    }

    public static getRecipes() {
        return Array.from(this.recipes.values());
    }
}
