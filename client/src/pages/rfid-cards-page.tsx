import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CreditCard, 
  Plus, 
  Search,
  UserCheck,
  UserX,
  Calendar,
  Trash2,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const cardFormSchema = z.object({
  cardId: z.string().min(1, "Card ID is required"),
  userId: z.string().min(1, "User is required"),
  expiryDate: z.string().optional(),
});

type CardFormValues = z.infer<typeof cardFormSchema>;

export default function RfidCardsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);

  // Fetch RFID cards
  const { data: cardsResponse, isLoading: isLoadingCards } = useQuery({
    queryKey: ["/api/rfid-cards"],
    queryFn: async () => {
      const res = await fetch("/api/rfid-cards");
      if (!res.ok) throw new Error("Failed to fetch RFID cards");
      return res.json();
    },
  });

  // Fetch users for the form
  const { data: usersResponse } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const cards = Array.isArray(cardsResponse) ? cardsResponse : [];
  const users = Array.isArray(usersResponse) ? usersResponse : [];

  // Form for adding/editing cards
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      cardId: "",
      userId: "",
      expiryDate: "",
    },
  });

  // Add card mutation
  const addCardMutation = useMutation({
    mutationFn: async (data: CardFormValues) => {
      const payload = {
        cardId: data.cardId,
        userId: parseInt(data.userId),
        expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : null,
        active: true,
        issueDate: new Date().toISOString(),
      };
      const response = await apiRequest("POST", "/api/rfid-cards", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfid-cards"] });
      setIsAddCardOpen(false);
      form.reset();
      toast({
        title: "RFID Card Added",
        description: "The RFID card has been successfully registered.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add RFID card. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Deactivate card mutation
  const deactivateCardMutation = useMutation({
    mutationFn: async (cardId: number) => {
      const response = await apiRequest("PUT", `/api/rfid-cards/${cardId}`, {
        active: false,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfid-cards"] });
      toast({
        title: "Card Deactivated",
        description: "The RFID card has been deactivated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate card. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter cards based on search term
  const filteredCards = cards.filter((card: any) =>
    card.cardId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (card.user?.username && card.user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (card.user?.fullName && card.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const onSubmit = (data: CardFormValues) => {
    addCardMutation.mutate(data);
  };

  if (isLoadingCards) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">RFID Card Management</h1>
          <p className="text-gray-600">Manage RFID cards for workshop access control</p>
        </div>
        <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add RFID Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New RFID Card</DialogTitle>
              <DialogDescription>
                Register a new RFID card for a user
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cardId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter RFID card ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.fullName} ({user.username})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddCardOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addCardMutation.isPending}>
                    Add Card
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cards.filter((card: any) => card.active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Cards</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cards.filter((card: any) => !card.active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cards.filter((card: any) => {
                if (!card.expiryDate) return false;
                const expiryDate = new Date(card.expiryDate);
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Cards</CardTitle>
          <CardDescription>
            Search by card ID, username, or full name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search RFID cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>RFID Cards</CardTitle>
          <CardDescription>
            Manage RFID card access and assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    No RFID cards found matching your search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCards.map((card: any) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-mono">{card.cardId}</TableCell>
                    <TableCell>
                      {card.user ? (
                        <div>
                          <div className="font-medium">{card.user.fullName}</div>
                          <div className="text-sm text-gray-500">@{card.user.username}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(card.issueDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {card.expiryDate ? (
                        <span className={
                          new Date(card.expiryDate) < new Date() 
                            ? "text-red-600" 
                            : new Date(card.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            ? "text-orange-600"
                            : ""
                        }>
                          {format(new Date(card.expiryDate), "MMM dd, yyyy")}
                        </span>
                      ) : (
                        <span className="text-gray-500">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {card.active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {card.active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deactivateCardMutation.mutate(card.id)}
                            disabled={deactivateCardMutation.isPending}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
