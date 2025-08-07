
import { db } from '../db';
import { eventsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteEvent(eventId: number, userId: number): Promise<{ success: boolean }> {
  try {
    // Delete the event - only if it belongs to the user
    // CASCADE DELETE on related reminders and time blocks is handled by database constraints
    const result = await db.delete(eventsTable)
      .where(and(
        eq(eventsTable.id, eventId),
        eq(eventsTable.user_id, userId)
      ))
      .returning()
      .execute();

    // Return success: true if event was found and deleted, false otherwise
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Event deletion failed:', error);
    throw error;
  }
}
