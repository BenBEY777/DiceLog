import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Game {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface Order {
  id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  menu_items: MenuItem;
}

interface ReservationDetailsProps {
  reservationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const ReservationDetails = ({ reservationId, open, onOpenChange, onUpdate }: ReservationDetailsProps) => {
  const { toast } = useToast();
  const [reservation, setReservation] = useState<any>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [assignedGames, setAssignedGames] = useState<Game[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && reservationId) {
      loadReservationDetails();
      loadGames();
      loadMenuItems();
    }
  }, [open, reservationId]);

  const loadReservationDetails = async () => {
    try {
      const { data: resData, error: resError } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservationId)
        .single();

      if (resError) throw resError;
      setReservation(resData);

      const { data: gamesData, error: gamesError } = await supabase
        .from("reservation_games")
        .select("game_id, games(id, name)")
        .eq("reservation_id", reservationId);

      if (gamesError) throw gamesError;
      setAssignedGames(gamesData.map((item: any) => item.games));

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*, menu_items(id, name, price, category)")
        .eq("reservation_id", reservationId);

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (error: any) {
      toast({
        title: "Error loading details",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGames = async () => {
    const { data } = await supabase
      .from("games")
      .select("id, name")
      .eq("available", true)
      .order("name");
    setGames(data || []);
  };

  const loadMenuItems = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("available", true)
      .order("name");
    setMenuItems(data || []);
  };

  const handleAddGame = async () => {
    if (!selectedGame) return;

    try {
      const { error } = await supabase
        .from("reservation_games")
        .insert([{ reservation_id: reservationId, game_id: selectedGame }]);

      if (error) throw error;
      
      toast({ title: "Game added to reservation" });
      setSelectedGame("");
      loadReservationDetails();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error adding game",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveGame = async (gameId: string) => {
    try {
      const { error } = await supabase
        .from("reservation_games")
        .delete()
        .eq("reservation_id", reservationId)
        .eq("game_id", gameId);

      if (error) throw error;
      
      loadReservationDetails();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error removing game",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddOrder = async () => {
    if (!selectedMenuItem) return;

    try {
      const menuItem = menuItems.find((item) => item.id === selectedMenuItem);
      if (!menuItem) return;

      const { error } = await supabase.from("orders").insert([
        {
          reservation_id: reservationId,
          menu_item_id: selectedMenuItem,
          quantity: quantity,
          price: menuItem.price * quantity,
        },
      ]);

      if (error) throw error;
      
      toast({ title: "Order added" });
      setSelectedMenuItem("");
      setQuantity(1);
      loadReservationDetails();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error adding order",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);

      if (error) throw error;
      
      loadReservationDetails();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error removing order",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateTotal = () => {
    const ordersTotal = orders.reduce((sum, order) => sum + parseFloat(order.price.toString()), 0);
    return ordersTotal.toFixed(2);
  };

  if (loading || !reservation) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reservation Details</DialogTitle>
          <DialogDescription>
            {reservation.customer_name} - {format(new Date(reservation.reservation_date), "MMM dd, yyyy")} at{" "}
            {reservation.reservation_time}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Name:</span> {reservation.customer_name}
              </div>
              {reservation.customer_phone && (
                <div>
                  <span className="text-sm font-medium">Phone:</span> {reservation.customer_phone}
                </div>
              )}
              {reservation.customer_email && (
                <div>
                  <span className="text-sm font-medium">Email:</span> {reservation.customer_email}
                </div>
              )}
              <div>
                <span className="text-sm font-medium">Party Size:</span> {reservation.party_size} people
              </div>
              {reservation.notes && (
                <div>
                  <span className="text-sm font-medium">Notes:</span> {reservation.notes}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Assigned Games</CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select game" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          {game.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAddGame} disabled={!selectedGame}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {assignedGames.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No games assigned yet
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {assignedGames.map((game) => (
                    <Badge key={game.id} variant="secondary" className="px-3 py-1">
                      {game.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-2"
                        onClick={() => handleRemoveGame(game.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Food & Drinks</CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedMenuItem} onValueChange={setSelectedMenuItem}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (${item.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={quantity.toString()} onValueChange={(v) => setQuantity(parseInt(v))}>
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAddOrder} disabled={!selectedMenuItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">No orders yet</div>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 rounded-md bg-secondary/50"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{order.quantity}x</Badge>
                        <span className="text-sm">{order.menu_items.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {order.menu_items.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">${order.price}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOrder(order.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold text-primary">${calculateTotal()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationDetails;