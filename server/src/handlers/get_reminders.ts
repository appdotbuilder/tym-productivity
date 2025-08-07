
import { db } from '../db';
import { remindersTable, tasksTable, eventsTable } from '../db/schema';
import { type Reminder } from '../schema';
import { eq, and, or, isNull, lte } from 'drizzle-orm';

export async function getReminders(userId: number): Promise<Reminder[]> {
  try {
    // Get all pending reminders for the user that should be sent (reminder_time <= now)
    const now = new Date();
    
    const results = await db.select({
      // Reminder fields
      id: remindersTable.id,
      user_id: remindersTable.user_id,
      task_id: remindersTable.task_id,
      event_id: remindersTable.event_id,
      reminder_type: remindersTable.reminder_type,
      reminder_time: remindersTable.reminder_time,
      message: remindersTable.message,
      is_sent: remindersTable.is_sent,
      created_at: remindersTable.created_at,
      // Related task info
      task_title: tasksTable.title,
      task_status: tasksTable.status,
      // Related event info
      event_title: eventsTable.title,
      event_start_time: eventsTable.start_time
    })
    .from(remindersTable)
    .leftJoin(tasksTable, eq(remindersTable.task_id, tasksTable.id))
    .leftJoin(eventsTable, eq(remindersTable.event_id, eventsTable.id))
    .where(
      and(
        eq(remindersTable.user_id, userId),
        eq(remindersTable.is_sent, false),
        lte(remindersTable.reminder_time, now)
      )
    )
    .execute();

    // Transform results to match Reminder schema
    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      task_id: result.task_id,
      event_id: result.event_id,
      reminder_type: result.reminder_type,
      reminder_time: result.reminder_time,
      message: result.message,
      is_sent: result.is_sent,
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Get reminders failed:', error);
    throw error;
  }
}
