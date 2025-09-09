import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuantityUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => void;
  currentQuantity: number;
  maxQuantity: number;
  title?: string;
  description?: string;
  confirmText?: string;
}

export function QuantityUpdateDialog({
  isOpen,
  onClose,
  onSubmit,
  currentQuantity,
  maxQuantity,
  title = "Update Quantity",
  description = "Enter the new completed quantity",
  confirmText = "Update"
}: QuantityUpdateDialogProps) {
  const [quantity, setQuantity] = useState(currentQuantity);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setQuantity(currentQuantity);
      setError(null);
    }
  }, [isOpen, currentQuantity]);

  // Handle direct input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (e.target.value === "") {
      setQuantity(0);
      setError(null);
    } else if (isNaN(value)) {
      setError("Please enter a valid number");
    } else {
      setQuantity(value);
      validateQuantity(value);
    }
  };

  // Increment/decrement buttons
  const increment = () => {
    const newQuantity = Math.min(quantity + 1, maxQuantity);
    setQuantity(newQuantity);
    validateQuantity(newQuantity);
  };

  const decrement = () => {
    const newQuantity = Math.max(0, quantity - 1);
    setQuantity(newQuantity);
    validateQuantity(newQuantity);
  };

  // Validate quantity input
  const validateQuantity = (value: number) => {
    if (value < 0) {
      setError("Quantity cannot be negative");
    } else if (value > maxQuantity) {
      setError(`Quantity cannot exceed ${maxQuantity}`);
    } else {
      setError(null);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before submission
    if (quantity < 0 || quantity > maxQuantity) {
      return;
    }
    
    onSubmit(quantity);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={isMobile ? "w-[90vw] max-w-[400px] rounded-lg p-4" : ""}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            
            <div className="flex items-center space-x-2">
              <Button 
                type="button"
                variant="outline" 
                size={isMobile ? "icon" : "sm"}
                onClick={decrement}
                className={isMobile ? "h-10 w-10" : ""}
              >
                <Minus className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
              </Button>
              
              <div className="relative flex-1">
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={handleInputChange}
                  min={0}
                  max={maxQuantity}
                  className={`text-center ${isMobile ? "text-lg py-6" : ""}`}
                />
                {isMobile && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    / {maxQuantity}
                  </div>
                )}
              </div>
              
              <Button 
                type="button"
                variant="outline" 
                size={isMobile ? "icon" : "sm"}
                onClick={increment}
                className={isMobile ? "h-10 w-10" : ""}
              >
                <Plus className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
              </Button>
            </div>
            
            {!isMobile && (
              <div className="text-sm text-right text-muted-foreground">
                Maximum: {maxQuantity}
              </div>
            )}
            
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>
          
          <DialogFooter className={isMobile ? "flex-col space-y-2" : ""}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className={isMobile ? "w-full" : ""}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!!error || quantity === currentQuantity}
              className={isMobile ? "w-full" : ""}
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}