import { Router } from 'express';
import { db } from '../db';
import { boards, columns, notes, tags, noteTags } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

export const boardsRouter = Router();

// All routes require authentication
boardsRouter.use(authMiddleware);

// Get all boards for user
boardsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userBoards = await db
      .select()
      .from(boards)
      .where(eq(boards.userId, req.userId!))
      .orderBy(asc(boards.order));

    res.json(userBoards);
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// Get single board with columns and notes
boardsRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const boardId = req.params.id as string;
    if (!boardId) {
      return res.status(400).json({ error: 'Board ID is required' });
    }

    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.userId, req.userId!)));

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const boardColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.boardId, board.id))
      .orderBy(asc(columns.order));

    // Fetch notes with tags for each column
    const columnsWithNotes = await Promise.all(
      boardColumns.map(async (column) => {
        const columnNotes = await db
          .select()
          .from(notes)
          .where(eq(notes.columnId, column.id))
          .orderBy(asc(notes.order));

        // Get tags for each note
        const notesWithTags = await Promise.all(
          columnNotes.map(async (note) => {
            const noteTags_ = await db
              .select({ id: tags.id, name: tags.name, isAiGenerated: tags.isAiGenerated })
              .from(noteTags)
              .innerJoin(tags, eq(noteTags.tagId, tags.id))
              .where(eq(noteTags.noteId, note.id));

            return { ...note, tags: noteTags_ };
          })
        );

        return { ...column, notes: notesWithTags };
      })
    );

    res.json({ ...board, columns: columnsWithNotes });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

// Create board
boardsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Get max order for user's boards
    const existingBoards = await db
      .select()
      .from(boards)
      .where(eq(boards.userId, req.userId!));
    const maxOrder = existingBoards.length > 0
      ? Math.max(...existingBoards.map(b => b.order)) + 1
      : 0;

    const [board] = await db.insert(boards).values({
      userId: req.userId!,
      name,
      order: maxOrder,
    }).returning();

    if (!board) {
      return res.status(500).json({ error: 'Failed to create board' });
    }

    // Create default columns
    const defaultColumns = [
      { boardId: board.id, name: 'To Do', type: 'todo', order: 0 },
      { boardId: board.id, name: 'Ideas', type: 'idea', order: 1 },
      { boardId: board.id, name: 'Questions', type: 'question', order: 2 },
    ];

    await db.insert(columns).values(defaultColumns);

    res.status(201).json(board);
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// Update board
boardsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const boardId = req.params.id as string;
    if (!boardId) {
      return res.status(400).json({ error: 'Board ID is required' });
    }

    const { name, order } = req.body;

    const [board] = await db
      .update(boards)
      .set({
        ...(name !== undefined && { name }),
        ...(order !== undefined && { order }),
      })
      .where(and(eq(boards.id, boardId), eq(boards.userId, req.userId!)))
      .returning();

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json(board);
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

// Delete board
boardsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const boardId = req.params.id as string;
    if (!boardId) {
      return res.status(400).json({ error: 'Board ID is required' });
    }

    const [board] = await db
      .delete(boards)
      .where(and(eq(boards.id, boardId), eq(boards.userId, req.userId!)))
      .returning();

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json({ message: 'Board deleted' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});
