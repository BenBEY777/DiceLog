import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Gamepad2, Users, UtensilsCrossed, LogOut } from "lucide-react";
import GamesManager from "@/components/GamesManager";
import ReservationsManager from "@/components/ReservationsManager";
import MenuManager from "@/components/MenuManager";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    todayReservations: 0,
    totalGames: 0,
    activeReservations: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const [reservationsRes, gamesRes] = await Promise.all([
        supabase
          .from("reservations")
          .select("*", { count: "exact" })
          .eq("reservation_date", today),
        supabase.from("games").select("*", { count: "exact" }).eq("available", true),
      ]);

      setStats({
        todayReservations: reservationsRes.count || 0,
        totalGames: gamesRes.count || 0,
        activeReservations: reservationsRes.data?.filter((r) => r.status === "confirmed").length || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "See you next shift!",
    });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary p-2">
                <Gamepad2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Game Club Manager</h1>
                <p className="text-sm text-muted-foreground">Staff Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">On shift</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Reservations</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayReservations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeReservations} confirmed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Available Games</CardTitle>
              <Gamepad2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGames}</div>
              <p className="text-xs text-muted-foreground">In library</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Tables</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeReservations}</div>
              <p className="text-xs text-muted-foreground">Currently reserved</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reservations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="reservations">
              <Calendar className="h-4 w-4 mr-2" />
              Reservations
            </TabsTrigger>
            <TabsTrigger value="games">
              <Gamepad2 className="h-4 w-4 mr-2" />
              Games
            </TabsTrigger>
            <TabsTrigger value="menu">
              <UtensilsCrossed className="h-4 w-4 mr-2" />
              Menu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reservations" className="space-y-4">
            <ReservationsManager onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <GamesManager onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="menu" className="space-y-4">
            <MenuManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;