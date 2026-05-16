# Arquitetura do FliperOS (Cocktail Arcade Edition)

O **FliperOS** não é apenas uma interface web; ele foi projetado para ser um **Sistema Operacional (OS) completo e instalável**, focado em performance extrema para emulação (Arcades, Naomi, NeoGeo, e Consoles), com suporte para gabinetes do tipo **Cocktail** e painéis duplos.

## 1. O Kernel (Coração do Sistema)

Nossa base é o **Arch Linux**, especificamente utilizando o kernel **6.8.zen1-1-zen**. 
Por que a versão ZEN do Arch Linux?
- **Baixa Latência (Low Latency):** O kernel Zen tem patches específicos para melhorar o tempo de resposta do escalonador (scheduler). Num Arcade, o delay entre o pressionar do botão e o soco no Street Fighter (Input Lag) deve ser mínimo. O kernel Zen garante isso.
- **Gestão de I/O Agressiva:** Jogos pesados (como imagens de CD antigas ou grandes dumps de Naomi) carregam mais rápido graças aos ajustes de leitura de disco do Zen.
- **Drivers de Fabrica:** Ele vem embutido com drivers de joysticks arcade nativos, incluindo controladoras USB de retardo zero (Zero Delay Encoders).

## 2. A Camada de Vídeo (Wayland + Gamescope)

Para dar a sensação legítima de um "Arcade", não rodamos a interface tradicional pesada (como GNOME ou KDE).
- **Sem X11 Convencional:** Rodamos diretamente no **Wayland** utilizando o compositing de jogos da Valve chamado **Gamescope**.
- **Kiosk Mode (Cage):** Ao ligar a máquina de Arcade, não aparece área de trabalho. O gerenciador de janelas "Cage" sobe imediatamente bloqueando a tela em Fullscreen (Kiosk Mode). A máquina boota direto no `FliperMode.tsx`, que é a nossa experiência 10ft UI operada 100% pelo Joystick.
- **Cocktail Mode:** A interface pode rotacionar a tela via hardware/software para gabinetes Cocktail de 2 a 4 lados, espelhando controles e tela dinamicamente sem usar ferramentas externas.

## 3. UI Dual (Fliper Mode vs Desktop Mode)

O sistema vive uma vida dupla para ser perfeito para os donos e para o público:
- **O Boot Nativo (Fliper Mode):**
  - **Experiência Console:** Assim que a energia liga, a tela acende no "Fliper Mode".
  - **Uso Exclusivo:** Aqui, não existe mouse ou teclado. Tudo é controlado pelo controle Arcade (D-Pad, A, B, X, Y, Start, Coin).
  - **Performance Máxima:** Ele bloqueia processos secundários para dar toda a CPU e GPU para os emuladores.
- **A Chave Secreta (Desktop Mode):**
  - O criador do Arcade (você) pode pressionar uma combinação de botões (ou espetar um pendrive de configuração) ou, na nossa Web Interface, apertar "B".
  - O sistema instantaneamente muda para o **Desktop Mode**.
  - Este Desktop Mode não é um Linux comum: É o nosso `DesktopMode.tsx` nativo rodando sobre o navegador Kiosk ou via Electron/Tauri. É um ambiente de "Janelas" rápido e minimalista para rodar o *Downloader de ISOs*, Terminal de Debug (Scanners), e o Gestor de Jogos, permitindo que você navegue como num PC usando um trackpad ou controle como mouse.

## 4. Totalmente Instalável (Geração de ISO)

- **Dockerfile.arch:** Nós provemos os manifests. Toda a infra para que a interface React vire um "Sistema Operacional" real está configurada.
- **Live USB:** Executando o build-system, ele empacota a base Arch, os emuladores MAME/RetroArch e a nossa interface React em uma **ISO Bootável**.
- **Como Falar O O.S:** Você espeta no Arcade, escolhe "Install to HDD", e em 10 minutos ele formata o disco em ext4/btrfs e define o FliperOS como boot primário EFI, pulando a BIOS para dar a impressão de uma placa Jamma de hardware original.

## 5. Integração Nativa com WSL2 (Windows Subsystem for Linux 2)

Embora o FliperOS seja uma ISO Linux instalável em hardware dedicado, somos 100% compatíveis com **WSL2** para permitir que os donos de Arcades rodem o sistema diretamente em cima de uma instalação Windows (por exemplo, um Arcade que precisa rodar jogos atuais da Steam no fundo):

- **Zero-Config Wayland via WSLg:** Com o WSLg no Windows 11, o Gamescope e o Cage do FliperOS conseguem rodar e se projetar perfeitamente sem precisar instalar um Servidor X (Xming/VcXsrv) no Windows.
- **Bridge com o LaunchBox (Host):** Como o WSL2 monta nativamente a partição do Windows em `/mnt/c/`, o nosso backend Node.js lê os XMLs do LaunchBox instalados no Windows hospedando tudo perfeitamente.
- **Direct3D12 GPU Acceleration:** Através das bibliotecas Mesa compiladas (dzn), o sistema utiliza a aceleração de hardware nativa da placa de vídeo do host Windows, fornecendo os 60/120 FPS cravados como se estivesse no Bare-metal!

## Resumo da Magia
O FliperOS engana o usuário.  
Para o jogador, parece hardware proprietário de 1995 de alta fidelidade e tempo de carregamento inexistente.  
Para você, desenvolvedor/owner, é um Arch Linux turbinado, gerenciável via React 18 / Tailwind / Vite, com capacidade de gerir o LaunchBox e baixar ROMs magicamente usando IA.
