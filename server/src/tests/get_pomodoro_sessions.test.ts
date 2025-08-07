
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, pomodoroSessionsTable } from '../db/schema';
import { type CreateUserInput, type CreateTaskInput, type CreatePomodoroSessionInput } from '../schema';
import { getPomodoroSessions } from '../handlers/get_pomodoro_sessions';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  timezone: 'UTC'
};

const testTask: CreateTaskInput = {
  user_id: 1, // Will be set after user creation
  title: 'Test Task',
  description: 'A task for testing',
  priority: 'medium',
  due_date: null,
  estimated_duration: 30
};

const testPomodoroSession: CreatePomodoroSessionInput = {
  user_id: 1, // Will be set after user creation
  task_id: 1, // Will be set after task creation
  duration: 25,
  break_duration: 5
};

describe('getPomodoroSessions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no pomodoro sessions', async () => {
    // Create user first
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      password_hash: 'hashed_password',
      timezone: testUser.timezone
    }).execute();

    const result = await getPomodoroSessions(1);

    expect(result).toEqual([]);
  });

  it('should return pomodoro sessions for user', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      password_hash: 'hashed_password',
      timezone: testUser.timezone
    }).execute();

    // Create task
    await db.insert(tasksTable).values({
      user_id: 1,
      title: testTask.title,
      description: testTask.description,
      priority: testTask.priority,
      estimated_duration: testTask.estimated_duration
    }).execute();

    // Create pomodoro session
    await db.insert(pomodoroSessionsTable).values({
      user_id: 1,
      task_id: 1,
      duration: testPomodoroSession.duration,
      break_duration: testPomodoroSession.break_duration,
      status: 'running'
    }).execute();

    const result = await getPomodoroSessions(1);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(1);
    expect(result[0].task_id).toBe(1);
    expect(result[0].duration).toBe(25);
    expect(result[0].break_duration).toBe(5);
    expect(result[0].status).toBe('running');
    expect(result[0].id).toBeDefined();
    expect(result[0].started_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return multiple pomodoro sessions ordered by started_at desc', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      password_hash: 'hashed_password',
      timezone: testUser.timezone
    }).execute();

    // Create task
    await db.insert(tasksTable).values({
      user_id: 1,
      title: testTask.title,
      description: testTask.description,
      priority: testTask.priority,
      estimated_duration: testTask.estimated_duration
    }).execute();

    // Create multiple pomodoro sessions with different start times
    const now = new Date();
    const earlier = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    await db.insert(pomodoroSessionsTable).values([
      {
        user_id: 1,
        task_id: 1,
        duration: 25,
        break_duration: 5,
        status: 'completed',
        started_at: earlier
      },
      {
        user_id: 1,
        task_id: 1,
        duration: 25,
        break_duration: 5,
        status: 'running',
        started_at: now
      }
    ]).execute();

    const result = await getPomodoroSessions(1);

    expect(result).toHaveLength(2);
    // Should be ordered by started_at desc (most recent first)
    expect(result[0].started_at.getTime()).toBeGreaterThan(result[1].started_at.getTime());
    expect(result[0].status).toBe('running');
    expect(result[1].status).toBe('completed');
  });

  it('should return only sessions for specified user', async () => {
    // Create two users
    await db.insert(usersTable).values([
      {
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        timezone: testUser.timezone
      },
      {
        email: 'user2@example.com',
        username: 'testuser2',
        password_hash: 'hashed_password',
        timezone: 'UTC'
      }
    ]).execute();

    // Create tasks for both users
    await db.insert(tasksTable).values([
      {
        user_id: 1,
        title: 'User 1 Task',
        description: 'Task for user 1',
        priority: 'medium',
        estimated_duration: 30
      },
      {
        user_id: 2,
        title: 'User 2 Task',
        description: 'Task for user 2',
        priority: 'high',
        estimated_duration: 45
      }
    ]).execute();

    // Create pomodoro sessions for both users
    await db.insert(pomodoroSessionsTable).values([
      {
        user_id: 1,
        task_id: 1,
        duration: 25,
        break_duration: 5,
        status: 'running'
      },
      {
        user_id: 2,
        task_id: 2,
        duration: 30,
        break_duration: 10,
        status: 'completed'
      }
    ]).execute();

    const result = await getPomodoroSessions(1);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(1);
    expect(result[0].task_id).toBe(1);
    expect(result[0].duration).toBe(25);
  });

  it('should handle pomodoro sessions without task_id', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: testUser.email,
      username: testUser.username,
      password_hash: 'hashed_password',
      timezone: testUser.timezone
    }).execute();

    // Create pomodoro session without task
    await db.insert(pomodoroSessionsTable).values({
      user_id: 1,
      task_id: null, // No associated task
      duration: 25,
      break_duration: 5,
      status: 'running'
    }).execute();

    const result = await getPomodoroSessions(1);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(1);
    expect(result[0].task_id).toBeNull();
    expect(result[0].duration).toBe(25);
    expect(result[0].break_duration).toBe(5);
    expect(result[0].status).toBe('running');
  });
});
