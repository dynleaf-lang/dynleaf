// Global styles for the OrderEase customer application
export const injectGlobalStyles = () => {
  // Create a style element
  const style = document.createElement('style');
  
  // Add global styles
  style.textContent = `
    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Outfit', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #F9FAFC;
    }

    * {
      box-sizing: border-box;
    }

    /* Hide scrollbar for Chrome, Safari and Opera */
    ::-webkit-scrollbar {
      display: none;
    }

    /* Hide scrollbar for IE, Edge and Firefox */
    * {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `;
  
  // Add the style to the document head
  document.head.appendChild(style);
};