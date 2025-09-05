import React from "react";
import ProductCard from "./ProductCard";
import { theme } from "../../data/theme";
import { useResponsive } from "../../context/ResponsiveContext";
import { useRestaurant } from "../../context/RestaurantContext";

const ProductGrid = ({ products, onAdd, selectedCategoryName }) => {
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { categories } = useRestaurant();
 
  

  // Find subcategories from the global categories list
  const allSubcategories = categories?.filter(cat => {
    // Check if it's a subcategory (has parentCategory)
    const isSubcategory = !!cat.parentCategory;
    
    // Check if it's active - only consider categories active if:
    // 1. isActive is explicitly true, OR
    // 2. isActive is undefined AND status is not 'inactive'
    let isActive = false;
    if (cat.isActive === true) {
      isActive = true;
    } else if (cat.isActive === undefined && cat.status !== 'inactive') {
      isActive = true;
    }
     
    return isSubcategory && isActive;
  }) || [];
  
  // Group products by subcategories for better organization
  const groupedProducts = products.reduce((acc, product) => {
    const categoryId = product.categoryId || (product.category && product.category._id);
    
    // Try to find if this product belongs to a subcategory
    const subcategory = allSubcategories.find(subCat => {
      const subCatId = subCat.id || subCat._id;
      return subCatId === categoryId;
    });
    
  const categoryKey = subcategory ? subcategory.name : (selectedCategoryName || 'Other Items');
    
    if (!acc[categoryKey]) {
      acc[categoryKey] = {
        items: [],
        order: subcategory ? 1 : 2, // Show subcategory sections first
        parentCategoryId: subcategory?.parentCategory,
      };
    }
    
    acc[categoryKey].items.push(product);
    return acc;
  }, {});
  
  // Find parent category names for subheadings
  const groupedProductsWithParents = Object.entries(groupedProducts).map(([key, value]) => {
    let parentName = '';
    
    if (value.parentCategoryId) {
      const parentId = typeof value.parentCategoryId === 'object' 
        ? value.parentCategoryId._id 
        : value.parentCategoryId;
        
      const parentCategory = categories.find(cat => {
        const catId = cat.id || cat._id;
        return catId === parentId;
      });
      
      if (parentCategory) {
        parentName = parentCategory.name;
      }
    }
    
    return {
      key,
      items: value.items,
      order: value.order,
      parentName
    };
  }).sort((a, b) => a.order - b.order); // Sort by order
  
  // Flat layout for desktop and tablet, grouped layout for mobile
  const renderLayout = () => {
    if (!isMobile || products.length < 5) {
      // Standard grid layout for desktop/tablet or small product lists
      if (groupedProductsWithParents.length <= 1) {
        return (
          <div
            style={{
              display: "grid",
              gap: isDesktop ? "28px" : isTablet ? "20px" : "12px",
              gridTemplateColumns: isDesktop
                ? "repeat(3, 1fr)"
                : isTablet
                  ? "repeat(2, 1fr)"
                  : "repeat(2, 1fr)", // Changed from 1 to 2 cards per row on mobile
              marginBottom: "96px",
              position: "relative",
            }}
          >
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAdd={onAdd} 
                isTablet={isTablet} 
                isDesktop={isDesktop} 
              />
            ))}
          </div>
        );
      } else {
        // Render products grouped by subcategories
        return groupedProductsWithParents.map(({ key, items, parentName }) => (
          <div key={key} style={{ marginBottom: "32px" }}>
            <h3 style={{ 
              margin: "0 0 12px 4px", 
              fontSize: "1.1rem",
              color: theme.colors.text.primary,
              fontWeight: theme.typography.fontWeights.bold,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              {key}
              {parentName && (
                <span style={{
                  fontSize: '0.75rem',
                  color: theme.colors.text.tertiary,
                  fontWeight: 'normal'
                }}>
                  in {parentName}
                </span>
              )}
            </h3>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: isDesktop 
                ? "repeat(3, 1fr)" 
                : isTablet ? "repeat(2, 1fr)" : "repeat(2, 1fr)",
              gap: isDesktop ? "28px" : isTablet ? "20px" : "12px",
              padding: "0 0 16px 0"
            }}>
              {items.map((product) => (
                <ProductCard 
                  key={product.id}
                  product={product}
                  onAdd={onAdd}
                  isTablet={isTablet}
                  isDesktop={isDesktop}
                />
              ))}
            </div>
          </div>
        ));
      }
    } else {
      // Horizontal scrolling categories for mobile with many products
      return groupedProductsWithParents.map(({ key, items, parentName }) => (
        <div key={key} style={{ marginBottom: "32px" }}>
          <h3 style={{ 
            margin: "0 0 12px 4px", 
            fontSize: "1.1rem",
            color: theme.colors.text.primary,
            fontWeight: theme.typography.fontWeights.bold,
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            {key}
            {parentName && (
              <span style={{
                fontSize: '0.7rem',
                color: theme.colors.text.tertiary,
                fontWeight: 'normal'
              }}>
                in {parentName}
              </span>
            )}
          </h3>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)", // Display 2 cards per row
            gap: "12px",
            padding: "0 0 16px 0"
          }}>
            {items.map((product) => (
              <ProductCard 
                key={product.id}
                product={product}
                onAdd={onAdd}
                isTablet={isTablet}
                isDesktop={isDesktop}
              />
            ))}
          </div>
        </div>
      ));
    }
  };

  if (products.length === 0) {
    return (
      <div
        style={{
          padding: theme.spacing.xl,
          textAlign: "center",
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.lg,
          color: theme.colors.text.secondary,
          border: `1px dashed ${theme.colors.border}`,
          marginBottom: "32px",
        }}
      >
        <span
          className="material-icons"
          style={{ 
            fontSize: "48px", 
            color: theme.colors.text.muted, 
            marginBottom: theme.spacing.sm 
          }}
        >
          search_off
        </span>
        <h3 style={{ 
          margin: "0 0 8px 0", 
          color: theme.colors.text.primary 
        }}>
          No items found
        </h3>
        <p style={{ margin: 0 }}>Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <section aria-label="Menu items" style={{ textTransform: "capitalize" }}>
      {renderLayout()}
    </section>
  );
};

export default ProductGrid;