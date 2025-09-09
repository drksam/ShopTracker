import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  disabled = false,
  className = "",
}: PaginationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const isMobile = useIsMobile();
  
  // Create an array of page numbers to show
  const getVisiblePages = () => {
    const delta = isMobile ? 1 : 2; // Fewer pages on mobile
    const range = [];
    
    // Always include page 1
    range.push(1);
    
    // Calculate start and end pages to show
    let start = Math.max(2, currentPage - delta);
    let end = Math.min(totalPages - 1, currentPage + delta);
    
    // Adjust if current page is near the beginning
    if (currentPage - delta < 2) {
      end = Math.min(totalPages - 1, end + (2 - (currentPage - delta)));
    }
    
    // Adjust if current page is near the end
    if (currentPage + delta > totalPages - 1) {
      start = Math.max(2, start - ((currentPage + delta) - (totalPages - 1)));
    }
    
    // Add ellipsis after page 1 if needed
    if (start > 2) {
      range.push('...');
    } else if (start === 2) {
      range.push(2);
    }
    
    // Add pages between start and end
    for (let i = Math.max(start, 2); i <= Math.min(end, totalPages - 1); i++) {
      range.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (end < totalPages - 1) {
      range.push('...');
    } else if (end === totalPages - 1) {
      range.push(totalPages - 1);
    }
    
    // Always include the last page if there is more than one page
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    return range;
  };
  
  const visiblePages = getVisiblePages();
  
  // For mobile: simplified pagination with current page indicator and prev/next buttons
  if (isMobile) {
    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        <div className="flex items-center justify-center w-full">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious || disabled}
            aria-label="First page"
            className="h-10 w-10"
          >
            <ChevronsLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious || disabled}
            aria-label="Previous page"
            className="h-10 w-10 mx-1"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center justify-center min-w-[100px] px-3 py-2 border rounded-md mx-2 bg-background">
            <span className="text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext || disabled}
            aria-label="Next page"
            className="h-10 w-10 mx-1"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext || disabled}
            aria-label="Last page"
            className="h-10 w-10"
          >
            <ChevronsRight className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select 
            value={pageSize.toString()} 
            onValueChange={(value) => onPageSizeChange(parseInt(value))}
            disabled={disabled}
          >
            <SelectTrigger className="h-10 w-[80px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>
      </div>
    );
  }

  // Desktop view with page numbers
  return (
    <div className={`flex flex-row items-center justify-between gap-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious || disabled}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious || disabled}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center space-x-1">
          {visiblePages.map((page, i) => (
            page === '...' ? (
              <div key={`ellipsis-${i}`} className="px-2">...</div>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => page !== currentPage && onPageChange(page as number)}
                disabled={disabled}
                className="w-9 h-9"
              >
                {page}
              </Button>
            )
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext || disabled}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext || disabled}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center space-x-2 ml-4">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Page {currentPage} of {totalPages}
        </span>
        
        <Select 
          value={pageSize.toString()} 
          onValueChange={(value) => onPageSizeChange(parseInt(value))}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">per page</span>
      </div>
    </div>
  );
}
