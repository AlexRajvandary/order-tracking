const ONE_PIECE_RARITY_NAMES: Record<string, string> = {
  C: "Common",
  UC: "Uncommon",
  R: "Rare",
  SR: "Super Rare",
  SEC: "Secret Rare",
  L: "Leader",
  SP: "Special",
  "SPカード": "Special",
};

export function onePieceRarityName(value: string | null | undefined): string | null {
  const code = value?.trim();
  if (!code) return null;
  return ONE_PIECE_RARITY_NAMES[code.toUpperCase()] ?? ONE_PIECE_RARITY_NAMES[code] ?? code;
}

export function onePieceRarityOptions(values: string[]) {
  return values.map((value) => ({
    id: value,
    slug: value,
    name: onePieceRarityName(value) ?? value,
  }));
}
