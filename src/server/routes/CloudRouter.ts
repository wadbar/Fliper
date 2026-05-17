import { Router } from "express";
import { CloudStorageProvider } from "../core/CloudStorageProvider";
import { queueManager } from "../core/QueueManager";

const router = Router();

router.get("/files", async (req, res) => {
    try {
        const { prefix } = req.query;
        const files = await CloudStorageProvider.listFiles(prefix as string);
        res.json(files);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/sync", async (req, res) => {
    try {
        const { fileName } = req.body;
        if (!fileName) return res.status(400).json({ error: "Missing filename" });
        
        const task = queueManager.addTask('cloud_sync', fileName, { fileName });
        res.json({ status: "ok", task });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get("/link/:name", async (req, res) => {
    try {
        const key = `vault/${req.params.name}`;
        const url = await CloudStorageProvider.getDownloadUrl(key);
        if (!url) throw new Error("LINK_GEN_FAILED");
        res.json({ url });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export { router as CloudRouter };
