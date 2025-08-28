// Utility to derive legacy sizeVariants from a flexible variantGroups payload
// - If a group named "Size" exists, convert its options with absolute price to sizeVariants
// - Leaves other groups untouched
export function mirrorSizeGroupToSizeVariants(variantGroups = []) {
  if (!Array.isArray(variantGroups)) return [];
  const sizeGroup = variantGroups.find(
    (g) => g && typeof g.name === 'string' && g.name.trim().toLowerCase() === 'size'
  );
  if (!sizeGroup || !Array.isArray(sizeGroup.options)) return [];
  const variants = sizeGroup.options
    .filter((o) => o && o.name && (o.price !== undefined && o.price !== null))
    .map((o) => ({ name: String(o.name).trim(), price: parseFloat(o.price) }));
  return variants.filter((v) => v.name && !Number.isNaN(v.price));
}

// Normalize variant groups before sending to API
export function normalizeVariantGroups(groups = []) {
  if (!Array.isArray(groups)) return [];
  return groups
    .map((g) => ({
      name: g && g.name ? String(g.name).trim() : '',
      selectionType: g && g.selectionType === 'multiple' ? 'multiple' : 'single',
      options: Array.isArray(g?.options)
        ? g.options
            .map((o) => ({
              name: o && o.name ? String(o.name).trim() : '',
              price: o && o.price !== undefined && o.price !== null && !Number.isNaN(parseFloat(o.price))
                ? parseFloat(o.price)
                : undefined,
              priceDelta:
                o && o.priceDelta !== undefined && o.priceDelta !== null && !Number.isNaN(parseFloat(o.priceDelta))
                  ? parseFloat(o.priceDelta)
                  : 0,
            }))
            .filter((o) => o.name)
        : [],
    }))
    .filter((g) => g.name && g.options.length > 0);
}
