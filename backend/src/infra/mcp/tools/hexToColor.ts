// hex-to-color-name.ts

/** Paleta de 30 cores (nomes simples, em inglês) que cobrem/resumem bem o conjunto dado */
const PALETTE: { name: string; hex: string }[] = [
  // Neutros
  { name: "White", hex: "#FFFFFF" },
  { name: "Off White", hex: "#F5F5F5" },
  { name: "Gray", hex: "#737373" },
  { name: "Charcoal", hex: "#2A2A2A" },
  { name: "Black", hex: "#000000" },

  // Quentes neutros / terrosos
  { name: "Beige", hex: "#E2CD9C" }, // Superlavável - Branco Claro / Clássica - Bronze Natural etc.
  { name: "Tan", hex: "#C7AB6B" }, // Proteção Total - Bege Natural
  { name: "Brown", hex: "#93591F" }, // Superlavável - Laranja Escuro (marrom quente) / Terracota escuros
  { name: "Peach", hex: "#D9AC8C" }, // Clássica - Pêssego Natural
  { name: "Coral", hex: "#DD673C" }, // Efeito Cimento - Coral Profundo / Proteção Total - Salmão Profundo

  // Laranjas / Amarelos
  { name: "Orange", hex: "#EC7F13" }, // Toque de Seda - Laranja Intenso
  { name: "Amber", hex: "#ECB613" }, // Superlavável - Âmbar Intenso
  { name: "Mustard", hex: "#C6AF53" }, // Superlavável - Mostarda Frio
  { name: "Warm Yellow", hex: "#D1BE61" }, // Proteção Total - Dourado Natural
  { name: "Yellow", hex: "#F4D125" }, // Fosco Completo - Dourado Vibrante

  // Verdes
  { name: "Lime", hex: "#C0F425" }, // Epóxi - Lima Vibrante
  { name: "Olive", hex: "#93761F" }, // Toque de Seda - Âmbar Escuro (oliva/âmbar terroso)
  { name: "Green", hex: "#61D161" }, // Efeito Cimento - Verde Natural / Clássica - Jade Natural
  { name: "Deep Green", hex: "#1F9346" }, // Fosco Completo - Jade Escuro

  // Verde-azulados
  { name: "Teal", hex: "#1F9393" }, // Rende & Cobre - Ciano Escuro
  { name: "Turquoise", hex: "#47D1AF" }, // Fosco Completo - Turquesa Frio
  { name: "Aqua", hex: "#96E9E2" }, // Clássica - Aqua Claro

  // Azuis
  { name: "Light Blue", hex: "#96C6E9" }, // Toque de Seda - Céu Claro
  { name: "Blue", hex: "#1D39C9" }, // Epóxi - Anil Profundo (azul forte)
  { name: "Indigo", hex: "#7E8BCE" }, // Fosco Completo - Anil Suave

  // Roxos / Rosas / Vermelhos
  { name: "Violet", hex: "#AF25F4" }, // Clássica - Violeta Vibrante
  { name: "Fuchsia", hex: "#EC13DA" }, // Superlavável - Fúcsia Intenso
  { name: "Pink", hex: "#CE7EA6" }, // Rende & Cobre - Vinho Suave (rosa/malva claro)
  { name: "Burgundy", hex: "#C91D73" }, // Proteção Total - Vinho Profundo
  { name: "Red", hex: "#D14747" }, // Fosco Completo - Vermelho Frio
];

/** Public API: recebe um hex e retorna o nome da cor mais próxima desta paleta (string). */
export function hexToColorName(inputHex: string): string {
  const rgb = hexToRgb(normalizeHex(inputHex));
  const lab = rgbToLab(rgb);

  let bestName = PALETTE[0].name;
  let bestDist = Infinity;

  for (const swatch of PALETTE) {
    const lab2 = rgbToLab(hexToRgb(swatch.hex));
    const d = deltaE76(lab, lab2);
    if (d < bestDist) {
      bestDist = d;
      bestName = swatch.name;
    }
  }
  return bestName;
}

/* ------------------------- utilitários de cor ------------------------- */

type RGB = { r: number; g: number; b: number };
type LAB = { L: number; a: number; b: number };

function normalizeHex(hex: string): string {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join(""); // #abc -> #aabbcc
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return "#" + h.toUpperCase();
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

// sRGB -> Linear
function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

// RGB (0–255, sRGB) -> XYZ (D65, 0–1)
function rgbToXyz({ r, g, b }: RGB): { x: number; y: number; z: number } {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);

  // matriz sRGB -> XYZ (D65)
  const x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;

  return { x, y, z };
}

// XYZ -> Lab (D65)
function xyzToLab({ x, y, z }: { x: number; y: number; z: number }): LAB {
  // brancos de referência D65
  const Xn = 0.95047,
    Yn = 1.0,
    Zn = 1.08883;

  const fx = f(x / Xn);
  const fy = f(y / Yn);
  const fz = f(z / Zn);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };

  function f(t: number): number {
    const delta = 6 / 29;
    return t > Math.pow(delta, 3)
      ? Math.cbrt(t)
      : t / (3 * delta * delta) + 4 / 29;
  }
}

function rgbToLab(rgb: RGB): LAB {
  return xyzToLab(rgbToXyz(rgb));
}

// Distância CIE76 (boa o suficiente para nomear cores)
function deltaE76(l1: LAB, l2: LAB): number {
  const dL = l1.L - l2.L;
  const da = l1.a - l2.a;
  const db = l1.b - l2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}
