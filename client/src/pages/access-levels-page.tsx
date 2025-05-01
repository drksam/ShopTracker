import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash, Edit, User, Key } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form validation schema
const accessLevelSchema = z.object({
  userId: z.number().int().min(1, "User must be selected"),
  machineId: z.string().min(1, "Machine ID is required"),
  accessLevel: z.enum(["user", "operator", "admin"]),
  notes: z.string().optional(),
});

type AccessLevel = {
  id: number;
  userId: number;
  machineId: string;
  accessLevel: "user" | "operator" | "admin";
  notes: string | null;
  createdAt: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    role: string;
  };
};

export default function AccessLevelsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<AccessLevel | null>(null);

  // Fetch all access levels
  const {
    data: accessLevels,
    isLoading: isLoadingAccessLevels,
    error: accessLevelsError,
  } = useQuery<AccessLevel[]>({
    queryKey: ["/api/access-levels"],
    enabled: !!user && user.role === "admin",
  });

  // Fetch all users for the dropdown
  const {
    data: users,
    isLoading: isLoadingUsers,
  } = useQuery<{ id: number; username: string; fullName: string }[]>({
    queryKey: ["/api/users"],
    enabled: !!user && user.role === "admin",
  });

  // Fetch all machines for the dropdown
  const {
    data: machines,
    isLoading: isLoadingMachines,
  } = useQuery<{ id: number; name: string; machineId: string }[]>({
    queryKey: ["/api/machines"],
    enabled: !!user && user.role === "admin",
  });

  // Create access level mutation
  const createAccessLevelMutation = useMutation({
    mutationFn: async (data: z.infer<typeof accessLevelSchema>) => {
      const response = await apiRequest("POST", "/api/access-levels", data);
      return await response.json();
    },
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/access-levels"] });
      toast({
        title: "Success",
        description: "Access level created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create access level: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update access level mutation
  const updateAccessLevelMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<z.infer<typeof accessLevelSchema>>;
    }) => {
      const response = await apiRequest("PUT", `/api/access-levels/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/access-levels"] });
      toast({
        title: "Success",
        description: "Access level updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update access level: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete access level mutation
  const deleteAccessLevelMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/access-levels/${id}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedAccessLevel(null);
      queryClient.invalidateQueries({ queryKey: ["/api/access-levels"] });
      toast({
        title: "Success",
        description: "Access level deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete access level: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Create form
  const createForm = useForm<z.infer<typeof accessLevelSchema>>({
    resolver: zodResolver(accessLevelSchema),
    defaultValues: {
      userId: 0,
      machineId: "",
      accessLevel: "user",
      notes: "",
    },
  });

  // Edit form
  const editForm = useForm<z.infer<typeof accessLevelSchema>>({
    resolver: zodResolver(accessLevelSchema),
    defaultValues: {
      userId: 0,
      machineId: "",
      accessLevel: "user",
      notes: "",
    },
  });

  // Setup edit form when an access level is selected
  const handleEditAccessLevel = (accessLevel: AccessLevel) => {
    setSelectedAccessLevel(accessLevel);
    editForm.reset({
      userId: accessLevel.userId,
      machineId: accessLevel.machineId,
      accessLevel: accessLevel.accessLevel,
      notes: accessLevel.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete access level
  const handleDeleteAccessLevel = (accessLevel: AccessLevel) => {
    setSelectedAccessLevel(accessLevel);
    setIsDeleteDialogOpen(true);
  };

  // Submit handlers
  const onCreateSubmit = (data: z.infer<typeof accessLevelSchema>) => {
    createAccessLevelMutation.mutate(data);
  };

  const onEditSubmit = (data: z.infer<typeof accessLevelSchema>) => {
    if (selectedAccessLevel) {
      updateAccessLevelMutation.mutate({
        id: selectedAccessLevel.id,
        data,
      });
    }
  };

  // Get machine name by ID
  const getMachineName = (machineId: string) => {
    const machine = machines?.find(m => m.machineId === machineId);
    return machine ? machine.name : machineId;
  };

  // Loading states
  if (isLoadingAccessLevels) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Error state
  if (accessLevelsError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              Error loading access levels. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Access Level Management</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              createForm.reset({
                userId: 0,
                machineId: "",
                accessLevel: "user",
                notes: "",
              });
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Access Level
          </Button>
        </CardHeader>
        <CardContent>
          {accessLevels && accessLevels.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Machine ID</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessLevels.map((accessLevel) => (
                  <TableRow key={accessLevel.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-500" />
                        {accessLevel.user?.fullName || accessLevel.user?.username || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Key className="w-4 h-4 mr-2 text-gray-500" />
                        {getMachineName(accessLevel.machineId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          accessLevel.accessLevel === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : accessLevel.accessLevel === "operator"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {accessLevel.accessLevel}
                      </span>
                    </TableCell>
                    <TableCell>{accessLevel.notes || "-"}</TableCell>
                    <TableCell>
                      {new Date(accessLevel.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditAccessLevel(accessLevel)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAccessLevel(accessLevel)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No access levels found. Add your first access level to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Access Level</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(onCreateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingUsers ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : (
                          users?.map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                            >
                              {user.fullName || user.username}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="machineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a machine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingMachines ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : (
                          machines?.map((machine) => (
                            <SelectItem
                              key={machine.id}
                              value={machine.machineId}
                            >
                              {machine.name} ({machine.machineId})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select access level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="operator">Operator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Add notes about this access level"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAccessLevelMutation.isPending}
                >
                  {createAccessLevelMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Access Level
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Access Level</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingUsers ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : (
                          users?.map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                            >
                              {user.fullName || user.username}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="machineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a machine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingMachines ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : (
                          machines?.map((machine) => (
                            <SelectItem
                              key={machine.id}
                              value={machine.machineId}
                            >
                              {machine.name} ({machine.machineId})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select access level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="operator">Operator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Add notes about this access level"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateAccessLevelMutation.isPending}
                >
                  {updateAccessLevelMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Update Access Level
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            Are you sure you want to delete this access level for user{" "}
            <span className="font-semibold">
              {selectedAccessLevel?.user?.fullName || selectedAccessLevel?.user?.username}
            </span>{" "}
            on machine{" "}
            <span className="font-semibold">
              {selectedAccessLevel?.machineId && getMachineName(selectedAccessLevel.machineId)}
            </span>?
            This action cannot be undone.
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => selectedAccessLevel && deleteAccessLevelMutation.mutate(selectedAccessLevel.id)}
              disabled={deleteAccessLevelMutation.isPending}
            >
              {deleteAccessLevelMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}