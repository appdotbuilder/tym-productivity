
import { db } from '../db';
import { tasksTable, remindersTable, timeBlocksTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteTask(taskId: number, userId: number): Promise<{ success: boolean }> {
  try {
    // First verify the task exists and belongs to the user
    const existingTask = await db.select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.user_id, userId)))
      .execute();

    if (existingTask.length === 0) {
      throw new Error('Task not found or access denied');
    }

    // Delete related reminders (they reference task_id)
    await db.delete(remindersTable)
      .where(eq(remindersTable.task_id, taskId))
      .execute();

    // Delete related time blocks (they reference task_id)
    await db.delete(timeBlocksTable)
      .where(eq(timeBlocksTable.task_id, taskId))
      .execute();

    // Finally delete the task itself
    await db.delete(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.user_id, userId)))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
}
