'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Board } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, LayoutGrid, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadBoards();
  }, []);

  async function loadBoards() {
    try {
      const data = await api.getBoards();
      setBoards(data);
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBoard() {
    if (!newBoardName.trim()) return;

    setCreating(true);
    try {
      const board = await api.createBoard({ name: newBoardName });
      setBoards((prev) => [...prev, board]);
      setNewBoardName('');
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">My Boards</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Organize your notes across different boards
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Board
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Board</DialogTitle>
                <DialogDescription>
                  Give your board a name to get started.
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Board name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
              />
              <DialogFooter>
                <Button 
                  onClick={handleCreateBoard} 
                  disabled={creating || !newBoardName.trim()}
                >
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Board
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Boards Grid */}
        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <LayoutGrid className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-medium text-foreground mb-2">No boards yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first board to start organizing your notes and ideas.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <Link key={board.id} href={`/boards/${board.id}`}>
                <Card className="hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">{board.name}</CardTitle>
                    <CardDescription>
                      Created {formatDistanceToNow(new Date(board.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
