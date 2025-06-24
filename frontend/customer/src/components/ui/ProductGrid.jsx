import React from "react";
import ProductCard from "./ProductCard";
import { theme } from "../../data/theme";

const ProductGrid = ({ products, onAdd, isTablet, isDesktop }) => (
  <section
    aria-label="Menu items"
    style={{
      display: "grid",
      gap: isDesktop ? "28px" : "24px",
      gridTemplateColumns: isDesktop
        ? "repeat(3, 1fr)"
        : isTablet
          ? "repeat(2, 1fr)"
          : "repeat(auto-fill, minmax(180px, 1fr))",
      marginBottom: "96px",
      position: "relative",
    }}
  >
    {products.length === 0 ? (
      <div
        style={{
          gridColumn: "1/-1",
          padding: theme.spacing.xl,
          textAlign: "center",
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.lg,
          color: theme.colors.text.secondary,
          border: `1px dashed ${theme.colors.border}`,
        }}
      >
        <span
          className="material-icons"
          style={{ fontSize: "48px", color: theme.colors.text.muted, marginBottom: theme.spacing.sm }}
        >
          search_off
        </span>
        <h3 style={{ margin: "0 0 8px 0", color: theme.colors.text.primary }}>No items found</h3>
        <p style={{ margin: 0 }}>Try adjusting your filters or search terms</p>
      </div>
    ) : (
      products.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} isTablet={isTablet} isDesktop={isDesktop} />)
    )}
  </section>
);

export default ProductGrid;