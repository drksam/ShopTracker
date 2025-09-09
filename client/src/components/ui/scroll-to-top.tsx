import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
  position?: "bottom-right" | "bottom-center" | "bottom-left";
  offset?: number;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "ghost" | "outline";
  withBackground?: boolean;
}

export function ScrollToTop({
  threshold = 300,
  className,
  position = "bottom-right",
  offset = 20,
  size = "default",
  variant = "outline",
  withBackground = true,
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Position classes
  const positions = {
    "bottom-right": `right-${offset} bottom-${offset}`,
    "bottom-center": `left-1/2 -translate-x-1/2 bottom-${offset}`,
    "bottom-left": `left-${offset} bottom-${offset}`,
  };

  // Size classes
  const sizes = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
  };

  // Button background classes
  const backgroundClass = withBackground
    ? "bg-background/80 shadow-sm backdrop-blur-sm"
    : "";

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Button
      className={cn(
        "fixed z-50 transition-all duration-300 ease-in-out",
        positions[position],
        sizes[size],
        backgroundClass,
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
      variant={variant}
      size="icon"
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <ArrowUp className={cn(
        "h-4 w-4",
        size === "lg" ? "h-6 w-6" : size === "default" ? "h-5 w-5" : "h-4 w-4"
      )} />
    </Button>
  );
}