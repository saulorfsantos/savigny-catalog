export const CATEGORY_OPTIONS = [
  "Office",
  "Limpeza",
  "Utility",
  "Food Service",
  "Descartáveis",
  "Higiene Pessoal",
  "Higiene Corporativa",
  "EPI's",
  "Piscina",
  "Perfumaria",
  "Manutenção",
  "Automotivo",
  "Outros",
] as const;

export type Category = (typeof CATEGORY_OPTIONS)[number];
