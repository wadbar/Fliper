# Fluxograma Lógico: Smart_Import()

O mecanismo de importação universal do Fliper funciona em etapas de pipeline (Pipeline Pattern). Como possuímos 64GB de RAM, podemos paralelizar as etapas em dezenas de threads sem gargalos de memória.

```mermaid
graph TD
    A[Início: Smart_Import Triggered] --> B{Tipo de Fonte?};
    B -- "Drag & Drop (ROM/ISO)" --> C[Hash Check & File Signature];
    B -- "Digital Stores (PC)" --> D[Scan Registry & Manifests];
    B -- "Emulator Auto-Detect" --> E[Scan %APPDATA% & Common Paths];

    %% Rota ROMs
    C --> F{Hash Encontrado no DB DB?};
    F -- Sim --> G[Copiar/Mover para Biblioteca];
    F -- Não (Genérico) --> H[Invocar IA_Enrichment];
    H --> G;
    
    %% Rota PC Games
    D --> I[Parse Steam VDF / Epic JSON];
    I --> J[Importar Mídia do SteamGridDB];
    J --> G;

    %% Rota Emulators
    E --> K[Parse .cfg / .ini / wsl.conf];
    K --> L[Mapeamento Direto no Config Central];

    %% Continuação Genérica
    G --> M[Compressão Asíncrona (CHD/RVZ) - Background];
    L --> N[Sincronizar SQLite em RAM];
    M --> N;
    
    N --> O[Baixar Assets Faltantes (Covers, Vídeos, BGM)];
    O --> P[Fim: Atualizar UI via WebSocket/Tauri Event];
```

## Etapas Detalhadas:
1. **Identificação Digital:** ROMs são checadas primeiro pelo Header/MD5, não pelo nome do arquivo. 
2. **IA Tagger:** Se o Hash não bater (ex: hack de tradução), a IA analisa o nome do arquivo, ex: `z3lda_ptbr_v2.z64` -> `The Legend of Zelda: Ocarina of Time`.
3. **Download Asíncrono:** Mídias pesadas (Vídeos de 50MB) entram numa fila e a interface renderiza "Placeholders" inteligentes enquanto isso.
