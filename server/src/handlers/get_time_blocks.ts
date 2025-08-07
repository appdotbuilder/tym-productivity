
import { db } from '../db';
import { timeBlocksTable } from '../db/schema';
import { type TimeBlock } from '../schema';
import { eq, gte, lte, and } from 'drizzle-orm';

export async function getTimeBlocks(userId: number, startDate?: Date, endDate?: Date): Promise<TimeBlock[]> {
  try {
    // Build conditions array
    const conditions = [eq(timeBlocksTable.user_id, userId)];

    // Add date range filters if provided
    if (startDate) {
      conditions.push(gte(timeBlocksTable.start_time, startDate));
    }

    if (endDate) {
      conditions.push(lte(timeBlocksTable.end_time, endDate));
    }

    // Build and execute query
    const results = await db.select()
      .from(timeBlocksTable)
      .where(and(...conditions))
      .orderBy(timeBlocksTable.start_time)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get time blocks:', error);
    throw error;
  }
}
