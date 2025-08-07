
import { db } from '../db';
import { pomodoroSessionsTable } from '../db/schema';
import { type CreatePomodoroSessionInput, type PomodoroSession } from '../schema';

export const createPomodoroSession = async (input: CreatePomodoroSessionInput): Promise<PomodoroSession> => {
  try {
    // Insert pomodoro session record
    const result = await db.insert(pomodoroSessionsTable)
      .values({
        user_id: input.user_id,
        task_id: input.task_id,
        duration: input.duration,
        break_duration: input.break_duration,
        status: 'running'  // Default status for new sessions
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Pomodoro session creation failed:', error);
    throw error;
  }
};
