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
    async inject() {
        await new Promise(r => setTimeout(r, 500));
        logger.info(`[DRIVER_SVC] ${this.name} injected successfully.`);
    }
}

export class NvidiaInjector implements IDriverInjector {
    name = "NVIDIA Proprietary";
    targetArch = ["x86_64"];
    canInject(gpu: string, arch: string) {
        return gpu === 'nvidia' && (this.targetArch.includes(arch) || arch === 'multi-arch-wrap');
    }
    async inject() {
        await new Promise(r => setTimeout(r, 800));
        logger.info(`[DRIVER_SVC] ${this.name} injected successfully.`);
    }
}

export class MaliInjector implements IDriverInjector {
    name = "ARM Mali (Panfrost)";
    targetArch = ["aarch64", "armhf"];
    canInject(gpu: string, arch: string) {
        return gpu === 'mali' && (this.targetArch.includes(arch) || arch === 'multi-arch-wrap');
    }
    async inject() {
        await new Promise(r => setTimeout(r, 600));
        logger.info(`[DRIVER_SVC] ${this.name} injected successfully.`);
    }
}

export class DriverRegistry {
    private static injectors: IDriverInjector[] = [new MesaInjector(), new NvidiaInjector(), new MaliInjector()];

    private static async detectGpu(): Promise<'mesa' | 'nvidia' | 'mali'> {
        try {
            const lspciOutput = await KernelProxy.execute("lspci");
            const normalized = lspciOutput.toLowerCase();
            if (normalized.includes("nvidia")) return "nvidia";
            if (normalized.includes("mali")) return "mali";
            return "mesa"; 
        } catch (e) {
            logger.warn("[DRIVER_SVC] GPU detection failed, defaulting to Mesa.");
            return "mesa";
        }
    }

    public static async runUniversalInjection(arch: string): Promise<string[]> {
        const injectedDrivers: string[] = [];
        logger.info(`[DRIVER_SVC] Initiating Universal Injection for ${arch}...`);
        const gpuType = await this.detectGpu();
        logger.info(`[DRIVER_SVC] Detected GPU: ${gpuType}`);

        for (const injector of this.injectors) {
            if (injector.canInject(gpuType, arch)) {
                await injector.inject();
                injectedDrivers.push(injector.name);
            } else {
                logger.info(`[DRIVER_SVC] Skipping ${injector.name} (Mismatch).`);
            }
        }
        return injectedDrivers;
    }
}