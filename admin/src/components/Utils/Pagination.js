import React from 'react';
import {
  Pagination as ReactstrapPagination,
  PaginationItem,
  PaginationLink,
  Input,
  FormGroup
} from 'reactstrap';

/**
 * Reusable pagination component for the admin dashboard
 * 
 * @param {Object} props
 * @param {number} props.currentPage - Current active page (1-based)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.itemsPerPage - Number of items per page
 * @param {Function} props.onPageChange - Callback function when page changes
 * @param {Function} props.onItemsPerPageChange - Callback function when items per page changes
 * @param {string} props.size - Size of pagination component ('sm', 'md', 'lg')
 * @param {boolean} props.disabled - Whether pagination is disabled
 * @param {string} props.className - Additional CSS classes
 */
const Pagination = ({
  currentPage = 1,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  size = '',
  disabled = false,
  className = ''
}) => {
  // Calculate total pages if not provided
  const calculatedTotalPages = totalPages || Math.ceil(totalItems / itemsPerPage);
  
  // If there's only one page or no pages, don't render pagination
  if (calculatedTotalPages <= 1) return null;

  // Calculate range of visible pages
  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate start and end of visible pages
    let start = Math.max(2, currentPage - delta);
    let end = Math.min(calculatedTotalPages - 1, currentPage + delta);
    
    // Add ellipsis after first page if needed
    if (start > 2) {
      pages.push('...');
    }
    
    // Add visible pages
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (end < calculatedTotalPages - 1) {
      pages.push('...');
    }
    
    // Always show last page if more than one page
    if (calculatedTotalPages > 1) {
      pages.push(calculatedTotalPages);
    }
    
    return pages;
  };

  // Handle page change
  const handlePageChange = (page) => {
    if (disabled || page === currentPage) return;
    if (onPageChange) onPageChange(page);
  };

  // Handle previous page
  const handlePrevious = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  // Handle next page
  const handleNext = () => {
    if (currentPage < calculatedTotalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // Handle items per page change
  const handleItemsPerPageChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && onItemsPerPageChange) {
      onItemsPerPageChange(value);
    }
  };

  const visiblePages = getVisiblePages();
  
  // Calculate range of items being displayed
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="d-flex align-items-center justify-content-between">
      <div className="d-none d-md-block">
        <small className="text-muted">
          Showing {startItem} to {endItem} of {totalItems} entries
        </small>
      </div>
      
      <div className="d-flex align-items-center">
        {/* Items per page selector */}
        {onItemsPerPageChange && (
          <FormGroup className="mb-0 mr-3">
            <div className="d-flex align-items-center">
              <small className="text-muted mr-2">Show</small>
              <Input
                type="select"
                bsSize="sm"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                disabled={disabled}
                style={{ width: '70px' }}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Input>
              <small className="text-muted ml-2">items</small>
            </div>
          </FormGroup>
        )}
        
        {/* Pagination Controls */}
        <nav aria-label="Page navigation">
          <ReactstrapPagination 
            className={`pagination mb-0 ${className}`}
            size={size}
          >
            {/* Previous button */}
            <PaginationItem disabled={disabled || currentPage === 1}>
              <PaginationLink
                previous
                onClick={(e) => {
                  e.preventDefault();
                  handlePrevious();
                }}
                aria-label="Previous"
              >
                <span aria-hidden="true">
                  <i className="fas fa-angle-left" />
                </span>
                <span className="sr-only">Previous</span>
              </PaginationLink>
            </PaginationItem>
            
            {/* Page numbers */}
            {visiblePages.map((page, index) => (
              <PaginationItem 
                key={`page-${index}`} 
                active={page === currentPage} 
                disabled={disabled || page === '...'}
              >
                {page === '...' ? (
                  <PaginationLink disabled>...</PaginationLink>
                ) : (
                  <PaginationLink
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            {/* Next button */}
            <PaginationItem disabled={disabled || currentPage === calculatedTotalPages}>
              <PaginationLink
                next
                onClick={(e) => {
                  e.preventDefault();
                  handleNext();
                }}
                aria-label="Next"
              >
                <span aria-hidden="true">
                  <i className="fas fa-angle-right" />
                </span>
                <span className="sr-only">Next</span>
              </PaginationLink>
            </PaginationItem>
          </ReactstrapPagination>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;