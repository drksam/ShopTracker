import React, { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Shield, UserPlus, Pencil, RefreshCw, Power, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "admin" | "manager" | "office" | "shop";

async function apiRequest(method: string, url: string, body?: any) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.status !== 204 ? res.json() : null;
}

export default function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManagerPlus = user && ["admin", "manager"].includes(user.role);
  const callerRole = user?.role as Role | undefined;

  const { data: users = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: !!isManagerPlus,
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<null | any>(null);
  const [pwResetTarget, setPwResetTarget] = useState<null | any>(null);

  const canAssignRoles: Role[] = useMemo(() => {
    if (!callerRole) return ["shop"]; // conservative default
    const order: Role[] = ["shop", "office", "manager", "admin"];
    const idx = order.indexOf(callerRole);
    return order.slice(0, idx + 1);
  }, [callerRole]);

  const createMutation = useMutation({
    mutationFn: async (payload: { username: string; fullName: string; email?: string; role: Role; password: string; active: boolean }) =>
      apiRequest("POST", "/api/users", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created" });
      setOpenCreate(false);
    },
    onError: (e: any) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ fullName: string; email?: string; role: Role; active: boolean }> }) =>
      apiRequest("PUT", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User updated" });
      setOpenEdit(null);
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) =>
      apiRequest("PUT", `/api/users/${id}`, { password }),
    onSuccess: () => {
      toast({ title: "Password reset" });
      setPwResetTarget(null);
    },
    onError: (e: any) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  if (!isManagerPlus) {
    return (
      <div className="container mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only managers and admins can view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button variant="outline" onClick={() => setOpenCreate(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary" />
            Users
          </CardTitle>
          <CardDescription>Create, edit, deactivate, reset password, or delete users.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading…</div>
          ) : error ? (
            <div className="text-red-600">Failed to load users.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.fullName}</TableCell>
                    <TableCell>{u.email || "-"}</TableCell>
                    <TableCell className="capitalize">{u.role}</TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-0.5 rounded text-xs", u.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700")}>{u.active ? "Active" : "Inactive"}</span>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setOpenEdit(u)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPwResetTarget(u)}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reset PW
                      </Button>
                      <Button size="sm" variant={u.active ? "destructive" : "default"} onClick={() => updateMutation.mutate({ id: u.id, data: { active: !u.active } })}>
                        <Power className="h-3.5 w-3.5 mr-1" /> {u.active ? "Deactivate" : "Reactivate"}
                      </Button>
                      {user?.role === "admin" && (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
                          if (confirm("Delete this user? This cannot be undone.")) deleteMutation.mutate(u.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Managers and admins can create users. Role cannot exceed your own.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="jdoe" onChange={(e) => (createDraft.username = e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="Jane Doe" onChange={(e) => (createDraft.fullName = e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="jane@example.com" onChange={(e) => (createDraft.email = e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="role">Role</Label>
              <Select onValueChange={(v) => (createDraft.role = v as Role)}>
                <SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {canAssignRoles.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" onChange={(e) => (createDraft.password = e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="active" defaultChecked onCheckedChange={(v) => (createDraft.active = !!v)} />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!createDraft.username || !createDraft.fullName || !createDraft.password) {
                toast({ title: "Missing fields", description: "Username, Full Name, and Password are required.", variant: "destructive" });
                return;
              }
              if (!createDraft.role) createDraft.role = (canAssignRoles[0] as Role);
              createMutation.mutate(createDraft as any);
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!openEdit} onOpenChange={(v) => setOpenEdit(v ? openEdit : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Change profile fields and role (not above your own).</DialogDescription>
          </DialogHeader>
          {openEdit && (
            <div className="grid gap-3 py-2">
              <div className="grid gap-1">
                <Label>Username</Label>
                <Input value={openEdit.username} disabled />
              </div>
              <div className="grid gap-1">
                <Label>Full Name</Label>
                <Input defaultValue={openEdit.fullName} onChange={(e) => (editDraft.fullName = e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Email</Label>
                <Input defaultValue={openEdit.email || ""} onChange={(e) => (editDraft.email = e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Role</Label>
                <Select defaultValue={openEdit.role} onValueChange={(v) => (editDraft.role = v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {canAssignRoles.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="active-edit" defaultChecked={!!openEdit.active} onCheckedChange={(v) => (editDraft.active = !!v)} />
                <Label htmlFor="active-edit">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(null)}>Cancel</Button>
            {openEdit && (
              <Button onClick={() => updateMutation.mutate({ id: openEdit.id, data: editDraft })}>Save</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!pwResetTarget} onOpenChange={(v) => setPwResetTarget(v ? pwResetTarget : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter a new password for this user.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1 py-2">
            <Label htmlFor="newpw">New Password</Label>
            <Input id="newpw" type="password" onChange={(e) => (pwDraft.password = e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwResetTarget(null)}>Cancel</Button>
            {pwResetTarget && (
              <Button onClick={() => {
                if (!pwDraft.password) {
                  toast({ title: "Missing password", variant: "destructive" });
                  return;
                }
                resetPasswordMutation.mutate({ id: pwResetTarget.id, password: pwDraft.password });
              }}>Update</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple mutable drafts in module scope (kept small and reset per dialog open)
const createDraft: { username?: string; fullName?: string; email?: string; role?: Role; password?: string; active?: boolean } = {};
const editDraft: { fullName?: string; email?: string; role?: Role; active?: boolean } = {};
const pwDraft: { password?: string } = {};
