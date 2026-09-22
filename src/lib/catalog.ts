import logitechBrio from "@/assets/products/logitech-brio.png";
import s25Ultra2 from "@/assets/products/s25-ultra-2.png";
import surfaceLaptopStudio from "@/assets/products/surface-laptop-studio.png";
import s25Ultra01 from "@/assets/products/real/s25-ultra-01.webp";
import s25Ultra02 from "@/assets/products/real/s25-ultra-02.webp";
import s25Ultra03 from "@/assets/products/real/s25-ultra-03.webp";
import s25Ultra04 from "@/assets/products/real/s25-ultra-04.webp";
import s25Ultra05 from "@/assets/products/real/s25-ultra-05.webp";
import surfaceLaptopGo301 from "@/assets/products/real/surface-laptop-go-3-01.jpeg";
import zFlip801 from "@/assets/products/real/z-flip-8-01.webp";
import zFold701 from "@/assets/products/real/z-fold-7-01.webp";
import zFold702 from "@/assets/products/real/z-fold-7-02.webp";
import zFold703 from "@/assets/products/real/z-fold-7-03.webp";
import zFold704 from "@/assets/products/real/z-fold-7-04.webp";
import zFold8Ultra01 from "@/assets/products/real/z-fold-8-ultra-01.webp";

export type CatalogPresentation = {
  condition: string;
  description: string;
  illustrative: boolean;
  photos: string[];
  price: number;
  specifications: string[];
};

