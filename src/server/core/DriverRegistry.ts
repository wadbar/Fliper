import { KernelProxy } from "./KernelProxy";
import { logger } from "./Logger";

export interface IDriverInjector {
    name: string;
    targetArch: string[];
    canInject(gpuType: string, arch: string): boolean;
    inject(): Promise<void>;
}

export class MesaInjector implements IDriverInjector {
    name = "Mesa (Gallium3D)";
    targetArch = ["x86_64", "i686", "aarch64"];
    canInject(gpu: string, arch: string) {
        return gpu === 'mesa' && (this.targetArch.includes(arch) || arch === 'multi-arch-wrap');
    }
    async inject(): Promise<void> {
        try {
            logger.info(`[DRIVER_SVC] Injecting core drivers for ${this.name}...`);
            await KernelProxy.execute("modprobe i915; modprobe amdgpu"); 
            logger.info(`[DRIVER_SVC] ${this.name} injected successfully into kernel memory.`);
        } catch (e: any) {
             logger.error(`[DRIVER_SVC_FAULT] ${this.name} injection failed: ${e.message}`);
        }
    }
}

export class NvidiaInjector implements IDriverInjector {
    name = "NVIDIA Proprietary";
    targetArch = ["x86_64"];
    canInject(gpu: string, arch: string) {
        return gpu === 'nvidia' && (this.targetArch.includes(arch) || arch === 'multi-arch-wrap');
    }
    async inject(): Promise<void> {
        try {
           logger.info(`[DRIVER_SVC] Injecting core drivers for ${this.name}...`);
           await KernelProxy.execute("modprobe nvidia; modprobe nvidia_modeset; modprobe nvidia_uvm; modprobe nvidia_drm");
           logger.info(`[DRIVER_SVC] ${this.name} injected successfully into kernel memory.`);
        } catch (e: any) {
            logger.error(`[DRIVER_SVC_FAULT] ${this.name} injection failed: ${e.message}`);
        }
    }
}

export class MaliInjector implements IDriverInjector {
    name = "ARM Mali (Panfrost)";
    targetArch = ["aarch64", "armhf"];
    canInject(gpu: string, arch: string) {
        return gpu === 'mali' && (this.targetArch.includes(arch) || arch === 'multi-arch-wrap');
    }
    async inject(): Promise<void> {
        try {
            logger.info(`[DRIVER_SVC] Injecting core drivers for ${this.name}...`);
            await KernelProxy.execute("modprobe panfrost");
            logger.info(`[DRIVER_SVC] ${this.name} injected successfully into kernel memory.`);
        } catch (e: any) {
            logger.error(`[DRIVER_SVC_FAULT] ${this.name} injection failed: ${e.message}`);
        }
    }
}

export class DriverRegistry {
    private static injectors: IDriverInjector[] = [new MesaInjector(), new NvidiaInjector(), new MaliInjector()];

    private static async detectGpu(): Promise<'mesa' | 'nvidia' | 'mali'> {
        try {
            // Real static hardware detection
            const lspciOutput = await KernelProxy.execute("lspci | grep -i vga");
            const normalized = lspciOutput.toLowerCase();
            
            if (normalized.includes("nvidia")) return "nvidia";
            if (normalized.includes("mali")) return "mali";
            return "mesa"; 
        } catch (e: any) {
            logger.warn(`[DRIVER_SVC] Hardware detection interrupted (${e.message}). Defaulting to universal MESA stack.`);
            return "mesa";
        }
    }

    public static async runUniversalInjection(arch: string): Promise<string[]> {
        const injectedDrivers: string[] = [];
        logger.info(`[DRIVER_SVC] Initiating hardware-bound Universal Injection for architecture: ${arch}`);
        
        try {
            const gpuType = await this.detectGpu();
            logger.info(`[DRIVER_SVC] Kernel detected GPU class: ${gpuType}`);

            for (const injector of this.injectors) {
                if (injector.canInject(gpuType, arch)) {
                    await injector.inject();
                    injectedDrivers.push(injector.name);
                } else {
                    logger.info(`[DRIVER_SVC] Skipping ${injector.name} (Architecture/GPU mismatch).`);
                }
            }
        } catch (globalErr: any) {
             logger.error(`[DRIVER_SVC_FATAL] Universal injection matrix failed: ${globalErr.message}`);
        }
        
        return injectedDrivers;
    }
}