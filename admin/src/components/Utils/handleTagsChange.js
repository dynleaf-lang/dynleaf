// Utility functions for handling tags in forms
// These functions are designed to be used with React components that have a tags array in their state

/**
 * Handles changes to the tags input field
 * @param {Event} e - The input change event
 * @param {Object} state - The current state object containing tags array
 * @param {Function} setState - The state setter function
 * @returns {Object} - An object containing the updated tags array and a boolean indicating if the input should be cleared
 */
const handleTagsChange = (e, state, setState) => {
    const { value } = e.target;
    const tags = state.tags || [];
    
    // Check if the last character is a comma
    if (value.endsWith(',')) {
        // Get the tag without the comma
        const newTag = value.slice(0, -1).trim();
        
        // Only add non-empty tags that don't already exist
        if (newTag && !tags.includes(newTag)) {
            const updatedTags = [...tags, newTag];
            setState({ ...state, tags: updatedTags });
        }
        
        // Signal that the input should be cleared
        return { shouldClearInput: true, updatedTags: tags };
    }
    
    // No changes to tags yet, just typing
    return { shouldClearInput: false, updatedTags: tags };
};

/**
 * Handles key press events in the tags input field
 * @param {Event} e - The keyboard event
 * @param {Object} state - The current state object containing tags array
 * @param {Function} setState - The state setter function
 * @returns {Object} - An object containing the updated tags array and a boolean indicating if the input should be cleared
 */
const handleTagKeyDown = (e, state, setState) => {
    const tags = state.tags || [];
    
    // Process tag on Enter key or comma
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        
        const value = e.target.value.trim();
        if (value && !tags.includes(value)) {
            const updatedTags = [...tags, value];
            setState({ ...state, tags: updatedTags });
            return { shouldClearInput: true, updatedTags };
        }
    } 
    // Remove the last tag when backspace is pressed on empty input
    else if (e.key === 'Backspace' && e.target.value === '' && tags.length > 0) {
        const updatedTags = [...tags];
        updatedTags.pop();
        setState({ ...state, tags: updatedTags });
    }
    
    return { shouldClearInput: false, updatedTags: tags };
};

/**
 * Removes a specific tag from the tags array
 * @param {string} tagToRemove - The tag to remove
 * @param {Object} state - The current state object containing tags array
 * @param {Function} setState - The state setter function
 */
const removeTag = (tagToRemove, state, setState) => {
    const tags = state.tags || [];
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setState({ ...state, tags: updatedTags });
};

export { handleTagsChange, handleTagKeyDown, removeTag };