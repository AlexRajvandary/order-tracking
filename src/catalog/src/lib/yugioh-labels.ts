const CARD_TYPES: Record<string, string> = {
  Monster: "Монстр",
  Spell: "Заклинание",
  Trap: "Ловушка",
};

const CARD_SUBTYPES: Record<string, string> = {
  Effect: "Эффект",
  Normal: "Обычная",
  Ritual: "Ритуал",
  Fusion: "Слияние",
  Synchro: "Синхро",
  Xyz: "Xyz",
  Link: "Линк",
  Pendulum: "Маятник",
};

const ATTRIBUTES: Record<string, string> = {
  DARK: "Тьма", LIGHT: "Свет", EARTH: "Земля", WATER: "Вода",
  FIRE: "Огонь", WIND: "Ветер", DIVINE: "Божественный",
};

const SERIES_TYPES: Record<string, string> = {
  "Booster Pack": "Бустер",
  Promotion: "Промо",
  Other: "Другое",
};

export function yuGiOhCardTypeName(value: string | null | undefined) {
  return value ? CARD_TYPES[value] ?? value : null;
}

export function yuGiOhCardSubtypeName(value: string | null | undefined) {
  return value ? CARD_SUBTYPES[value] ?? value : null;
}

export function yuGiOhAttributeName(value: string | null | undefined) {
  return value ? ATTRIBUTES[value] ?? value : null;
}

export function yuGiOhSeriesTypeName(value: string | null | undefined) {
  return value ? SERIES_TYPES[value] ?? value : null;
}
