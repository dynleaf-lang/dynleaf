import { useRef, useEffect } from 'react';

/**
 * A debug hook to track component renders
 * @param {string} componentName - The name of the component to track
 * @param {Object} [props] - The props to log (optional)
 * @param {Object} [state] - The state to log (optional)
 */
const useRenderTracker = (componentName, props = {}, state = {}) => {
  const renderCount = useRef(0);
 
  
  return renderCount.current;
};

export default useRenderTracker;