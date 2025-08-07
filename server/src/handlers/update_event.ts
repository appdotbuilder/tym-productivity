
import { db } from '../db';
import { eventsTable } from '../db/schema';
import { type UpdateEventInput, type Event } from '../schema';
import { eq } from 'drizzle-orm';

export const updateEvent = async (input: UpdateEventInput): Promise<Event> => {
  try {
    // Build update object with only provided fields
    const updateData: Partial<{
      title: string;
      description: string | null;
      event_type: 'meeting' | 'appointment' | 'personal' | 'work' | 'other';
      start_time: Date;
      end_time: Date;
      location: string | null;
      is_all_day: boolean;
      updated_at: Date;
    }> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.event_type !== undefined) {
      updateData.event_type = input.event_type;
    }

    if (input.start_time !== undefined) {
      updateData.start_time = input.start_time;
    }

    if (input.end_time !== undefined) {
      updateData.end_time = input.end_time;
    }

    if (input.location !== undefined) {
      updateData.location = input.location;
    }

    if (input.is_all_day !== undefined) {
      updateData.is_all_day = input.is_all_day;
    }

    // Update the event
    const result = await db.update(eventsTable)
      .set(updateData)
      .where(eq(eventsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Event with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Event update failed:', error);
    throw error;
  }
};
