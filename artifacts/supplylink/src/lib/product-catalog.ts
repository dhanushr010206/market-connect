import source from "../../../../attached_assets/Pasted-CATEGORY-A-INDIAN-INDIGENOUS-AND-COMMON-FRUITS-Include-_1792172635417.txt?raw";

export type CatalogGroup = {
  name: string;
  varieties: string[];
};

export type CatalogCategory = {
  code: string;
  name: string;
  groups: CatalogGroup[];
};

export type CatalogChoice = {
  value: string;
  title: string;
  group: string;
  variety?: string;
};

const groupedVarieties: Record<string, Record<string, string[]>> = {
  A: {
    Mango: [
      "Alphonso",
      "Badami",
      "Banganapalli",
      "Kesar",
      "Totapuri",
      "Neelam",
      "Mallika",
      "Raspuri",
      "Dasheri",
      "Langra",
      "Amrapali",
    ],
    Banana: [
      "Yelakki",
      "Nanjangud Rasabale",
      "Robusta",
      "Grand Naine",
      "Red banana",
      "Nendran",
      "Poovan",
      "Monthan",
    ],
    Jackfruit: ["Sweet jackfruit", "Firm-fleshed jackfruit", "Raw jackfruit"],
    Guava: ["Allahabad Safeda", "Lalit", "Pink guava", "White guava"],
    Papaya: ["Red Lady", "Arka Prabhath", "Arka Surya"],
    "Sapota / Chikoo": ["Cricket Ball", "Kalipatti", "Pala", "CO varieties where applicable"],
  },
  B: {
    "Dragon fruit": ["White-fleshed", "Red-fleshed"],
    Avocado: ["Hass", "Fuerte", "Other available varieties"],
  },
  D: {
    Zucchini: ["Green zucchini", "Yellow zucchini"],
    Lettuce: ["Iceberg", "Romaine", "Green leaf", "Red leaf", "Butterhead"],
  },
  F: {
    Rice: [
      "Sona Masuri",
      "Basmati",
      "Jeera Samba",
      "Ponni",
      "Kolam",
      "Red rice",
      "Brown rice",
      "Black rice",
      "Hand-pounded rice",
      "Parboiled rice",
      "Raw rice",
      "Boiled rice",
      "Regional Karnataka rice varieties",
    ],
    Wheat: [
      "Whole wheat",
      "Wheat grain for milling",
      "Durum wheat",
      "Other regional varieties",
    ],
    Maize: ["Yellow maize", "White maize", "Sweet corn grain", "Feed maize"],
  },
};

function titleCaseCategory(value: string): string {
  const sentenceCase = value.toLocaleLowerCase();
  return sentenceCase.charAt(0).toLocaleUpperCase() + sentenceCase.slice(1);
}

function parseCatalog(text: string): CatalogCategory[] {
  const categories: CatalogCategory[] = [];
  const sourceItems = new Set(text.split(/\r?\n/).map((line) => line.trim()));
  let current: CatalogCategory | undefined;
  let skipProcessingNotes = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.match(/^CATEGORY ([A-L]):\s*(.+)$/i);

    if (heading) {
      current = {
        code: heading[1].toUpperCase(),
        name: `${heading[1].toUpperCase()}. ${titleCaseCategory(heading[2])}`,
        groups: [],
      };
      categories.push(current);
      skipProcessingNotes = false;
      continue;
    }

    if (!current || !line) continue;
    if (line.startsWith("Include grain condition and processing information")) {
      skipProcessingNotes = true;
      continue;
    }
    if (skipProcessingNotes) continue;

    // The source also contains explanatory rules. Keep selectable product names,
    // not full-sentence guidance or section labels.
    if (
      line.endsWith(".") ||
      line.endsWith(":") ||
      /^(Include|Distinguish|Clearly label|Support|Keep|Allow|Do not)\b/i.test(line)
    ) {
      continue;
    }

    const item = line.replace(/\s+/g, " ");
    const varietyGroups = groupedVarieties[current.code] ?? {};
    const varietyParent = Object.entries(varietyGroups).find(([, varieties]) =>
      varieties.includes(item),
    )?.[0];

    if (varietyParent) continue;

    const varieties = (varietyGroups[item] ?? []).filter((variety) =>
      sourceItems.has(variety),
    );
    current.groups.push({ name: item, varieties });
  }

  return categories;
}

export const productCatalog = parseCatalog(source);

export function getCatalogChoices(categoryName: string): CatalogChoice[] {
  const category = productCatalog.find(
    (candidate) => candidate.name.toLocaleLowerCase() === categoryName.trim().toLocaleLowerCase(),
  );

  if (!category) return [];

  return category.groups.flatMap((group) => [
    {
      value: JSON.stringify([group.name, null]),
      title: group.name,
      group: group.name,
    },
    ...group.varieties.map((variety) => ({
      value: JSON.stringify([group.name, variety]),
      title: `${group.name} — ${variety}`,
      group: group.name,
      variety,
    })),
  ]);
}
