
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, pomodoroSessionsTable } from '../db/schema';
import { type CreatePomodoroSessionInput } from '../schema';
import { createPomodoroSession } from '../handlers/create_pomodoro_session';
import { eq } from 'drizzle-orm';

describe('createPomodoroSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a pomodoro session', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const testInput: CreatePomodoroSessionInput = {
      user_id: userId,
      task_id: null,
      duration: 25,
      break_duration: 5
    };

    const result = await createPomodoroSession(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.task_id).toBeNull();
    expect(result.duration).toEqual(25);
    expect(result.break_duration).toEqual(5);
    expect(result.status).toEqual('running');
    expect(result.id).toBeDefined();
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save pomodoro session to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const testInput: CreatePomodoroSessionInput = {
      user_id: userId,
      task_id: null,
      duration: 30,
      break_duration: 10
    };

    const result = await createPomodoroSession(testInput);

    // Query database to verify save
    const sessions = await db.select()
      .from(pomodoroSessionsTable)
      .where(eq(pomodoroSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toEqual(userId);
    expect(sessions[0].task_id).toBeNull();
    expect(sessions[0].duration).toEqual(30);
    expect(sessions[0].break_duration).toEqual(10);
    expect(sessions[0].status).toEqual('running');
    expect(sessions[0].started_at).toBeInstanceOf(Date);
  });

  it('should create pomodoro session with associated task', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create prerequisite task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Test Task',
        priority: 'medium'
      })
      .returning()
      .execute();
    
    const taskId = taskResult[0].id;

    const testInput: CreatePomodoroSessionInput = {
      user_id: userId,
      task_id: taskId,
      duration: 25,
      break_duration: 5
    };

    const result = await createPomodoroSession(testInput);

    expect(result.user_id).toEqual(userId);
    expect(result.task_id).toEqual(taskId);
    expect(result.duration).toEqual(25);
    expect(result.break_duration).toEqual(5);
    expect(result.status).toEqual('running');
  });

  it('should handle different duration values', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const testInput: CreatePomodoroSessionInput = {
      user_id: userId,
      task_id: null,
      duration: 45,
      break_duration: 15
    };

    const result = await createPomodoroSession(testInput);

    expect(result.duration).toEqual(45);
    expect(result.break_duration).toEqual(15);
    expect(result.status).toEqual('running');
    expect(result.completed_at).toBeNull();
  });
});
