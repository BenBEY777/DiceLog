import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./AuthProvider";

interface Game {
  id: string;
  name: string;
  min_players: number | null;
  max_players: number | null;
  duration_minutes: number | null;
  complexity: string | null;
  description: string | null;
  available: boolean;
}

interface GamesManagerProps {
  onUpdate?: () => void;
}

const GamesManager = ({ onUpdate }: GamesManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    min_players: "",
    max_players: "",
    duration_minutes: "",
    complexity: "",
    description: "",
  });

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("name");

      if (error) throw error;
      setGames(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading games",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      min_players: "",
      max_players: "",
      duration_minutes: "",
      complexity: "",
      description: "",
    });
    setEditingGame(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const gameData = {
        name: formData.name,
        min_players: formData.min_players ? parseInt(formData.min_players) : null,
        max_players: formData.max_players ? parseInt(formData.max_players) : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        complexity: formData.complexity || null,
        description: formData.description || null,
        available: true,
        created_by: user?.id,
      };

      if (editingGame) {
        const { error } = await supabase
          .from("games")
          .update(gameData)
          .eq("id", editingGame.id);

        if (error) throw error;
        toast({ title: "Game updated successfully" });
      } else {
        const { error } = await supabase.from("games").insert([gameData]);

        if (error) throw error;
        toast({ title: "Game added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      loadGames();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error saving game",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setFormData({
      name: game.name,
      min_players: game.min_players?.toString() || "",
      max_players: game.max_players?.toString() || "",
      duration_minutes: game.duration_minutes?.toString() || "",
      complexity: game.complexity || "",
      description: game.description || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this game?")) return;

    try {
      const { error } = await supabase.from("games").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Game deleted successfully" });
      loadGames();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error deleting game",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleAvailability = async (game: Game) => {
    try {
      const { error } = await supabase
        .from("games")
        .update({ available: !game.available })
        .eq("id", game.id);

      if (error) throw error;
      loadGames();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error updating game",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Game Library</CardTitle>
            <CardDescription>Manage your board game collection</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Game
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGame ? "Edit Game" : "Add New Game"}</DialogTitle>
                <DialogDescription>
                  {editingGame ? "Update game details" : "Add a new game to your library"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Game Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_players">Min Players</Label>
                    <Input
                      id="min_players"
                      type="number"
                      value={formData.min_players}
                      onChange={(e) => setFormData({ ...formData, min_players: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_players">Max Players</Label>
                    <Input
                      id="max_players"
                      type="number"
                      value={formData.max_players}
                      onChange={(e) => setFormData({ ...formData, max_players: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complexity">Complexity</Label>
                  <Input
                    id="complexity"
                    placeholder="Light, Medium, Heavy"
                    value={formData.complexity}
                    onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingGame ? "Update" : "Add"} Game
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading games...</div>
        ) : games.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No games yet. Add your first game to get started!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Complexity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell className="font-medium">{game.name}</TableCell>
                  <TableCell>
                    {game.min_players && game.max_players
                      ? `${game.min_players}-${game.max_players}`
                      : "-"}
                  </TableCell>
                  <TableCell>{game.duration_minutes ? `${game.duration_minutes}m` : "-"}</TableCell>
                  <TableCell>{game.complexity || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={game.available ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleAvailability(game)}
                    >
                      {game.available ? "Available" : "Unavailable"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(game)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(game.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default GamesManager;