// apps/web/lib/labels/resolveLabel.ts

import type {
  UILabelCatalogItem,
  UILabelCatalogMap,
  UILabelDomain,
  UILabelResolved,
} from "@/models/platform/labels";
import { FALLBACK_LABELS } from "./fallbackLabels";

type ResolveLabelInput = {
  domain: UILabelDomain;
  key: string;
  catalogMap?: UILabelCatalogMap | null;
};

export function makeUILabelCatalogMap(
  rows: UILabelCatalogItem[],
): UILabelCatalogMap {
  const map: UILabelCatalogMap = {};
  for (const row of rows) {
    map[makeCatalogMapKey(row.domain, row.key)] = row;
  }
  return map;
}

export function makeCatalogMapKey(domain: string, key: string) {
  return `${domain}::${key}`;
}

export function resolveLabel({
  domain,
  key,
  catalogMap,
}: ResolveLabelInput): UILabelResolved {
  const mapKey = makeCatalogMapKey(domain, key);
  const dbItem = catalogMap?.[mapKey];

  if (dbItem?.labelKo) {
    return fromCatalogItem(dbItem);
  }

  const fallback = FALLBACK_LABELS?.[domain]?.[key];
  if (fallback?.labelKo) {
    return fallback;
  }

  return {
    labelKo: key,
  };
}

function fromCatalogItem(item: UILabelCatalogItem): UILabelResolved {
  return {
    labelKo: item.labelKo,
    labelEn: item.labelEn ?? null,
    shortDescriptionKo: item.shortDescriptionKo ?? null,
    longDescriptionKo: item.longDescriptionKo ?? null,
    studentMessageKo: item.studentMessageKo ?? null,
    parentMessageKo: item.parentMessageKo ?? null,
    teacherMessageKo: item.teacherMessageKo ?? null,
  };
}
