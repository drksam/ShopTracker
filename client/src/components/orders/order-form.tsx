import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertOrderSchema, InsertOrder, Order, Location } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const formSchema = insertOrderSchema.extend({
  dueDate: z.date({
    required_error: "Due date is required",
  }),
});

type OrderFormValues = z.infer<typeof formSchema>;

interface OrderFormProps {
  onSuccess?: (order: Order) => void;
  onCancel?: () => void;
  initialData?: Partial<OrderFormValues>;
  isEdit?: boolean;
  orderId?: number;
}

export default function OrderForm({ 
  onSuccess, 
  onCancel, 
  initialData,
  isEdit = false,
  orderId
}: OrderFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [existingOrderLocations, setExistingOrderLocations] = useState<number[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  
  // Load all locations and selected locations (if editing)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLocationsLoading(true);
        
        // Load all locations
        const locationsResponse = await fetch('/api/locations');
        if (!locationsResponse.ok) {
          throw new Error('Failed to fetch locations');
        }
        const locationsData = await locationsResponse.json();
        setLocations(locationsData);
        
        // If editing, load order's existing locations
        if (isEdit && orderId) {
          const orderLocationsResponse = await fetch(`/api/order-locations/order/${orderId}`);
          if (!orderLocationsResponse.ok) {
            throw new Error('Failed to fetch order locations');
          }
          const orderLocationsData = await orderLocationsResponse.json();
          const locationIds = orderLocationsData.map((ol: any) => ol.locationId);
          setSelectedLocations(locationIds);
          setExistingOrderLocations(locationIds);
        } else {
          // For new orders, pre-select all locations EXCEPT "Risers" and "No Slip"
          const excludedLocationNames = ["Risers", "No Slip"];
          setSelectedLocations(locationsData
            .filter((loc: Location) => !excludedLocationNames.includes(loc.name))
            .map((loc: Location) => loc.id)
          );
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load locations data',
          variant: 'destructive',
        });
      } finally {
        setLocationsLoading(false);
      }
    };
    
    loadData();
  }, [isEdit, orderId, toast]);
  
  // Toggle a location selection
  const toggleLocationSelection = (locationId: number) => {
    setSelectedLocations(prev => {
      if (prev.includes(locationId)) {
        return prev.filter(id => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  };
  
  // Default values including date conversion for initialData
  const defaultValues: Partial<OrderFormValues> = {
    orderNumber: "",
    tbfosNumber: "",
    client: "",
    totalQuantity: 0,
    description: "",
    notes: "",
    pdfPrefix: "",
    ...initialData,
    // Handle timestamp format conversion from database to Date object
    dueDate: initialData?.dueDate 
      ? (typeof initialData.dueDate === 'number' 
         ? new Date(initialData.dueDate * 1000) // Convert from seconds to milliseconds
         : new Date(initialData.dueDate)) 
      : undefined
  };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: OrderFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Convert date to timestamp (milliseconds) since the database expects an integer
      const orderData = {
        ...data,
        dueDate: Math.floor(data.dueDate.getTime() / 1000), // Convert to seconds for DB
        selectedLocationIds: selectedLocations // Include the selected locations
      };
      
      let response;
      
      if (isEdit && orderId) {
        // Update existing order
        response = await apiRequest("PUT", `/api/orders/${orderId}`, orderData);
        
        // Handle order location updates for edited orders
        if (response.ok) {
          const order = await response.json();
          
          // Get locations that were added
          const addedLocations = selectedLocations.filter(
            id => !existingOrderLocations.includes(id)
          );
          
          // Get locations that were removed
          const removedLocations = existingOrderLocations.filter(
            id => !selectedLocations.includes(id)
          );
          
          // Add new locations
          for (const locationId of addedLocations) {
            await apiRequest("POST", "/api/order-locations", {
              orderId: order.id,
              locationId,
              status: "not_started",
              completedQuantity: 0
            });
          }
          
          // Remove locations no longer used
          for (const locationId of removedLocations) {
            await apiRequest("DELETE", `/api/order-locations/${order.id}/${locationId}`);
          }
          
          // Refresh queries
          queryClient.invalidateQueries({ queryKey: [`/api/order-locations/order/${order.id}`] });
        }
      } else {
        // Create new order
        response = await apiRequest("POST", "/api/orders", orderData);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        throw new Error(errorData.message || "Server error");
      }
      
      const order = await response.json();
      
      // Invalidate orders query
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      toast({
        title: isEdit ? "Order Updated" : "Order Created",
        description: `Order ${order.orderNumber} has been ${isEdit ? "updated" : "created"} successfully.`,
      });
      
      if (onSuccess) {
        onSuccess(order);
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "create"} order. ${error.message || "Please try again."}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="orderNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order Number</FormLabel>
                <FormControl>
                  <Input placeholder="ORD-1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="tbfosNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>TBFOS Number</FormLabel>
                <FormControl>
                  <Input placeholder="TB-123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="client"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <FormControl>
                  <Input placeholder="Client name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="totalQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
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
            name="pdfPrefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PDF Prefix (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="PDF prefix" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Order description" {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes" {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Select Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {locationsLoading ? (
              <div className="text-center py-4">Loading locations...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`location-${location.id}`}
                      checked={selectedLocations.includes(location.id)}
                      onCheckedChange={() => toggleLocationSelection(location.id)}
                    />
                    <label
                      htmlFor={`location-${location.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {location.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Update Order" : "Create Order"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
