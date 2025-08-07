
import { db } from '../db';
import { pomodoroSessionsTable, tasksTable } from '../db/schema';
import { type PomodoroSession } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getPomodoroSessions(userId: number): Promise<PomodoroSession[]> {
  try {
    // Query pomodoro sessions with optional task information
    const results = await db.select({
      id: pomodoroSessionsTable.id,
      user_id: pomodoroSessionsTable.user_id,
      task_id: pomodoroSessionsTable.task_id,
      duration: pomodoroSessionsTable.duration,
      break_duration: pomodoroSessionsTable.break_duration,
      status: pomodoroSessionsTable.status,
      started_at: pomodoroSessionsTable.started_at,
      completed_at: pomodoroSessionsTable.completed_at,
      created_at: pomodoroSessionsTable.created_at,
    })
      .from(pomodoroSessionsTable)
      .where(eq(pomodoroSessionsTable.user_id, userId))
      .orderBy(desc(pomodoroSessionsTable.started_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch pomodoro sessions:', error);
    throw error;
  }
}
