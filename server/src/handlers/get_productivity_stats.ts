
import { db } from '../db';
import { productivityStatsTable } from '../db/schema';
import { type GetProductivityStatsInput, type ProductivityStats } from '../schema';
import { and, gte, lte, eq, asc } from 'drizzle-orm';

export async function getProductivityStats(input: GetProductivityStatsInput): Promise<ProductivityStats[]> {
  try {
    // Build conditions array
    const conditions = [];
    
    // Always filter by user_id
    conditions.push(eq(productivityStatsTable.user_id, input.user_id));
    
    // Filter by date range
    conditions.push(gte(productivityStatsTable.date, input.start_date));
    conditions.push(lte(productivityStatsTable.date, input.end_date));

    // Execute query with all conditions and ordering
    const results = await db.select()
      .from(productivityStatsTable)
      .where(and(...conditions))
      .orderBy(asc(productivityStatsTable.date))
      .execute();

    // Convert any needed fields - all fields are already the correct types
    return results;
  } catch (error) {
    console.error('Get productivity stats failed:', error);
    throw error;
  }
}
