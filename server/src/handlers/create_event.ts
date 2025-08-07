
import { db } from '../db';
import { eventsTable, usersTable } from '../db/schema';
import { type CreateEventInput, type Event } from '../schema';
import { eq } from 'drizzle-orm';

export const createEvent = async (input: CreateEventInput): Promise<Event> => {
  try {
    // Validate that user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Validate time range
    if (input.start_time >= input.end_time) {
      throw new Error('Start time must be before end time');
    }

    // Insert event record
    const result = await db.insert(eventsTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        description: input.description,
        event_type: input.event_type,
        start_time: input.start_time,
        end_time: input.end_time,
        location: input.location,
        is_all_day: input.is_all_day
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Event creation failed:', error);
    throw error;
  }
};
