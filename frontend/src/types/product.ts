export interface RomixProductColor {
  name: string;
  image?: string;
  swatch?: string;
  hex?: string;
}

export interface RomixProduct {
  name: string;
  type: string;
  section: "mujer" | "hombre" | "ninos";
  image: string;
  price: number;
  originalPrice?: number;
  visible?: boolean;
  sizes?: Array<string | number>;
  colors?: RomixProductColor[];
}
