
import { db } from '../db';
import { eventsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Event } from '../schema';

export const getEvents = async (userId: number): Promise<Event[]> => {
  try {
    const results = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.user_id, userId))
      .execute();

    return results;
  } catch (error) {
    console.error('Get events failed:', error);
    throw error;
  }
};
