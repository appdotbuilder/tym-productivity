
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, pomodoroSessionsTable, productivityStatsTable } from '../db/schema';
import { type UpdatePomodoroSessionInput } from '../schema';
import { updatePomodoroSession } from '../handlers/update_pomodoro_session';
import { eq, sql } from 'drizzle-orm';

describe('updatePomodoroSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testTaskId: number;
  let testSessionId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: testUserId,
        title: 'Test Task',
        description: 'A task for testing',
        priority: 'medium'
      })
      .returning()
      .execute();
    testTaskId = taskResult[0].id;

    // Create test pomodoro session
    const sessionResult = await db.insert(pomodoroSessionsTable)
      .values({
        user_id: testUserId,
        task_id: testTaskId,
        duration: 25,
        break_duration: 5,
        status: 'running'
      })
      .returning()
      .execute();
    testSessionId = sessionResult[0].id;
  });

  it('should update pomodoro session status', async () => {
    const input: UpdatePomodoroSessionInput = {
      id: testSessionId,
      status: 'paused'
    };

    const result = await updatePomodoroSession(input);

    expect(result.id).toEqual(testSessionId);
    expect(result.status).toEqual('paused');
    expect(result.user_id).toEqual(testUserId);
    expect(result.task_id).toEqual(testTaskId);
    expect(result.duration).toEqual(25);
    expect(result.break_duration).toEqual(5);
  });

  it('should complete session with provided completion time', async () => {
    const completionTime = new Date();
    const input: UpdatePomodoroSessionInput = {
      id: testSessionId,
      status: 'completed',
      completed_at: completionTime
    };

    const result = await updatePomodoroSession(input);

    expect(result.status).toEqual('completed');
    expect(result.completed_at).toEqual(completionTime);
  });

  it('should complete session and set completion time automatically', async () => {
    const input: UpdatePomodoroSessionInput = {
      id: testSessionId,
      status: 'completed'
    };

    const result = await updatePomodoroSession(input);

    expect(result.status).toEqual('completed');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.completed_at).not.toBeNull();
  });

  it('should update productivity stats when session is completed', async () => {
    const input: UpdatePomodoroSessionInput = {
      id: testSessionId,
      status: 'completed'
    };

    await updatePomodoroSession(input);

    // Check productivity stats were created/updated
    const stats = await db.select()
      .from(productivityStatsTable)
      .where(eq(productivityStatsTable.user_id, testUserId))
      .execute();

    expect(stats).toHaveLength(1);
    expect(stats[0].total_focus_time).toEqual(25);
    expect(stats[0].pomodoro_sessions).toEqual(1);
    expect(stats[0].user_id).toEqual(testUserId);
  });

  it('should update existing productivity stats when session is completed', async () => {
    // Create existing stats for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await db.insert(productivityStatsTable)
      .values({
        user_id: testUserId,
        date: today,
        tasks_completed: 2,
        tasks_created: 3,
        total_focus_time: 50,
        pomodoro_sessions: 2,
        events_attended: 1
      })
      .execute();

    const input: UpdatePomodoroSessionInput = {
      id: testSessionId,
      status: 'completed'
    };

    await updatePomodoroSession(input);

    // Check stats were updated
    const stats = await db.select()
      .from(productivityStatsTable)
      .where(eq(productivityStatsTable.user_id, testUserId))
      .execute();

    expect(stats).toHaveLength(1);
    expect(stats[0].total_focus_time).toEqual(75); // 50 + 25
    expect(stats[0].pomodoro_sessions).toEqual(3); // 2 + 1
    expect(stats[0].tasks_completed).toEqual(2); // unchanged
    expect(stats[0].tasks_created).toEqual(3); // unchanged
  });

  it('should update task actual duration when session is completed', async () => {
    const input: UpdatePomodoroSessionInput = {
      id: testSessionId,
      status: 'completed'
    };

    await updatePomodoroSession(input);

    // Check task actual duration was updated
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].actual_duration).toEqual(25);
  });

  it('should update task actual duration when task already has duration', async () => {
    // Set initial actual duration
    await db.update(tasksTable)
      .set({ actual_duration: 30 })
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    const input: UpdatePomodoroSessionInput = {
      id: testSessionId,
      status: 'completed'
    };

    await updatePomodoroSession(input);

    // Check task actual duration was updated
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].actual_duration).toEqual(55); // 30 + 25
  });

  it('should handle session without task_id when completed', async () => {
    // Create session without task
    const sessionResult = await db.insert(pomodoroSessionsTable)
      .values({
        user_id: testUserId,
        task_id: null,
        duration: 30,
        break_duration: 5,
        status: 'running'
      })
      .returning()
      .execute();

    const input: UpdatePomodoroSessionInput = {
      id: sessionResult[0].id,
      status: 'completed'
    };

    const result = await updatePomodoroSession(input);

    expect(result.status).toEqual('completed');
    expect(result.task_id).toBeNull();

    // Check productivity stats were still updated
    const stats = await db.select()
      .from(productivityStatsTable)
      .where(eq(productivityStatsTable.user_id, testUserId))
      .execute();

    expect(stats).toHaveLength(1);
    expect(stats[0].total_focus_time).toEqual(30);
    expect(stats[0].pomodoro_sessions).toEqual(1);
  });

  it('should throw error for non-existent session', async () => {
    const input: UpdatePomodoroSessionInput = {
      id: 999,
      status: 'completed'
    };

    expect(updatePomodoroSession(input)).rejects.toThrow(/not found/i);
  });

  it('should not update stats when session is paused or cancelled', async () => {
    const input: UpdatePomodoroSessionInput = {
      id: testSessionId,
      status: 'paused'
    };

    await updatePomodoroSession(input);

    // Check no productivity stats were created
    const stats = await db.select()
      .from(productivityStatsTable)
      .where(eq(productivityStatsTable.user_id, testUserId))
      .execute();

    expect(stats).toHaveLength(0);

    // Check task duration wasn't updated
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    expect(tasks[0].actual_duration).toBeNull();
  });
});
