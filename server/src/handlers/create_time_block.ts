
import { db } from '../db';
import { timeBlocksTable, usersTable, tasksTable, eventsTable } from '../db/schema';
import { type CreateTimeBlockInput, type TimeBlock } from '../schema';
import { eq, and, or, lt, gt } from 'drizzle-orm';

export const createTimeBlock = async (input: CreateTimeBlockInput): Promise<TimeBlock> => {
  try {
    // Validate that user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // Validate task exists if task_id is provided
    if (input.task_id) {
      const taskExists = await db.select({ id: tasksTable.id })
        .from(tasksTable)
        .where(and(
          eq(tasksTable.id, input.task_id),
          eq(tasksTable.user_id, input.user_id)
        ))
        .execute();

      if (taskExists.length === 0) {
        throw new Error('Task not found or does not belong to user');
      }
    }

    // Validate event exists if event_id is provided
    if (input.event_id) {
      const eventExists = await db.select({ id: eventsTable.id })
        .from(eventsTable)
        .where(and(
          eq(eventsTable.id, input.event_id),
          eq(eventsTable.user_id, input.user_id)
        ))
        .execute();

      if (eventExists.length === 0) {
        throw new Error('Event not found or does not belong to user');
      }
    }

    // Validate time range (end_time must be after start_time)
    if (input.end_time <= input.start_time) {
      throw new Error('End time must be after start time');
    }

    // Check for conflicting time blocks for the same user
    const conflictingBlocks = await db.select()
      .from(timeBlocksTable)
      .where(and(
        eq(timeBlocksTable.user_id, input.user_id),
        or(
          // New block starts during existing block
          and(
            lt(timeBlocksTable.start_time, input.end_time),
            gt(timeBlocksTable.end_time, input.start_time)
          )
        )
      ))
      .execute();

    if (conflictingBlocks.length > 0) {
      throw new Error('Time block conflicts with existing time blocks');
    }

    // Insert time block record
    const result = await db.insert(timeBlocksTable)
      .values({
        user_id: input.user_id,
        task_id: input.task_id,
        event_id: input.event_id,
        title: input.title,
        start_time: input.start_time,
        end_time: input.end_time,
        color: input.color
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Time block creation failed:', error);
    throw error;
  }
};
