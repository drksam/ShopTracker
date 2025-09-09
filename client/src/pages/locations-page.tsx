import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Location, InsertLocation } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  LayoutDashboard,
  AlertTriangle,
  Smartphone,
  QrCode,
  MoreVertical,
  ChevronRight,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LocationForm from "@/components/locations/location-form";

export default function LocationsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useMobile();
  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Fetch locations
  const {
    data: locations,
    isLoading,
    refetch,
  } = useQuery<Location[], Error>({
    queryKey: ["/api/locations"],
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: number) => {
      await apiRequest("DELETE", `/api/locations/${locationId}`);
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Location Deleted",
        description: "The location has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle edit location
  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setIsLocationFormOpen(true);
  };

  // Handle delete location
  const handleDeleteLocation = async (locationId: number) => {
    deleteLocationMutation.mutate(locationId);
  };

  // Location form success handler
  const handleLocationFormSuccess = () => {
    setIsLocationFormOpen(false);
    setEditingLocation(null);
    refetch();
  };

  // Sort locations by used order
  const sortedLocations = locations
    ? [...locations].sort((a, b) => a.usedOrder - b.usedOrder)
    : [];

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <Skeleton className="h-8 w-48 mb-4 md:mb-0" />
          <Skeleton className="h-10 w-36" />
        </div>
        
        <Card>
          <CardContent className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Workshop Locations</h1>
        
        {isAdmin && (
          <>
            <Button className="flex items-center" onClick={() => setIsLocationFormOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> {isMobile ? "Add" : "Add Location"}
            </Button>
            <Dialog 
              open={isLocationFormOpen} 
              onOpenChange={(open) => {
                setIsLocationFormOpen(open);
                if (!open) setEditingLocation(null);
              }}
            >
              <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingLocation ? "Edit Location" : "Add New Location"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingLocation 
                      ? "Update the location details in the workshop management system" 
                      : "Add a new location to the workshop management system"}
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto">
                  <LocationForm 
                    onSuccess={handleLocationFormSuccess} 
                    onCancel={() => {
                      setIsLocationFormOpen(false);
                      setEditingLocation(null);
                    }} 
                    initialData={editingLocation || undefined}
                    isEdit={!!editingLocation}
                    locationId={editingLocation?.id}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      
      {/* Locations Table/Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Workshop Locations</CardTitle>
          <CardDescription>
            Manage the different locations in your workshop where orders are processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="h-12 w-12 mb-2 text-amber-500" />
              <h3 className="text-lg font-medium mb-1">No Locations Found</h3>
              <p className="text-sm text-center mb-6">
                You need to set up locations to track orders through your workshop.
              </p>
              {isAdmin && (
                <Button 
                  onClick={() => setIsLocationFormOpen(true)} 
                  className="mt-2"
                >
                  <Plus className="mr-1 h-4 w-4" /> Add First Location
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View - Card Layout */}
              {isMobile && (
                <div className="space-y-4">
                  {sortedLocations.map((location) => (
                    <Card key={location.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                              location.isPrimary 
                                ? "bg-primary text-white" 
                                : "bg-gray-200 text-gray-700"
                            }`}>
                              {location.usedOrder}
                            </div>
                            <div>
                              <div className="font-medium">{location.name}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {location.isPrimary && (
                                  <Badge variant="default" className="text-xs">Primary</Badge>
                                )}
                                {location.skipAutoQueue && (
                                  <Badge variant="secondary" className="text-xs">Skip Queue</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/location/${location.id}`)}>
                                <LayoutDashboard className="h-4 w-4 mr-2" /> View Dashboard
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`/display/location/${location.id}`, '_blank')}>
                                <Smartphone className="h-4 w-4 mr-2" /> Mobile Display
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditLocation(location)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteLocation(location.id)}
                                    className="text-red-500 focus:text-red-500"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Desktop View - Table Layout */}
              {!isMobile && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Attributes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLocations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium text-center">{location.usedOrder}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                            {location.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {location.isPrimary && (
                              <Badge variant="default">Primary</Badge>
                            )}
                            {location.skipAutoQueue && (
                              <Badge variant="secondary">Skip Auto Queue</Badge>
                            )}
                            {location.noCount && (
                              <Badge variant="outline">No Count</Badge>
                            )}
                            {location.countMultiplier !== 1 && (
                              <Badge variant="outline">
                                Multiplier: {location.countMultiplier}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/location/${location.id}`)}
                              title="View Location"
                            >
                              <LayoutDashboard className="h-4 w-4" />
                            </Button>
                            
                            {/* QR Code Dialog for Mobile Access */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Mobile Display QR Code"
                                >
                                  <Smartphone className="h-4 w-4 text-blue-600" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Mobile Display for {location.name}</DialogTitle>
                                  <DialogDescription>
                                    Scan this QR code to access the mobile-friendly location display page.
                                    Suitable for tablets stationed at this location.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col items-center justify-center py-4">
                                  <div className="border p-4 bg-white rounded-lg">
                                    <QRCodeSVG
                                      value={`${window.location.origin}/display/location/${location.id}`}
                                      size={200}
                                      level="H"
                                      includeMargin={true}
                                      className="mx-auto"
                                    />
                                  </div>
                                  <p className="mt-4 text-sm text-center text-gray-500">
                                    This page is designed for tablets that will be placed at this location for workers to track and update orders.
                                  </p>
                                  <Button 
                                    className="mt-4"
                                    onClick={() => window.open(`/display/location/${location.id}`, '_blank')}
                                  >
                                    Open Mobile Display
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditLocation(location)}
                                  title="Edit Location"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Delete Location"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Location</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the location <strong>{location.name}</strong>? 
                                        This will remove it from all orders and can't be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteLocation(location.id)}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="bg-gray-50 border-t px-6 py-4">
          <div className="text-sm text-gray-500">
            <p><strong>Primary</strong>: Order will not proceed to next location until this one is started.</p>
            <p><strong>Skip Auto Queue</strong>: Location is excluded from automatic queuing.</p>
            <p><strong>No Count</strong>: Quantity tracking is disabled for this location.</p>
            <p><strong>Multiplier</strong>: Adjusts quantity tracking for specific locations.</p>
          </div>
        </CardFooter>
      </Card>
      
      {/* Location Flow Diagram */}
      {sortedLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Workshop Workflow</CardTitle>
            <CardDescription>
              Visual representation of the order flow through your workshop
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              <div className="flex flex-col space-y-4 py-4">
                {sortedLocations.map((location, index) => (
                  <div key={location.id} className="flex items-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                        location.isPrimary 
                          ? "bg-primary text-white" 
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {location.usedOrder}
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium">{location.name}</p>
                      {location.isPrimary && (
                        <Badge variant="outline" className="mt-1">Primary</Badge>
                      )}
                    </div>
                    {index < sortedLocations.length - 1 && (
                      <ChevronRight className="text-gray-400 h-4 w-4 mx-1" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative flex items-center justify-center py-8">
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 -z-10"></div>
                {sortedLocations.map((location, index) => (
                  <div key={location.id} className="flex flex-col items-center mx-4">
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                        location.isPrimary 
                          ? "bg-primary text-white" 
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {location.usedOrder}
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{location.name}</p>
                      {location.isPrimary && (
                        <Badge variant="outline" className="mt-1">Primary</Badge>
                      )}
                    </div>
                    {index < sortedLocations.length - 1 && (
                      <div className="absolute" style={{ left: `${(index + 1) * (100 / sortedLocations.length)}%` }}>
                        <svg 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="text-gray-400"
                        >
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
