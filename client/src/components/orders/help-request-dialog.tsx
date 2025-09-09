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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

interface HelpRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => void;
  location: string;
  orderNumber: string;
}

export function HelpRequestDialog({
  isOpen,
  onClose,
  onSubmit,
  location,
  orderNumber
}: HelpRequestDialogProps) {
  const [notes, setNotes] = useState("");
  const isMobile = useIsMobile();

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setNotes("");
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(notes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={isMobile ? "w-[90vw] max-w-[400px] rounded-lg p-4" : ""}>
        <DialogHeader>
          <DialogTitle>Request Help</DialogTitle>
          <DialogDescription>
            Enter details about the help needed for {orderNumber} at {location}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="notes">Details</Label>
            <Textarea
              id="notes"
              placeholder="Describe the issue you're experiencing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`min-h-[120px] ${isMobile ? "text-base" : ""}`}
            />
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
              variant="default"
              className={`${isMobile ? "w-full" : ""} bg-red-600 hover:bg-red-700`}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}