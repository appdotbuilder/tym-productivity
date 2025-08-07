
import { db } from '../db';
import { tasksTable, eventsTable, timeBlocksTable } from '../db/schema';
import { type GetCalendarDataInput, type Task, type Event, type TimeBlock } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface CalendarData {
    tasks: Task[];
    events: Event[];
    timeBlocks: TimeBlock[];
}

export async function getCalendarData(input: GetCalendarDataInput): Promise<CalendarData> {
    try {
        const { user_id, start_date, end_date } = input;

        // Query tasks within date range (based on due_date)
        const tasksQuery = db.select()
            .from(tasksTable)
            .where(
                and(
                    eq(tasksTable.user_id, user_id),
                    gte(tasksTable.due_date, start_date),
                    lte(tasksTable.due_date, end_date)
                )
            );

        // Query events within date range (based on start_time)
        const eventsQuery = db.select()
            .from(eventsTable)
            .where(
                and(
                    eq(eventsTable.user_id, user_id),
                    gte(eventsTable.start_time, start_date),
                    lte(eventsTable.start_time, end_date)
                )
            );

        // Query time blocks within date range (based on start_time)
        const timeBlocksQuery = db.select()
            .from(timeBlocksTable)
            .where(
                and(
                    eq(timeBlocksTable.user_id, user_id),
                    gte(timeBlocksTable.start_time, start_date),
                    lte(timeBlocksTable.start_time, end_date)
                )
            );

        // Execute all queries concurrently
        const [tasks, events, timeBlocks] = await Promise.all([
            tasksQuery.execute(),
            eventsQuery.execute(),
            timeBlocksQuery.execute()
        ]);

        return {
            tasks,
            events,
            timeBlocks
        };
    } catch (error) {
        console.error('Failed to get calendar data:', error);
        throw error;
    }
}
