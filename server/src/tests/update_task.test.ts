
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testTaskId: number;

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
        title: 'Original Task',
        description: 'Original description',
        priority: 'medium',
        status: 'pending'
      })
      .returning()
      .execute();
    testTaskId = taskResult[0].id;
  });

  it('should update task title', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Updated Task Title'
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(testTaskId);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Original description');
    expect(result.priority).toEqual('medium');
    expect(result.status).toEqual('pending');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task status', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      status: 'completed'
    };

    const result = await updateTask(input);

    expect(result.status).toEqual('completed');
    expect(result.title).toEqual('Original Task');
  });

  it('should update multiple fields', async () => {
    const dueDate = new Date('2024-12-31');
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Multi-field Update',
      description: 'Updated description',
      priority: 'high',
      status: 'in_progress',
      due_date: dueDate,
      estimated_duration: 120,
      actual_duration: 90
    };

    const result = await updateTask(input);

    expect(result.title).toEqual('Multi-field Update');
    expect(result.description).toEqual('Updated description');
    expect(result.priority).toEqual('high');
    expect(result.status).toEqual('in_progress');
    expect(result.due_date).toEqual(dueDate);
    expect(result.estimated_duration).toEqual(120);
    expect(result.actual_duration).toEqual(90);
  });

  it('should update nullable fields to null', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      description: null,
      due_date: null
    };

    const result = await updateTask(input);

    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
  });

  it('should save updates to database', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Database Test Update',
      priority: 'urgent'
    };

    await updateTask(input);

    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Test Update');
    expect(tasks[0].priority).toEqual('urgent');
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent task', async () => {
    const input: UpdateTaskInput = {
      id: 999999,
      title: 'Non-existent task'
    };

    await expect(updateTask(input)).rejects.toThrow(/Task with id 999999 not found/i);
  });

  it('should only update updated_at timestamp when no other fields provided', async () => {
    const originalTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    const input: UpdateTaskInput = {
      id: testTaskId
    };

    const result = await updateTask(input);

    expect(result.title).toEqual(originalTask[0].title);
    expect(result.description).toEqual(originalTask[0].description);
    expect(result.updated_at).not.toEqual(originalTask[0].updated_at);
  });
});
