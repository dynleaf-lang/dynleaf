// ProductCardEnhanced.jsx - Debugging code that you can copy into your ProductCard.jsx
 
 
// Debugging for handleAddToCart function
const hasOptions = product.options?.length > 0;
const hasSizes = product.sizes?.length > 0;
const hasExtras = product.extras?.length > 0;
const hasAddons = product.addons?.length > 0;
const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
const hasSizeVariants = product.sizeVariants && Array.isArray(product.sizeVariants) && product.sizeVariants.length > 0;

console.log(`ProductCard - ${product.title} - Options check:`, {
  hasOptions,
  hasSizes,
  hasExtras,
  hasAddons,
  hasVariants,
  hasSizeVariants
});
