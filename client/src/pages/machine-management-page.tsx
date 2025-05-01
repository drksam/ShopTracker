import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Machine, Location, User, InsertMachine, InsertMachinePermission } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertMachineSchema, insertMachinePermissionSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Factory,
  Cpu,
  MapPin,
  User as UserIcon,
  UserPlus,
  AlertTriangle,
  UserX,
  QrCode,
  Smartphone,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Machine form schema
const machineFormSchema = insertMachineSchema.extend({});

type MachineFormValues = z.infer<typeof machineFormSchema>;

// Permission form schema
const permissionFormSchema = insertMachinePermissionSchema.extend({});

type PermissionFormValues = z.infer<typeof permissionFormSchema>;

export default function MachineManagementPage() {
  const { toast } = useToast();
  const [isMachineFormOpen, setIsMachineFormOpen] = useState(false);
  const [isPermissionFormOpen, setIsPermissionFormOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [activeTab, setActiveTab] = useState<string>("machines");

  // Fetch machines
  const {
    data: machines,
    isLoading: isLoadingMachines,
    refetch: refetchMachines,
  } = useQuery<Machine[], Error>({
    queryKey: ["/api/machines"],
  });

  // Fetch locations for machine form
  const { data: locations, isLoading: isLoadingLocations } = useQuery<Location[], Error>({
    queryKey: ["/api/locations"],
  });

  // Fetch users for permission form
  const { data: users, isLoading: isLoadingUsers } = useQuery<Omit<User, "password">[], Error>({
    queryKey: ["/api/users"],
  });

  // Delete machine mutation
  const deleteMachineMutation = useMutation({
    mutationFn: async (machineId: number) => {
      await apiRequest("DELETE", `/api/machines/${machineId}`);
    },
    onSuccess: () => {
      refetchMachines();
      toast({
        title: "Machine Deleted",
        description: "The machine has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete machine: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fetch machine permissions when a machine is selected
  const {
    data: machinePermissions,
    isLoading: isLoadingPermissions,
    refetch: refetchPermissions,
  } = useQuery({
    queryKey: ["/api/machine-permissions", selectedMachine?.id],
    queryFn: async () => {
      if (!selectedMachine) return [];
      const res = await fetch(`/api/machine-permissions/machine/${selectedMachine.id}`);
      if (!res.ok) throw new Error("Failed to fetch machine permissions");
      return res.json();
    },
    enabled: !!selectedMachine,
  });

  // Remove permission mutation
  const removePermissionMutation = useMutation({
    mutationFn: async ({ userId, machineId }: { userId: number; machineId: number }) => {
      await apiRequest("DELETE", `/api/machine-permissions/${userId}/${machineId}`, null);
    },
    onSuccess: () => {
      refetchPermissions();
      toast({
        title: "Permission Removed",
        description: "The user permission has been successfully removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove permission: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Machine form
  const MachineForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Default values
    const defaultValues: Partial<MachineFormValues> = {
      name: "",
      machineId: "",
      locationId: 0,
      ...editingMachine,
    };
    
    const form = useForm<MachineFormValues>({
      resolver: zodResolver(machineFormSchema),
      defaultValues,
    });
    
    const onSubmit = async (data: MachineFormValues) => {
      try {
        setIsSubmitting(true);
        
        let response;
        
        if (editingMachine?.id) {
          // Update existing machine
          response = await apiRequest("PUT", `/api/machines/${editingMachine.id}`, data);
        } else {
          // Create new machine
          response = await apiRequest("POST", "/api/machines", data);
        }
        
        // Invalidate machines query
        queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
        
        toast({
          title: editingMachine ? "Machine Updated" : "Machine Created",
          description: `Machine ${data.name} has been ${editingMachine ? "updated" : "created"} successfully.`,
        });
        
        onSuccess();
      } catch (error) {
        console.error("Error submitting machine:", error);
        toast({
          title: "Error",
          description: `Failed to ${editingMachine ? "update" : "create"} machine. Please try again.`,
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    };
    
    // Get location options
    const locationOptions = locations?.map(location => ({
      value: location.id.toString(),
      label: location.name,
    })) || [];
    
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Machine Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter machine name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="machineId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Machine ID</FormLabel>
                <FormDescription>A unique 2-digit identifier for the machine</FormDescription>
                <FormControl>
                  <Input 
                    placeholder="e.g., M1, A2, etc." 
                    maxLength={2} 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value ? field.value.toString() : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locationOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsMachineFormOpen(false);
                setEditingMachine(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingMachine ? "Update Machine" : "Create Machine"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  // Permission form
  const PermissionForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Default values
    const defaultValues: Partial<PermissionFormValues> = {
      userId: 0,
      machineId: selectedMachine?.id || 0,
    };
    
    const form = useForm<PermissionFormValues>({
      resolver: zodResolver(permissionFormSchema),
      defaultValues,
    });
    
    const onSubmit = async (data: PermissionFormValues) => {
      try {
        setIsSubmitting(true);
        
        // Add permission
        await apiRequest("POST", "/api/machine-permissions", data);
        
        // Invalidate permissions query
        queryClient.invalidateQueries({ queryKey: ["/api/machine-permissions", selectedMachine?.id] });
        
        toast({
          title: "Permission Added",
          description: "The user permission has been added successfully.",
        });
        
        onSuccess();
      } catch (error) {
        console.error("Error adding permission:", error);
        toast({
          title: "Error",
          description: `Failed to add permission. Please try again.`,
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    };
    
    // Get user options - filter out users who already have permission
    const userIds = machinePermissions?.map(p => p.userId) || [];
    const userOptions = users
      ?.filter(user => !userIds.includes(user.id))
      .map(user => ({
        value: user.id.toString(),
        label: user.fullName || user.username,
      })) || [];
    
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value ? field.value.toString() : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {userOptions.length === 0 ? (
                      <SelectItem value="none" disabled>No users available</SelectItem>
                    ) : (
                      userOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsPermissionFormOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || userOptions.length === 0}
            >
              {isSubmitting ? "Saving..." : "Add Permission"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  // Handle edit machine
  const handleEditMachine = (machine: Machine) => {
    setEditingMachine(machine);
    setIsMachineFormOpen(true);
  };

  // Handle delete machine
  const handleDeleteMachine = (machineId: number) => {
    deleteMachineMutation.mutate(machineId);
  };

  // Handle select machine for permissions
  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setActiveTab("permissions");
  };

  // Handle remove permission
  const handleRemovePermission = (userId: number) => {
    if (!selectedMachine) return;
    removePermissionMutation.mutate({ userId, machineId: selectedMachine.id });
  };

  // Get location name by ID
  const getLocationName = (locationId: number): string => {
    const location = locations?.find(l => l.id === locationId);
    return location ? location.name : `Location ${locationId}`;
  };

  // Get user name by ID
  const getUserName = (userId: number): string => {
    const user = users?.find(u => u.id === userId);
    return user ? (user.fullName || user.username) : `User ${userId}`;
  };

  // Render loading state
  if (isLoadingMachines || isLoadingLocations) {
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Machine Management</h1>
        
        <Dialog 
          open={isMachineFormOpen} 
          onOpenChange={(open) => {
            setIsMachineFormOpen(open);
            if (!open) setEditingMachine(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="mr-1 h-4 w-4" /> Add Machine
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMachine ? "Edit Machine" : "Add New Machine"}
              </DialogTitle>
              <DialogDescription>
                {editingMachine 
                  ? "Update the machine details in the workshop management system" 
                  : "Add a new machine to the workshop management system"}
              </DialogDescription>
            </DialogHeader>
            <MachineForm onSuccess={() => {
              setIsMachineFormOpen(false);
              setEditingMachine(null);
            }} />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Tabs for Machines and Permissions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="permissions" disabled={!selectedMachine}>
            User Permissions
            {selectedMachine && (
              <span className="ml-2 text-xs bg-primary/10 rounded-full py-0.5 px-2">
                {selectedMachine.name}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Machines Tab */}
        <TabsContent value="machines">
          <Card>
            <CardHeader>
              <CardTitle>Workshop Machines</CardTitle>
              <CardDescription>
                Manage machines and their locations in the workshop
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!machines || machines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertTriangle className="h-12 w-12 mb-2 text-amber-500" />
                  <h3 className="text-lg font-medium mb-1">No Machines Found</h3>
                  <p className="text-sm text-center mb-6">
                    You need to set up machines for your workshop locations.
                  </p>
                  <Button 
                    onClick={() => setIsMachineFormOpen(true)} 
                    className="mt-2"
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add First Machine
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Machine ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machines.map((machine) => (
                      <TableRow key={machine.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2">
                              <Cpu className="h-4 w-4" />
                            </div>
                            {machine.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{machine.machineId}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                            {getLocationName(machine.locationId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center"
                              onClick={() => handleSelectMachine(machine)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Permissions
                            </Button>
                            
                            {/* QR Code for Mobile Access */}
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
                                  <DialogTitle>Mobile Display for {machine.name}</DialogTitle>
                                  <DialogDescription>
                                    Scan this QR code to access the mobile-friendly machine display page.
                                    Suitable for tablets stationed at this machine.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col items-center justify-center py-4">
                                  <div className="border p-4 bg-white rounded-lg">
                                    <QRCodeSVG
                                      value={`${window.location.origin}/display/machine/${machine.id}`}
                                      size={200}
                                      level="H"
                                      includeMargin={true}
                                      className="mx-auto"
                                    />
                                  </div>
                                  <p className="mt-4 text-sm text-center text-gray-500">
                                    This page is designed for tablets that will be placed at this machine for operators to track and update orders.
                                  </p>
                                  <Button 
                                    className="mt-4"
                                    onClick={() => window.open(`/display/machine/${machine.id}`, '_blank')}
                                  >
                                    Open Mobile Display
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditMachine(machine)}
                              title="Edit Machine"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete Machine"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Machine</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the machine <strong>{machine.name}</strong>? 
                                    This will also remove all user permissions for this machine.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteMachine(machine.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Permissions Tab */}
        <TabsContent value="permissions">
          {selectedMachine && (
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>User Permissions for {selectedMachine.name}</CardTitle>
                    <CardDescription>
                      Manage which users have access to this machine
                    </CardDescription>
                  </div>
                  
                  <Dialog 
                    open={isPermissionFormOpen} 
                    onOpenChange={setIsPermissionFormOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="flex items-center mt-4 md:mt-0">
                        <UserPlus className="mr-1 h-4 w-4" /> Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          Add User Permission
                        </DialogTitle>
                        <DialogDescription>
                          Grant a user access to machine {selectedMachine.name}
                        </DialogDescription>
                      </DialogHeader>
                      <PermissionForm onSuccess={() => {
                        setIsPermissionFormOpen(false);
                      }} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingPermissions ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !machinePermissions || machinePermissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <UserIcon className="h-12 w-12 mb-2 text-gray-400" />
                    <h3 className="text-lg font-medium mb-1">No User Permissions</h3>
                    <p className="text-sm text-center mb-4">
                      No users have been granted access to this machine
                    </p>
                    <Button 
                      onClick={() => setIsPermissionFormOpen(true)} 
                      className="mt-2"
                    >
                      <UserPlus className="mr-1 h-4 w-4" /> Add First User
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {machinePermissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2">
                                <UserIcon className="h-4 w-4" />
                              </div>
                              {getUserName(permission.userId)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <UserX className="h-4 w-4 mr-1" />
                                  Remove Access
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove User Access</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove access for <strong>{getUserName(permission.userId)}</strong> 
                                    to machine <strong>{selectedMachine.name}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleRemovePermission(permission.userId)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
