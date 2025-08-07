
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

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
  });

  it('should create a task with all fields', async () => {
    const testInput: CreateTaskInput = {
      user_id: testUserId,
      title: 'Test Task',
      description: 'A task for testing',
      priority: 'high',
      due_date: new Date('2024-12-31T23:59:59Z'),
      estimated_duration: 120
    };

    const result = await createTask(testInput);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.status).toEqual('pending');
    expect(result.priority).toEqual('high');
    expect(result.due_date).toEqual(testInput.due_date);
    expect(result.estimated_duration).toEqual(120);
    expect(result.actual_duration).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with minimal required fields', async () => {
    const testInput: CreateTaskInput = {
      user_id: testUserId,
      title: 'Minimal Task',
      description: null,
      priority: 'medium',
      due_date: null,
      estimated_duration: null
    };

    const result = await createTask(testInput);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.title).toEqual('Minimal Task');
    expect(result.description).toBeNull();
    expect(result.status).toEqual('pending');
    expect(result.priority).toEqual('medium');
    expect(result.due_date).toBeNull();
    expect(result.estimated_duration).toBeNull();
    expect(result.actual_duration).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save task to database', async () => {
    const testInput: CreateTaskInput = {
      user_id: testUserId,
      title: 'Database Test Task',
      description: 'Testing database persistence',
      priority: 'urgent',
      due_date: new Date('2024-06-15T10:00:00Z'),
      estimated_duration: 60
    };

    const result = await createTask(testInput);

    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Test Task');
    expect(tasks[0].description).toEqual('Testing database persistence');
    expect(tasks[0].priority).toEqual('urgent');
    expect(tasks[0].status).toEqual('pending');
    expect(tasks[0].user_id).toEqual(testUserId);
    expect(tasks[0].estimated_duration).toEqual(60);
    expect(tasks[0].created_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateTaskInput = {
      user_id: 99999, // Non-existent user ID
      title: 'Invalid User Task',
      description: null,
      priority: 'low',
      due_date: null,
      estimated_duration: null
    };

    await expect(createTask(testInput)).rejects.toThrow(/user with id 99999 not found/i);
  });

  it('should handle different priority levels correctly', async () => {
    const priorities: ('low' | 'medium' | 'high' | 'urgent')[] = ['low', 'medium', 'high', 'urgent'];

    for (const priority of priorities) {
      const testInput: CreateTaskInput = {
        user_id: testUserId,
        title: `Task with ${priority} priority`,
        description: null,
        priority,
        due_date: null,
        estimated_duration: null
      };

      const result = await createTask(testInput);
      expect(result.priority).toEqual(priority);
    }
  });
});
