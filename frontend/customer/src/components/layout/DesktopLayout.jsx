import React, { useState } from "react";
import { useResponsive } from "../../context/ResponsiveContext";
import Header from "../ui/Header";
import SideNav from "../ui/SideNav";
import { theme } from "../../data/theme";

const DesktopLayout = ({ children, profileSrc, restaurantName, branchName, tableNumber, openLoginModal, onNavigateToProfile }) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState("menu");
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(true);

  // Skip desktop layout on mobile screens
  if (isMobile) {
    return children;
  }
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  const handleSideNavExpand = (expanded) => {
    setIsSideNavExpanded(expanded);
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme.colors.background,
        position: "relative",
      }}
    >      {/* Side Navigation for tablet/desktop */}      <SideNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        restaurantName={restaurantName}
        branchName={branchName}
        tableNumber={tableNumber}
        profileSrc={profileSrc}
        onExpand={handleSideNavExpand}
      />{/* Main Content Area */}
      <main
        style={{
          flex: 1,
          marginLeft: "80px", // Minimum width for collapsed SideNav
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          maxWidth: "95vw",
          paddingLeft: !isSideNavExpanded ? 'inherit' : '210px'
        }}
      >
        {/* Header */}
        <Header
          profileSrc={profileSrc}
          isDesktop={isDesktop}
          restaurantName={restaurantName}
          branchName={branchName}
          tableNumber={tableNumber}
          openLoginModal={openLoginModal}
          onNavigateToProfile={onNavigateToProfile}
        />

        {/* Content */}
        <div
          style={{
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            flex: 1,
            width: "100%",
            maxWidth: "1400px",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
};

export default DesktopLayout;