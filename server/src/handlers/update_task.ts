
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTask = async (input: UpdateTaskInput): Promise<Task> => {
  try {
    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    
    if (input.title !== undefined) updateData['title'] = input.title;
    if (input.description !== undefined) updateData['description'] = input.description;
    if (input.status !== undefined) updateData['status'] = input.status;
    if (input.priority !== undefined) updateData['priority'] = input.priority;
    if (input.due_date !== undefined) updateData['due_date'] = input.due_date;
    if (input.estimated_duration !== undefined) updateData['estimated_duration'] = input.estimated_duration;
    if (input.actual_duration !== undefined) updateData['actual_duration'] = input.actual_duration;

    // Always update the updated_at timestamp
    updateData['updated_at'] = new Date();

    // Update the task
    const result = await db.update(tasksTable)
      .set(updateData)
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
};
