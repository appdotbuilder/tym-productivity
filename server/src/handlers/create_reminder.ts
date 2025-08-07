
import { db } from '../db';
import { remindersTable, tasksTable, eventsTable } from '../db/schema';
import { type CreateReminderInput, type Reminder } from '../schema';
import { eq } from 'drizzle-orm';

export const createReminder = async (input: CreateReminderInput): Promise<Reminder> => {
  try {
    // Validate that either task_id or event_id is provided (not both)
    if ((input.task_id && input.event_id) || (!input.task_id && !input.event_id)) {
      throw new Error('Either task_id or event_id must be provided, but not both');
    }

    // Validate that the referenced task exists if task_id is provided
    if (input.task_id) {
      const task = await db.select()
        .from(tasksTable)
        .where(eq(tasksTable.id, input.task_id))
        .execute();
      
      if (task.length === 0) {
        throw new Error('Referenced task does not exist');
      }
    }

    // Validate that the referenced event exists if event_id is provided
    if (input.event_id) {
      const event = await db.select()
        .from(eventsTable)
        .where(eq(eventsTable.id, input.event_id))
        .execute();
      
      if (event.length === 0) {
        throw new Error('Referenced event does not exist');
      }
    }

    // Insert reminder record
    const result = await db.insert(remindersTable)
      .values({
        user_id: input.user_id,
        task_id: input.task_id,
        event_id: input.event_id,
        reminder_type: input.reminder_type,
        reminder_time: input.reminder_time,
        message: input.message,
        is_sent: false // Default value
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Reminder creation failed:', error);
    throw error;
  }
};
