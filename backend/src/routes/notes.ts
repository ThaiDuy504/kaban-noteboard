import { Router } from 'express';
import { db } from '../db';
import { notes, columns, boards, tags, noteTags } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

export const notesRouter = Router();

// All routes require authentication
notesRouter.use(authMiddleware);

// Helper to fetch tags for a note
async function getTagsForNote(noteId: string) {
  const relations = await db
    .select({ tag: tags })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .where(eq(noteTags.noteId, noteId));
  return relations.map((r) => r.tag);
}

// Helper to attach tags to a note
async function withTags<T extends { id: string }>(note: T) {
  return { ...note, tags: await getTagsForNote(note.id) };
}

// Helper to sync tags for a note (find or create, then link)
async function syncTagsForNote(noteId: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    const normalized = tagName.toLowerCase();
    let [tag] = await db.select().from(tags).where(eq(tags.name, normalized));
    if (!tag) {
      [tag] = await db.insert(tags).values({ name: normalized }).returning();
    }
    if (tag) {
      await db.insert(noteTags).values({ noteId, tagId: tag.id });
    }
  }
}

// Get all notes for the current user
notesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, req.userId!))
      .orderBy(asc(notes.updatedAt));

    const notesWithTags = await Promise.all(userNotes.map(withTags));
    res.json(notesWithTags);
  } catch (error) {
    console.error('Get all notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Helper to verify column ownership
async function verifyColumnAccess(columnId: string, userId: string) {
  const [column] = await db.select().from(columns).where(eq(columns.id, columnId));
  if (!column) return null;

  const [board] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.id, column.boardId), eq(boards.userId, userId)));

  return board ? column : null;
}

// Get all notes for a column
notesRouter.get('/column/:columnId', async (req: AuthRequest, res) => {
  try {
    const columnId = req.params.columnId as string;
    if (!columnId) {
      return res.status(400).json({ error: 'Column ID is required' });
    }

    const column = await verifyColumnAccess(columnId, req.userId!);
    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const columnNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.columnId, columnId))
      .orderBy(asc(notes.order));

    const notesWithTags = await Promise.all(columnNotes.map(withTags));
    res.json(notesWithTags);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Get single note
notesRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const noteId = req.params.id as string;
    if (!noteId) {
      return res.status(400).json({ error: 'Note ID is required' });
    }

    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)));

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(await withTags(note));
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// Create note
notesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { columnId, content, tagNames = [] } = req.body;

    if (!columnId || !content) {
      return res.status(400).json({ error: 'columnId and content are required' });
    }

    const column = await verifyColumnAccess(columnId, req.userId!);
    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    // Get max order
    const existingNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.columnId, columnId));
    const maxOrder = existingNotes.length > 0
      ? Math.max(...existingNotes.map((n) => n.order)) + 1
      : 0;

    const [note] = await db.insert(notes).values({
      userId: req.userId!,
      columnId,
      content,
      category: column.name,
      order: maxOrder,
    }).returning();

    if (!note) {
      return res.status(500).json({ error: 'Failed to create note' });
    }

    // Handle tags
    if (tagNames.length > 0) {
      await syncTagsForNote(note.id, tagNames);
    }

    res.status(201).json(await withTags(note));
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
notesRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const noteId = req.params.id as string;
    if (!noteId) {
      return res.status(400).json({ error: 'Note ID is required' });
    }

    const { content, columnId, order, tagNames } = req.body;

    // Verify ownership
    const [existingNote] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)));

    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // If moving to new column, verify access and get new category
    let newCategory: string | undefined;
    if (columnId && columnId !== existingNote.columnId) {
      const column = await verifyColumnAccess(columnId, req.userId!);
      if (!column) {
        return res.status(404).json({ error: 'Target column not found' });
      }
      newCategory = column.name;
    }

    const [note] = await db
      .update(notes)
      .set({
        ...(content !== undefined && { content }),
        ...(columnId !== undefined && { columnId }),
        ...(newCategory !== undefined && { category: newCategory }),
        ...(order !== undefined && { order }),
        updatedAt: new Date(),
      })
      .where(eq(notes.id, noteId))
      .returning();

    if (!note) {
      return res.status(500).json({ error: 'Failed to update note' });
    }

    // Update tags if provided
    if (tagNames !== undefined) {
      await db.delete(noteTags).where(eq(noteTags.noteId, note.id));
      await syncTagsForNote(note.id, tagNames);
    }

    res.json(await withTags(note));
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
notesRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const noteId = req.params.id as string;
    if (!noteId) {
      return res.status(400).json({ error: 'Note ID is required' });
    }

    const [note] = await db
      .delete(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)))
      .returning();

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Move note to different column
notesRouter.post('/:id/move', async (req: AuthRequest, res) => {
  try {
    const noteId = req.params.id as string;
    if (!noteId) {
      return res.status(400).json({ error: 'Note ID is required' });
    }

    const { columnId, order } = req.body;

    if (!columnId) {
      return res.status(400).json({ error: 'columnId is required' });
    }

    // Verify ownership
    const [existingNote] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, req.userId!)));

    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Verify target column access
    const column = await verifyColumnAccess(columnId, req.userId!);
    if (!column) {
      return res.status(404).json({ error: 'Target column not found' });
    }

    const [note] = await db
      .update(notes)
      .set({
        columnId,
        category: column.name,
        order: order ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, noteId))
      .returning();

    if (!note) {
      return res.status(500).json({ error: 'Failed to move note' });
    }

    res.json(await withTags(note));
  } catch (error) {
    console.error('Move note error:', error);
    res.status(500).json({ error: 'Failed to move note' });
  }
});

// Reorder notes in a column
notesRouter.post('/reorder', async (req: AuthRequest, res) => {
  try {
    const { columnId, noteIds } = req.body;

    if (!columnId || !noteIds || !Array.isArray(noteIds)) {
      return res.status(400).json({ error: 'columnId and noteIds array are required' });
    }

    const column = await verifyColumnAccess(columnId, req.userId!);
    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    // Update order for each note
    await Promise.all(
      noteIds.map((id: string, index: number) =>
        db.update(notes).set({ order: index }).where(eq(notes.id, id))
      )
    );

    res.json({ message: 'Notes reordered' });
  } catch (error) {
    console.error('Reorder notes error:', error);
    res.status(500).json({ error: 'Failed to reorder notes' });
  }
});
