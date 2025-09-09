import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Machine, Location, MachinePermission, InsertMachine } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Cpu, MapPin, Plus, Edit, Trash2, UserPlus, Smartphone, AlertTriangle, User as UserIcon, UserX } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type AccessRole = "operator" | "admin";

const machineFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  machineId: z.string().min(1, "Machine ID is required"),
  locationId: z.number().int().min(1, "Location is required"),
});

const permissionFormSchema = z.object({
  userId: z.number().int().min(1, "User is required"),
  accessRole: z.enum(["operator", "admin"]).default("operator"),
});

export default function MachineManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManagerPlus = user && ["admin", "manager"].includes(user.role);
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState("machines");
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isMachineFormOpen, setIsMachineFormOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isPermissionFormOpen, setIsPermissionFormOpen] = useState(false);

  // Data queries
  const { data: machines = [], isLoading: isLoadingMachines } = useQuery<Machine[]>({ queryKey: ["/api/machines"], enabled: !!isManagerPlus });
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<Location[]>({ queryKey: ["/api/locations"], enabled: !!isManagerPlus });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"], enabled: !!isManagerPlus });
  const { data: machinePermissions = [], isLoading: isLoadingPermissions, refetch: refetchPermissions } = useQuery<MachinePermission[]>({
    queryKey: ["/api/machine-permissions/machine", selectedMachine?.id],
    queryFn: async () => {
      if (!selectedMachine) return [];
      const res = await fetch(`/api/machine-permissions/machine/${selectedMachine.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedMachine,
  });

  // Mutations
  const createMachineMutation = useMutation({
    mutationFn: async (data: InsertMachine) => {
      await apiRequest("POST", "/api/machines", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      toast({ title: "Machine created" });
    },
    onError: (e: any) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const updateMachineMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertMachine> }) => {
      await apiRequest("PUT", `/api/machines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      toast({ title: "Machine updated" });
      setIsMachineFormOpen(false);
      setEditingMachine(null);
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMachineMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/machines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      toast({ title: "Machine deleted" });
      if (selectedMachine && selectedMachine.id === editingMachine?.id) setSelectedMachine(null);
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const addPermissionMutation = useMutation({
    mutationFn: async (data: { userId: number; machineId: number; accessRole: AccessRole }) => {
      await apiRequest("POST", "/api/machine-permissions", data);
    },
    onSuccess: () => {
      toast({ title: "Permission added" });
      refetchPermissions();
      setIsPermissionFormOpen(false);
    },
    onError: (e: any) => toast({ title: "Add failed", description: e.message, variant: "destructive" }),
  });

  const removePermissionMutation = useMutation({
    mutationFn: async ({ userId, machineId }: { userId: number; machineId: number }) => {
      await apiRequest("DELETE", `/api/machine-permissions/${userId}/${machineId}`);
    },
    onSuccess: () => {
      toast({ title: "Access removed" });
      refetchPermissions();
    },
    onError: (e: any) => toast({ title: "Remove failed", description: e.message, variant: "destructive" }),
  });

  // Helpers
  const getLocationName = (locationId: number) => locations.find((l) => l.id === locationId)?.name || `Location ${locationId}`;
  const getUserName = (userId: number) => users.find((u) => u.id === userId)?.fullName || users.find((u) => u.id === userId)?.username || `User ${userId}`;

  // Handlers
  const handleEditMachine = (machine: Machine) => {
    setEditingMachine(machine);
    setIsMachineFormOpen(true);
  };

  const handleDeleteMachine = (machineId: number) => deleteMachineMutation.mutate(machineId);
  const handleSelectMachine = (machine: Machine) => { setSelectedMachine(machine); setActiveTab("permissions"); };
  const handleRemovePermission = (userId: number) => { if (!selectedMachine) return; removePermissionMutation.mutate({ userId, machineId: selectedMachine.id }); };

  // Loading state
  if (!isManagerPlus) {
    return (
      <div className="container mx-auto">
        <Card><CardHeader><CardTitle>Access Denied</CardTitle><CardDescription>Only managers and admins can view this page.</CardDescription></CardHeader></Card>
      </div>
    );
  }

  if (isLoadingMachines || isLoadingLocations) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <Skeleton className="h-8 w-48 mb-4 md:mb-0" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Card>
          <CardContent className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full mb-2" />))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Machine Management</h1>
  {isAdmin && (
          <Dialog open={isMachineFormOpen} onOpenChange={(open) => { setIsMachineFormOpen(open); if (!open) setEditingMachine(null); }}>
            <DialogTrigger asChild>
              <Button className="flex items-center"><Plus className="mr-1 h-4 w-4" /> Add Machine</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingMachine ? "Edit Machine" : "Add New Machine"}</DialogTitle>
                <DialogDescription>{editingMachine ? "Update the machine details" : "Add a new machine"}</DialogDescription>
              </DialogHeader>
              <MachineForm
                locations={locations}
                initial={editingMachine || undefined}
                onCancel={() => { setIsMachineFormOpen(false); setEditingMachine(null); }}
                onSubmit={(data) => {
                  if (editingMachine) updateMachineMutation.mutate({ id: editingMachine.id, data });
                  else createMachineMutation.mutate(data);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="permissions" disabled={!selectedMachine}>User Permissions{selectedMachine && (<span className="ml-2 text-xs bg-primary/10 rounded-full py-0.5 px-2">{selectedMachine.name}</span>)}</TabsTrigger>
        </TabsList>

        <TabsContent value="machines">
          <Card>
            <CardHeader>
              <CardTitle>Workshop Machines</CardTitle>
              <CardDescription>Manage machines and their locations in the workshop</CardDescription>
            </CardHeader>
            <CardContent>
              {!machines || machines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertTriangle className="h-12 w-12 mb-2 text-amber-500" />
                  <h3 className="text-lg font-medium mb-1">No Machines Found</h3>
                  <p className="text-sm text-center mb-6">You need to set up machines for your workshop locations.</p>
                  {isAdmin && (<Button onClick={() => setIsMachineFormOpen(true)} className="mt-2"><Plus className="mr-1 h-4 w-4" /> Add First Machine</Button>)}
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
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2"><Cpu className="h-4 w-4" /></div>
                            {machine.name}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{machine.machineId}</Badge></TableCell>
                        <TableCell><div className="flex items-center"><MapPin className="h-4 w-4 mr-1 text-gray-500" />{getLocationName(machine.locationId)}</div></TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" className="flex items-center" onClick={() => handleSelectMachine(machine)}><UserPlus className="h-4 w-4 mr-1" />Permissions</Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Mobile Display QR Code"><Smartphone className="h-4 w-4 text-blue-600" /></Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Mobile Display for {machine.name}</DialogTitle>
                                  <DialogDescription>Scan this QR code to access the mobile-friendly machine display page.</DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col items-center justify-center py-4">
                                  <div className="border p-4 bg-white rounded-lg">
                                    <QRCodeSVG value={`${window.location.origin}/display/machine/${machine.id}`} size={200} level="H" includeMargin className="mx-auto" />
                                  </div>
                                  <Button className="mt-4" onClick={() => window.open(`/display/machine/${machine.id}`, "_blank")}>Open Mobile Display</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            {isAdmin && (<Button variant="ghost" size="icon" onClick={() => handleEditMachine(machine)} title="Edit Machine"><Edit className="h-4 w-4" /></Button>)}
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" title="Delete Machine" className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Machine</AlertDialogTitle>
                                    <AlertDialogDescription>Are you sure you want to delete the machine <strong>{machine.name}</strong>?</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteMachine(machine.id)} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
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

        <TabsContent value="permissions">
          {selectedMachine && (
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>User Permissions for {selectedMachine.name}</CardTitle>
                    <CardDescription>Manage which users have access to this machine</CardDescription>
                  </div>
                  {isManagerPlus && (
                    <Dialog open={isPermissionFormOpen} onOpenChange={setIsPermissionFormOpen}>
                      <DialogTrigger asChild>
                        <Button className="flex items-center mt-4 md:mt-0"><UserPlus className="mr-1 h-4 w-4" /> Add User</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add User Permission</DialogTitle>
                          <DialogDescription>Grant a user access to machine {selectedMachine.name}</DialogDescription>
                        </DialogHeader>
                        <PermissionForm
                          users={users}
                          existingPermissions={machinePermissions}
                          onCancel={() => setIsPermissionFormOpen(false)}
                          onSubmit={(data) => addPermissionMutation.mutate({ userId: data.userId, machineId: selectedMachine.id, accessRole: data.accessRole as AccessRole })}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingPermissions ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div>
                ) : !machinePermissions || machinePermissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <UserIcon className="h-12 w-12 mb-2 text-gray-400" />
                    <h3 className="text-lg font-medium mb-1">No User Permissions</h3>
                    <p className="text-sm text-center mb-4">No users have been granted access to this machine</p>
                    {isManagerPlus && (<Button onClick={() => setIsPermissionFormOpen(true)} className="mt-2"><UserPlus className="mr-1 h-4 w-4" /> Add First User</Button>)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Access Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {machinePermissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2"><UserIcon className="h-4 w-4" /></div>
                              {getUserName(permission.userId)}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">
                            <InlineRoleEditor
                              disabled={!isManagerPlus}
                              userId={permission.userId}
                              machineId={selectedMachine.id}
                              value={permission.accessRole as AccessRole}
                              onChange={() => refetchPermissions()}
                            />
                          </TableCell>
                          <TableCell>
                            {isManagerPlus && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="flex items-center text-red-500 hover:text-red-700 hover:bg-red-50"><UserX className="h-4 w-4 mr-1" />Remove Access</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove User Access</AlertDialogTitle>
                                    <AlertDialogDescription>Are you sure you want to remove access for <strong>{getUserName(permission.userId)}</strong> to machine <strong>{selectedMachine.name}</strong>?</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemovePermission(permission.userId)}>Remove</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
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

function MachineForm({ locations, initial, onCancel, onSubmit }: { locations: Location[]; initial?: Partial<InsertMachine>; onCancel: () => void; onSubmit: (data: InsertMachine) => void; }) {
  const form = useForm<z.infer<typeof machineFormSchema>>({
    resolver: zodResolver(machineFormSchema),
    defaultValues: {
      name: initial?.name || "",
      machineId: initial?.machineId || "",
      locationId: initial?.locationId ? Number(initial.locationId) : 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit({ name: values.name, machineId: values.machineId, locationId: Number(values.locationId) }))} className="space-y-4">
        <FormField name="name" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input {...field} placeholder="Machine" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="machineId" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Machine ID</FormLabel>
            <FormControl><Input {...field} placeholder="01" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="locationId" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : undefined}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger></FormControl>
              <SelectContent>
                {locations.map((l) => (<SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{initial?.name ? "Save" : "Create"}</Button>
        </div>
      </form>
    </Form>
  );
}

function PermissionForm({ users, existingPermissions, onCancel, onSubmit }: { users: any[]; existingPermissions: MachinePermission[]; onCancel: () => void; onSubmit: (data: z.infer<typeof permissionFormSchema>) => void; }) {
  const form = useForm<z.infer<typeof permissionFormSchema>>({ resolver: zodResolver(permissionFormSchema), defaultValues: { userId: 0, accessRole: "operator" } });
  const userIdsWithAccess = useMemo(() => new Set(existingPermissions.map((p) => p.userId)), [existingPermissions]);
  const availableUsers = users.filter((u) => !userIdsWithAccess.has(u.id));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="userId" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>User</FormLabel>
            <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : undefined}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger></FormControl>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <SelectItem value="0" disabled>No users available</SelectItem>
                ) : (
                  availableUsers.map((u) => (<SelectItem key={u.id} value={String(u.id)}>{u.fullName || u.username}</SelectItem>))
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="accessRole" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Access Role</FormLabel>
            <Select onValueChange={(v) => field.onChange(v)} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={availableUsers.length === 0}>Add Permission</Button>
        </div>
      </form>
    </Form>
  );
}

function InlineRoleEditor({ disabled, userId, machineId, value, onChange }: { disabled?: boolean; userId: number; machineId: number; value: AccessRole; onChange: () => void; }) {
  const { toast } = useToast();
  const update = useMutation({
    mutationFn: async (role: AccessRole) => apiRequest("PUT", `/api/machine-permissions/${userId}/${machineId}`, { accessRole: role }),
    onSuccess: () => { toast({ title: "Access updated" }); onChange(); },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
  return (
    <Select disabled={disabled} defaultValue={value} onValueChange={(v) => update.mutate(v as AccessRole)}>
      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="operator">Operator</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
