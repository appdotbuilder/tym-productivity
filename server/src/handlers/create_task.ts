
import { db } from '../db';
import { tasksTable, usersTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  try {
    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();
    
    if (users.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert task record
    const result = await db.insert(tasksTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        description: input.description,
        priority: input.priority,
        due_date: input.due_date,
        estimated_duration: input.estimated_duration
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};
