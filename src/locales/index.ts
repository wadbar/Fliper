export const translations = {
    en: {
        IMPORT: "Import ROMs",
        MANAGE: "Manage Emulators",
        AUDIT: "Deep Audit",
        STATUS: "System: RTX 5060 Ready"
    },
    pt: {
        IMPORT: "Importar ROMs",
        MANAGE: "Gerenciar Emuladores",
        AUDIT: "Auditoria Pesada",
        STATUS: "Sistema: RTX 5060 Pronta"
    }
};

export const t = (key: keyof typeof translations['en'], lang: 'en' | 'pt') => translations[lang][key] || key;