const catalog: Record<string, CatalogPresentation> = {
  "z flip 8": {
    condition: "Novo, em caixa",
    description: "Um dobrável pensado para quem quer um telemóvel completo sem ocupar demasiado espaço no bolso. O Galaxy Z Flip8 abre para revelar um ecrã Dynamic AMOLED 2X de 6,9 polegadas com 120 Hz e mantém um ecrã exterior de 4,1 polegadas para consultar informação e usar funções rápidas sem abrir o equipamento.\n\nEsta unidade tem 256 GB de armazenamento, 12 GB de RAM e acabamento Mint. A câmara principal de 50 MP, acompanhada por uma ultra grande angular de 12 MP, permite fotografar e gravar com o telefone pousado em diferentes ângulos. A bateria de 4.300 mAh e o peso de apenas 180 g tornam-no especialmente interessante para utilização diária.\n\nEquipamento novo, apresentado na caixa original. Uma boa escolha para quem procura um smartphone premium diferente, compacto quando fechado e confortável para mensagens, redes sociais, fotografia e vídeo.",
    illustrative: false,
    photos: [zFlip801],
    price: 949,
    specifications: ["256 GB de armazenamento e 12 GB de RAM", "Ecrã principal Dynamic AMOLED 2X de 6,9 polegadas e 120 Hz", "Ecrã exterior Super AMOLED de 4,1 polegadas", "Câmaras traseiras de 50 MP + 12 MP", "Bateria de 4.300 mAh", "180 g", "Cor Mint", "Caixa original"],
  },
  "z fold 8 ultra": {
    condition: "Novo, em caixa",
    description: "O Galaxy Z Fold8 Ultra junta um smartphone de topo e um pequeno tablet no mesmo equipamento. Fechado, o ecrã exterior de 6,5 polegadas permite uma utilização normal; aberto, o painel Dynamic AMOLED 2X de 8 polegadas oferece muito mais espaço para trabalhar com várias aplicações, editar documentos, ver conteúdos ou jogar.\n\nEsta versão combina 12 GB de RAM com 256 GB de armazenamento. O sistema fotográfico inclui uma câmara principal de 200 MP, ultra grande angular de 50 MP e teleobjetiva de 10 MP com zoom ótico 3x. O processador Snapdragon 8 Elite Gen 5 for Galaxy foi concebido para desempenho de topo, multitarefa e funcionalidades de inteligência artificial.\n\nUnidade nova, na cor Shadow Violet, apresentada na caixa original. É uma opção especialmente forte para quem trabalha no telemóvel, valoriza um ecrã amplo e quer reduzir a necessidade de transportar um tablet separado.",
    illustrative: false,
    photos: [zFold8Ultra01],
    price: 1549,
    specifications: ["256 GB de armazenamento e 12 GB de RAM", "Ecrã interior Dynamic AMOLED 2X de 8 polegadas e 120 Hz", "Ecrã exterior de 6,5 polegadas e 120 Hz", "Câmaras traseiras de 200 MP + 50 MP + 10 MP", "Zoom ótico 3x", "Snapdragon 8 Elite Gen 5 for Galaxy", "215 g", "Cor Shadow Violet", "Caixa original"],
  },
  "z fold 7": {
    condition: "Muito bom",
    description: "Galaxy Z Fold7 5G para quem procura produtividade e entretenimento num único equipamento. O ecrã exterior funciona como num smartphone convencional e, quando aberto, o painel Dynamic AMOLED 2X de 8 polegadas oferece espaço para multitarefa, leitura, edição de documentos e consumo de conteúdos.\n\nA unidade disponível tem 12 GB de RAM, 256 GB de armazenamento e acabamento azul. O sistema fotográfico é liderado por uma câmara de 200 MP e a bateria tem 4.400 mAh. O equipamento apresenta-se em muito bom estado visual, tem menos de um ano e inclui caixa original, película protetora instalada e fatura. As quatro fotografias apresentadas são do artigo real.\n\nInformação importante: o telemóvel está bloqueado à operadora SFR de França. Não está confirmado como desbloqueado para redes portuguesas. O comprador deve validar a compatibilidade ou as condições de desbloqueio antes da compra; esta limitação já está refletida no preço.",
    illustrative: false,
    photos: [zFold701, zFold702, zFold703, zFold704],
    price: 849,
    specifications: ["256 GB de armazenamento e 12 GB de RAM", "Ecrã interior Dynamic AMOLED 2X de 8 polegadas e 120 Hz", "Ecrã exterior Dynamic AMOLED 2X de 6,5 polegadas", "Câmara principal de 200 MP", "Bateria de 4.400 mAh", "Cor azul", "Bloqueio de SIM à SFR França", "Caixa original, película protetora e fatura"],
  },
  "s25 ultra": {
    condition: "Muito bom",
    description: "Um topo de gama orientado para fotografia, produtividade e utilização exigente. O Galaxy S25 Ultra combina o processador Snapdragon 8 Elite for Galaxy com 12 GB de RAM e 256 GB de armazenamento, oferecendo margem para aplicações pesadas, multitarefa, jogos e edição de fotografia ou vídeo.\n\nO conjunto de câmaras é liderado por um sensor principal de 200 MP, acompanhado por uma ultra grande angular de 50 MP e duas teleobjetivas. A S Pen integrada permite escrever notas, assinar documentos, selecionar conteúdos e fazer ajustes com maior precisão. O acabamento Titanium Black mantém um aspeto discreto e profissional.\n\nEsta unidade encontra-se em muito bom estado, inclui caixa original e foi verificada antes da colocação à venda. As cinco fotografias apresentadas são do artigo real e mostram o equipamento, o ecrã, a traseira e a S Pen.",
    illustrative: false,
    photos: [s25Ultra01, s25Ultra02, s25Ultra03, s25Ultra04, s25Ultra05],
    price: 699,
    specifications: ["256 GB de armazenamento e 12 GB de RAM", "Snapdragon 8 Elite for Galaxy", "Câmara principal de 200 MP", "Ultra grande angular de 50 MP", "Sistema de teleobjetivas com zoom ótico", "S Pen integrada", "Cor Titanium Black", "Caixa original"],
  },
  "s25 ultra 2": {
    condition: "Disponibilidade a confirmar",
    description: "Segunda unidade Galaxy S25 Ultra registada no inventário. Este modelo é especialmente indicado para quem procura uma câmara versátil, S Pen integrada e desempenho de topo para trabalho, fotografia, vídeo e utilização diária intensiva.\n\nEsta unidade ainda está em verificação operacional. A configuração exata, o estado estético, os acessórios incluídos, a garantia e a disponibilidade final não serão apresentados como confirmados até a inspeção estar concluída. A imagem atual é apenas ilustrativa.\n\nÉ possível manifestar interesse, mas a venda só avançará depois de existirem fotografias reais e uma descrição completa do artigo específico.",
    illustrative: true,
    photos: [s25Ultra2],
    price: 0,
    specifications: ["Modelo Galaxy S25 Ultra", "Configuração e estado final a confirmar"],
  },
  "logitech brio": {
    condition: "Usado, verificado",
    description: "Webcam premium para melhorar de forma imediata a qualidade de reuniões, aulas, entrevistas e transmissões. A Logitech Brio grava até 4K a 30 fps, 1080p a 60 fps ou 720p a 90 fps, permitindo escolher entre máxima definição e maior fluidez conforme a aplicação utilizada.\n\nO sensor de 13 MP inclui focagem automática, correção de luz RightLight 3 e campo de visão ajustável entre 65°, 78° e 90°. Os dois microfones omnidirecionais com redução de ruído ajudam a manter a voz mais clara, enquanto a ligação por USB facilita a utilização em computadores de trabalho ou pessoais.\n\nO equipamento está registado como usado e verificado. A fotografia atual é ilustrativa; serão acrescentadas imagens reais da webcam e dos acessórios incluídos antes da entrega.",
    illustrative: true,
    photos: [logitechBrio],
    price: 129,
    specifications: ["4K a 30 fps, 1080p a 60 fps e 720p a 90 fps", "Sensor de 13 MP", "Focagem automática", "Campo de visão de 65°, 78° ou 90°", "Zoom digital até 5x", "Correção de luz RightLight 3", "Dois microfones omnidirecionais com redução de ruído", "Ligação USB-A ou USB-C consoante o cabo"],
  },
  "surface laptop go 3": {
    condition: "Usado, verificado",
    description: "Portátil compacto para trabalho, estudo e mobilidade. Com apenas cerca de 1,13 kg, o Surface Laptop Go 3 é fácil de transportar e mantém um teclado de tamanho completo, um touchpad preciso e um ecrã tátil PixelSense de 12,4 polegadas com formato 3:2, particularmente cómodo para documentos e navegação.\n\nA plataforma utiliza um processador Intel Core i5-1235U de 12.ª geração e disponibiliza ligações USB-C, USB-A, ficha de áudio de 3,5 mm e Surface Connect. A câmara frontal HD, os microfones Studio e os altifalantes Omnisonic tornam-no adequado para videochamadas e trabalho remoto.\n\nEsta unidade de 2023 foi testada e arranca e carrega normalmente. O relatório de bateria indica aproximadamente 86% da capacidade de origem — cerca de 34,1 Wh face aos 39,7 Wh de fábrica. A fotografia apresentada é do artigo real.",
    illustrative: false,
    photos: [surfaceLaptopGo301],
    price: 349,
    specifications: ["Intel Core i5-1235U de 12.ª geração", "Ecrã tátil PixelSense de 12,4 polegadas, resolução 1536 × 1024", "Peso aproximado de 1,13 kg", "USB-C, USB-A, áudio 3,5 mm e Surface Connect", "Câmara frontal HD e microfones Studio", "Bateria testada com aproximadamente 86% da capacidade original", "Windows instalado", "Ano 2023"],
  },
  "surface laptop studio": {
    condition: "Detalhes a confirmar",
    description: "Surface Laptop Studio registado no inventário e destinado a utilizadores que valorizam um portátil versátil para produtividade e criação. O formato desta gama permite alternar entre utilização tradicional como portátil, uma posição intermédia para apresentações e multimédia, e uma posição próxima de tablet para escrita ou desenho.\n\nA unidade específica ainda não tem configuração e estado final confirmados. Antes da venda serão registados o processador, a memória, o armazenamento, a placa gráfica, o estado da bateria, o teclado, o ecrã, os acessórios e qualquer marca de uso relevante.\n\nA imagem atual é ilustrativa. O preço e a publicação completa só serão definidos depois da inspeção e da inclusão de fotografias reais do equipamento.",
    illustrative: true,
    photos: [surfaceLaptopStudio],
    price: 0,
    specifications: ["Modelo Surface Laptop Studio", "Configuração e estado final a confirmar"],
  },
};

const emptyPresentation: CatalogPresentation = {
  condition: "Verificado",
  description: "Equipamento disponível e verificado. Contacta-nos para receber todos os detalhes antes da compra.",
  illustrative: true,
  photos: [],
  price: 0,
  specifications: [],
};

export function getCatalogPresentation(title: string): CatalogPresentation {
  return catalog[title.trim().toLowerCase()] ?? emptyPresentation;
}
