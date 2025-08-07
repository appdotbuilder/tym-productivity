
import { db } from '../db';
import { pomodoroSessionsTable, productivityStatsTable, tasksTable } from '../db/schema';
import { type UpdatePomodoroSessionInput, type PomodoroSession } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export const updatePomodoroSession = async (input: UpdatePomodoroSessionInput): Promise<PomodoroSession> => {
  try {
    // First, get the current session to check user_id and task_id
    const existingSessions = await db.select()
      .from(pomodoroSessionsTable)
      .where(eq(pomodoroSessionsTable.id, input.id))
      .execute();

    if (existingSessions.length === 0) {
      throw new Error('Pomodoro session not found');
    }

    const existingSession = existingSessions[0];

    // Update the pomodoro session
    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    if (input.completed_at !== undefined) {
      updateData.completed_at = input.completed_at;
    }

    // If completing the session, set completed_at to now if not provided
    if (input.status === 'completed' && !input.completed_at) {
      updateData.completed_at = new Date();
    }

    const result = await db.update(pomodoroSessionsTable)
      .set(updateData)
      .where(eq(pomodoroSessionsTable.id, input.id))
      .returning()
      .execute();

    const updatedSession = result[0];

    // If session is completed, update productivity stats and task duration
    if (input.status === 'completed') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Update or create productivity stats for today
      const existingStats = await db.select()
        .from(productivityStatsTable)
        .where(
          and(
            eq(productivityStatsTable.user_id, existingSession.user_id),
            eq(sql`DATE(${productivityStatsTable.date})`, sql`DATE(${today})`)
          )
        )
        .execute();

      if (existingStats.length > 0) {
        // Update existing stats
        await db.update(productivityStatsTable)
          .set({
            total_focus_time: sql`${productivityStatsTable.total_focus_time} + ${existingSession.duration}`,
            pomodoro_sessions: sql`${productivityStatsTable.pomodoro_sessions} + 1`
          })
          .where(eq(productivityStatsTable.id, existingStats[0].id))
          .execute();
      } else {
        // Create new stats entry for today
        await db.insert(productivityStatsTable)
          .values({
            user_id: existingSession.user_id,
            date: today,
            tasks_completed: 0,
            tasks_created: 0,
            total_focus_time: existingSession.duration,
            pomodoro_sessions: 1,
            events_attended: 0
          })
          .execute();
      }

      // If session was linked to a task, update task's actual duration
      if (existingSession.task_id) {
        await db.update(tasksTable)
          .set({
            actual_duration: sql`COALESCE(${tasksTable.actual_duration}, 0) + ${existingSession.duration}`,
            updated_at: new Date()
          })
          .where(eq(tasksTable.id, existingSession.task_id))
          .execute();
      }
    }

    return updatedSession;
  } catch (error) {
    console.error('Pomodoro session update failed:', error);
    throw error;
  }
};
