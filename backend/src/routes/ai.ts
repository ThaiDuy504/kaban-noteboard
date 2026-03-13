import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import {
  suggestCategoryAndTags,
  checkOllamaHealth,
  isModelAvailable,
} from '../services/ai';
import { db } from '../db';
import { boards, columns } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const aiRouter = Router();

// Get AI suggestions for a note
aiRouter.post('/suggest', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content, boardId } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (content.trim().length < 3) {
      return res.status(400).json({ error: 'Content too short for analysis' });
    }

    const suggestions = await suggestCategoryAndTags(content);

    // If boardId provided, check if column exists for the category and create if not
    let columnId: string | null = null;
    let columnCreated = false;

    if (boardId) {
      // Verify board ownership
      const [board] = await db
        .select()
        .from(boards)
        .where(and(eq(boards.id, boardId), eq(boards.userId, req.userId!)));

      if (board) {
        // Check if a column with this category type exists
        const [existingColumn] = await db
          .select()
          .from(columns)
          .where(and(eq(columns.boardId, boardId), eq(columns.type, suggestions.category)));

        if (existingColumn) {
          columnId = existingColumn.id;
        } else {
          // Create new column for this category
          const existingColumns = await db
            .select()
            .from(columns)
            .where(eq(columns.boardId, boardId));
          
          const maxOrder = existingColumns.length > 0
            ? Math.max(...existingColumns.map((c) => c.order)) + 1
            : 0;

          const [newColumn] = await db.insert(columns).values({
            boardId,
            name: suggestions.category.charAt(0).toUpperCase() + suggestions.category.slice(1),
            type: suggestions.category,
            order: maxOrder,
          }).returning();

          if (newColumn) {
            columnId = newColumn.id;
            columnCreated = true;
          }
        }
      }
    }

    res.json({
      ...suggestions,
      columnId,
      columnCreated,
    });
  } catch (error) {
    console.error('AI suggestion error:', error);

    if (error instanceof Error) {
      if (error.message === 'AI service timeout') {
        return res.status(504).json({ error: 'AI service timeout. Please try again.' });
      }
    }

    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Health check endpoint
aiRouter.get('/health', async (req, res) => {
  const ollamaHealthy = await checkOllamaHealth();
  const modelAvailable = await isModelAvailable('llama3.2');

  res.json({
    status: ollamaHealthy && modelAvailable ? 'ok' : 'degraded',
    ollama: ollamaHealthy,
    model: modelAvailable,
  });
});
