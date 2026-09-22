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
    description: "Samsung Galaxy Z Flip8 de 256 GB na cor Mint. Equipamento novo, apresentado na caixa original e sujeito à verificação final antes da entrega.",
    illustrative: false,
    photos: [zFlip801],
    price: 949,
    specifications: ["256 GB de armazenamento", "Cor Mint", "Formato dobrável", "Caixa original"],
  },
  "z fold 8 ultra": {
    condition: "Novo, em caixa",
    description: "Samsung Galaxy Z Fold8 Ultra de 256 GB na cor Shadow Violet. Equipamento novo, em caixa original, com formato dobrável pensado para produtividade e entretenimento.",
    illustrative: false,
    photos: [zFold8Ultra01],
    price: 1549,
    specifications: ["256 GB de armazenamento", "Cor Shadow Violet", "Ecrã dobrável", "Caixa original"],
  },
  "z fold 7": {
    condition: "Muito bom",
    description: "Samsung Galaxy Z Fold7 5G azul, com menos de um ano e em muito bom estado visual. Inclui caixa original, película protetora e fatura. Atenção: o equipamento tem bloqueio de SIM à operadora SFR de França; a compatibilidade ou o desbloqueio para redes portuguesas deve ser confirmado antes da compra.",
    illustrative: false,
    photos: [zFold701, zFold702, zFold703, zFold704],
    price: 849,
    specifications: ["256 GB de armazenamento", "12 GB de RAM", "Cor azul", "Ecrã dobrável", "Bloqueio de SIM à SFR França", "Caixa original e película protetora"],
  },
  "s25 ultra": {
    condition: "Muito bom",
    description: "Samsung Galaxy S25 Ultra de 256 GB em Titanium Black. Equipamento verificado, com S Pen integrada e caixa original. As fotografias apresentadas são do artigo disponível.",
    illustrative: false,
    photos: [s25Ultra01, s25Ultra02, s25Ultra03, s25Ultra04, s25Ultra05],
    price: 699,
    specifications: ["256 GB de armazenamento", "Cor Titanium Black", "S Pen integrada", "Caixa original"],
  },
  "s25 ultra 2": {
    condition: "Disponibilidade a confirmar",
    description: "Segundo Samsung Galaxy S25 Ultra registado no stock. O estado final, os acessórios e a disponibilidade estão a ser confirmados antes da publicação completa.",
    illustrative: true,
    photos: [s25Ultra2],
    price: 0,
    specifications: ["Modelo Galaxy S25 Ultra", "Configuração e estado final a confirmar"],
  },
  "logitech brio": {
    condition: "Usado, verificado",
    description: "Webcam Logitech Brio para videochamadas, streaming e trabalho remoto. Captação até 4K Ultra HD, focagem automática e ligação USB. Fotografias reais serão acrescentadas assim que estiverem disponíveis.",
    illustrative: true,
    photos: [logitechBrio],
    price: 129,
    specifications: ["Resolução até 4K Ultra HD", "Focagem automática", "Ligação USB", "Compatível com aplicações de videoconferência"],
  },
  "surface laptop go 3": {
    condition: "Usado, verificado",
    description: "Microsoft Surface Laptop Go 3 de 2023, compacto e leve. A bateria foi testada e mantém aproximadamente 86% da capacidade de origem. O equipamento arranca e carrega normalmente.",
    illustrative: false,
    photos: [surfaceLaptopGo301],
    price: 349,
    specifications: ["Modelo Surface Laptop Go 3", "Ano 2023", "Bateria com aproximadamente 86% de capacidade", "Windows instalado"],
  },
  "surface laptop studio": {
    condition: "Detalhes a confirmar",
    description: "Microsoft Surface Laptop Studio registado no stock. A configuração, o estado da bateria, os acessórios e as fotografias reais serão acrescentados após a verificação completa do equipamento.",
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
