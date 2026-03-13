import { Router } from 'express';
import { db } from '../db';
import { columns, boards } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

export const columnsRouter = Router();

// All routes require authentication
columnsRouter.use(authMiddleware);

// Get all columns for a board
columnsRouter.get('/board/:boardId', async (req: AuthRequest, res) => {
  try {
    const boardId = req.params.boardId as string;
    if (!boardId) {
      return res.status(400).json({ error: 'Board ID is required' });
    }

    // Verify board ownership
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
      .where(eq(columns.boardId, boardId))
      .orderBy(asc(columns.order));

    res.json(boardColumns);
  } catch (error) {
    console.error('Get columns error:', error);
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
});

// Create column
columnsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { boardId, name, type = 'custom' } = req.body;

    if (!boardId || !name) {
      return res.status(400).json({ error: 'boardId and name are required' });
    }

    // Verify board ownership
    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.userId, req.userId!)));

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // Get max order
    const existingColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.boardId, boardId));
    const maxOrder = existingColumns.length > 0
      ? Math.max(...existingColumns.map(c => c.order)) + 1
      : 0;

    const [column] = await db.insert(columns).values({
      boardId,
      name,
      type,
      order: maxOrder,
    }).returning();

    res.status(201).json(column);
  } catch (error) {
    console.error('Create column error:', error);
    res.status(500).json({ error: 'Failed to create column' });
  }
});

// Update column
columnsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const columnId = req.params.id as string;
    if (!columnId) {
      return res.status(400).json({ error: 'Column ID is required' });
    }

    const { name, type, order } = req.body;

    // Get column and verify board ownership
    const [existingColumn] = await db
      .select()
      .from(columns)
      .where(eq(columns.id, columnId));

    if (!existingColumn) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, existingColumn.boardId), eq(boards.userId, req.userId!)));

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const [column] = await db
      .update(columns)
      .set({
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(order !== undefined && { order }),
      })
      .where(eq(columns.id, columnId))
      .returning();

    res.json(column);
  } catch (error) {
    console.error('Update column error:', error);
    res.status(500).json({ error: 'Failed to update column' });
  }
});

// Delete column
columnsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const columnId = req.params.id as string;
    if (!columnId) {
      return res.status(400).json({ error: 'Column ID is required' });
    }

    // Get column and verify board ownership
    const [existingColumn] = await db
      .select()
      .from(columns)
      .where(eq(columns.id, columnId));

    if (!existingColumn) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, existingColumn.boardId), eq(boards.userId, req.userId!)));

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    await db.delete(columns).where(eq(columns.id, columnId));

    res.json({ message: 'Column deleted' });
  } catch (error) {
    console.error('Delete column error:', error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

// Reorder columns
columnsRouter.post('/reorder', async (req: AuthRequest, res) => {
  try {
    const { boardId, columnIds } = req.body;

    if (!boardId || !columnIds || !Array.isArray(columnIds)) {
      return res.status(400).json({ error: 'boardId and columnIds array are required' });
    }

    // Verify board ownership
    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.userId, req.userId!)));

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // Update order for each column
    await Promise.all(
      columnIds.map((id: string, index: number) =>
        db.update(columns).set({ order: index }).where(eq(columns.id, id))
      )
    );

    res.json({ message: 'Columns reordered' });
  } catch (error) {
    console.error('Reorder columns error:', error);
    res.status(500).json({ error: 'Failed to reorder columns' });
  }
});
