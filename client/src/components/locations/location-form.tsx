import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertLocationSchema, InsertLocation, Location } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertLocationSchema.extend({});

type LocationFormValues = z.infer<typeof formSchema>;

interface LocationFormProps {
  onSuccess?: (location: Location) => void;
  onCancel?: () => void;
  initialData?: Partial<LocationFormValues>;
  isEdit?: boolean;
  locationId?: number;
}

export default function LocationForm({ 
  onSuccess, 
  onCancel, 
  initialData,
  isEdit = false,
  locationId
}: LocationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Default values
  const defaultValues: Partial<LocationFormValues> = {
    name: "",
    usedOrder: 0,
    isPrimary: false,
    skipAutoQueue: false,
    countMultiplier: 1,
    noCount: false,
    ...initialData
  };

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: LocationFormValues) => {
    try {
      setIsSubmitting(true);
      
      let response;
      
      if (isEdit && locationId) {
        // Update existing location
        response = await apiRequest("PUT", `/api/locations/${locationId}`, data);
      } else {
        // Create new location
        response = await apiRequest("POST", "/api/locations", data);
      }
      
      const location = await response.json();
      
      // Invalidate locations query
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      
      toast({
        title: isEdit ? "Location Updated" : "Location Created",
        description: `Location ${location.name} has been ${isEdit ? "updated" : "created"} successfully.`,
      });
      
      if (onSuccess) {
        onSuccess(location);
      }
    } catch (error) {
      console.error("Error submitting location:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "create"} location. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Name</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Cutting, Assembly, QC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="usedOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order Position</FormLabel>
              <FormDescription>
                The sequence number that determines where this location appears in the workflow
              </FormDescription>
              <FormControl>
                <Input 
                  type="number" 
                  min="0"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPrimary"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Primary Location</FormLabel>
                <FormDescription>
                  Orders will not proceed to the next location until this one is started
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="skipAutoQueue"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Skip Auto Queue</FormLabel>
                <FormDescription>
                  This location will be excluded from automatic queuing
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="noCount"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>No Count</FormLabel>
                <FormDescription>
                  Disable quantity tracking for this location
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="countMultiplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Count Multiplier</FormLabel>
              <FormDescription>
                Adjusts quantity tracking for specific locations (e.g., 0.5 for half counts, 2 for double counts)
              </FormDescription>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Update Location" : "Create Location"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
