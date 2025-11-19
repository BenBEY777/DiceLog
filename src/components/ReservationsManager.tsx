import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Search, Filter, DatabaseIcon, ListFilter, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./AuthProvider";
import ReservationDetails from "./ReservationDetails";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { DropdownMenuGroup, DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";
import { Calendar } from "./ui/calendar";
import { type DateRange } from "react-day-picker"

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  notes: string | null;
}

interface ReservationsManagerProps {
  onUpdate?: () => void;
}

const ReservationsManager = ({ onUpdate }: ReservationsManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [searchField, setSearchField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    reservation_date: "",
    reservation_time: "",
    party_size: "2",
    notes: "",
  });
  const [filterData, setFilterData] = useState({
    reservation_time_from: "",
    reservation_time_until: "",
    max_party_size: "",
    status: ""
  });
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();
  const [filterUsed, setFilterUsed] = useState<boolean>(false);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {

      console.log("lalala")

      let query = supabase
        .from("reservations")
        .select("*")
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

      if (searchField && searchField.trim() !== "") {
        query = query.or(
          `customer_name.ilike.%${searchField}%,` +
          `customer_phone.ilike.%${searchField}%,` +
          `customer_email.ilike.%${searchField}%,` +
          `notes.ilike.%${searchField}%`
        );
      }

      if (filterDateRange) {
        query = query
        .gte('reservation_date', `${filterDateRange.from.getFullYear()}-${filterDateRange.from.getMonth()+1}-${filterDateRange.from.getDate()}`)
        .lte('reservation_date', `${filterDateRange.to.getFullYear()}-${filterDateRange.to.getMonth()+1}-${filterDateRange.to.getDate()}`);
      }

      if (filterData.reservation_time_from || filterData.reservation_time_until) {
        query = query
        .gte('reservation_time', filterData.reservation_time_from || "00:00:00")
        .lte('reservation_time', filterData.reservation_time_until || "23:59:59");
      }

      if (filterData.max_party_size) {
        query = query.lte('party_size', filterData.max_party_size);
      }

      if (filterData.status) {
        query = query.eq('status', filterData.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReservations(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading reservations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      reservation_date: "",
      reservation_time: "",
      party_size: "2",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const reservationData = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone || null,
        customer_email: formData.customer_email || null,
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        party_size: parseInt(formData.party_size),
        notes: formData.notes || null,
        status: "confirmed",
        created_by: user?.id,
      };

      const { error } = await supabase.from("reservations").insert([reservationData]);

      if (error) throw error;
      
      toast({ title: "Reservation created successfully" });
      setDialogOpen(false);
      resetForm();
      loadReservations();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error creating reservation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "completed") {
        updateData.completed_by = user?.id;
      }

      const { error } = await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      loadReservations();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const applyFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFilterUsed(true);
    // loadReservations();
  };

  const handleFilterClear = async (e: React.FormEvent) => {
    e.preventDefault();

    setFilterData({
      reservation_time_from: "",
      reservation_time_until: "",
      max_party_size: "",
      status: ""
    });

    setFilterDateRange(undefined);

    if (filterUsed) {
      setFilterUsed(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, [filterUsed]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default";
      case "in-progress":
        return "secondary";
      case "completed":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reservations</CardTitle>
              <CardDescription>Manage customer bookings and table assignments</CardDescription>
            </div>

            <div className="flex space-x-5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-amber-500 text-white  hover:bg-amber-400">
                    <Filter className="h-auto" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                  {/* <DropdownMenuItem> */}
                  <form onSubmit={applyFilter} className="space-y-4 mx-2 my-2">
                    <div className="flex gap-3 max-w-fit">
                      <div>
                        <Calendar
                          mode="range"
                          defaultMonth={filterDateRange?.from}
                          selected={filterDateRange}
                          onSelect={setFilterDateRange}
                          numberOfMonths={2}
                          className="rounded-lg border shadow-sm"
                        />
                      </div>
                    
                      <div>
                        <div className="flex justify-between gap-2">
                          <div>
                            <Label htmlFor="reservation_time_from">Time from</Label>
                            <Input
                              id="reservation_time_from"
                              type="time"
                              value={filterData.reservation_time_from}
                              onChange={(e) => setFilterData({ ...filterData, reservation_time_from: e.target.value })}
                              className="w-max"
                            />
                          </div>
                          <div>
                            <Label htmlFor="reservation_time_until">Time until</Label>
                            <Input
                              id="reservation_time_until"
                              type="time"
                              value={filterData.reservation_time_until}
                              onChange={(e) => setFilterData({ ...filterData, reservation_time_until: e.target.value })}
                              className="w-max"
                            />
                          </div>
                        </div>
                        <div className="mt-2">
                          <Label htmlFor="max_party_size">Max party size</Label>
                          <Input
                            id="max_party_size"
                            type="number"
                            min="1"
                            value={filterData.max_party_size}
                            onChange={(e) => setFilterData({ ...filterData, max_party_size: e.target.value })}
                          />
                        </div>

                        <div className="mt-2">
                          <Label htmlFor="status_filter">Status</Label>
                          <Select
                            value={filterData.status}
                            onValueChange={(value) => setFilterData({ ...filterData, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All"/>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex gap-2 w-max mt-2">
                          <Button type="submit" className="bg-green-600 hover:bg-green-500">
                            <ListFilter/>
                            Apply
                          </Button>
                          <Button type="button" className="bg-red-600 hover:bg-red-500"
                            onClick={handleFilterClear}
                            >
                            <Trash2/>
                            Clear
                          </Button>
                        </div>
                      </div>
                      
                    </div>
                  </form>
                  {/* </DropdownMenuItem> */}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <form onSubmit={applyFilter} className="">
                <Input 
                  type="search" 
                  placeholder="Search anything"
                  onChange={(e) => setSearchField( e.target.value )}
                  className=""></Input>
              </form>
              
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Reservation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Reservation</DialogTitle>
                    <DialogDescription>Add a new customer reservation</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer_name">Customer Name *</Label>
                      <Input
                        id="customer_name"
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_phone">Phone</Label>
                      <Input
                        id="customer_phone"
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_email">Email</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reservation_date">Date *</Label>
                        <Input
                          id="reservation_date"
                          type="date"
                          value={formData.reservation_date}
                          onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reservation_time">Time *</Label>
                        <Input
                          id="reservation_time"
                          type="time"
                          value={formData.reservation_time}
                          onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="party_size">Party Size *</Label>
                      <Input
                        id="party_size"
                        type="number"
                        min="1"
                        value={formData.party_size}
                        onChange={(e) => setFormData({ ...formData, party_size: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create Reservation</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading reservations...</div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reservations yet. Create your first reservation!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Party Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <div className="font-medium">{reservation.customer_name}</div>
                      {reservation.customer_phone && (
                        <div className="text-sm text-muted-foreground">{reservation.customer_phone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{format(new Date(reservation.reservation_date), "MMM dd, yyyy")}</div>
                      <div className="text-sm text-muted-foreground">{reservation.reservation_time}</div>
                    </TableCell>
                    <TableCell>{reservation.party_size} people</TableCell>
                    <TableCell>
                      <Select
                        value={reservation.status}
                        onValueChange={(value) => handleStatusChange(reservation.id, value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedReservation(reservation.id);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedReservation && (
        <ReservationDetails
          reservationId={selectedReservation}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          onUpdate={() => {
            loadReservations();
            onUpdate?.();
          }}
        />
      )}
    </>
  );
};

export default ReservationsManager;