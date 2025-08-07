
import { db } from '../db';
import { tasksTable, eventsTable, timeBlocksTable, pomodoroSessionsTable } from '../db/schema';
import { type Task, type Event, type TimeBlock, type PomodoroSession } from '../schema';
import { eq, gt, and, SQL } from 'drizzle-orm';

export interface SyncData {
  tasks: Task[];
  events: Event[];
  timeBlocks: TimeBlock[];
  pomodoroSessions: PomodoroSession[];
  lastSyncTimestamp: Date;
}

export async function syncUserData(userId: number, lastSyncTimestamp?: Date): Promise<SyncData> {
  try {
    const currentTimestamp = new Date();
    
    // Build base conditions for user filtering
    const baseConditions: SQL<unknown>[] = [eq(tasksTable.user_id, userId)];
    
    // Add timestamp condition if provided
    const taskConditions = [...baseConditions];
    const eventConditions: SQL<unknown>[] = [eq(eventsTable.user_id, userId)];
    const timeBlockConditions: SQL<unknown>[] = [eq(timeBlocksTable.user_id, userId)];
    const pomodoroConditions: SQL<unknown>[] = [eq(pomodoroSessionsTable.user_id, userId)];

    if (lastSyncTimestamp) {
      taskConditions.push(gt(tasksTable.updated_at, lastSyncTimestamp));
      eventConditions.push(gt(eventsTable.updated_at, lastSyncTimestamp));
      timeBlockConditions.push(gt(timeBlocksTable.created_at, lastSyncTimestamp));
      pomodoroConditions.push(gt(pomodoroSessionsTable.created_at, lastSyncTimestamp));
    }

    // Build queries with conditions
    const tasksQuery = db.select()
      .from(tasksTable)
      .where(taskConditions.length === 1 ? taskConditions[0] : and(...taskConditions));

    const eventsQuery = db.select()
      .from(eventsTable)
      .where(eventConditions.length === 1 ? eventConditions[0] : and(...eventConditions));

    const timeBlocksQuery = db.select()
      .from(timeBlocksTable)
      .where(timeBlockConditions.length === 1 ? timeBlockConditions[0] : and(...timeBlockConditions));

    const pomodoroQuery = db.select()
      .from(pomodoroSessionsTable)
      .where(pomodoroConditions.length === 1 ? pomodoroConditions[0] : and(...pomodoroConditions));

    // Execute all queries concurrently
    const [tasks, events, timeBlocks, pomodoroSessions] = await Promise.all([
      tasksQuery.execute(),
      eventsQuery.execute(),
      timeBlocksQuery.execute(),
      pomodoroQuery.execute()
    ]);

    return {
      tasks,
      events,
      timeBlocks,
      pomodoroSessions,
      lastSyncTimestamp: currentTimestamp
    };
  } catch (error) {
    console.error('User data sync failed:', error);
    throw error;
  }
}
