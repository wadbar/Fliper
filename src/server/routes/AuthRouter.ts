import { Router } from "express";
import { SecurityProvider, Role } from "../core/SecurityProvider";

const router = Router();

router.post("/", (req, res) => {
    // Development simplified auth for testing
    const { username, password } = req.body;
    if (username === "admin" && password === "admin") {
       res.json({ token: SecurityProvider.generateToken("admin_user", Role.ADMIN) });
    } else if (username === "kernel" && password === "kernel") {
       res.json({ token: SecurityProvider.generateToken("kernel_system", Role.KERNEL_SPACE) });
    } else {
       res.json({ token: SecurityProvider.generateToken("guest", Role.USER) });
    }
});

export { router as AuthRouter };
