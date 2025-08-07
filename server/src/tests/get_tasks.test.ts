
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type CreateUserInput, type CreateTaskInput } from '../schema';
import { getTasks } from '../handlers/get_tasks';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  timezone: 'UTC'
};

const testTask: CreateTaskInput = {
  user_id: 1,
  title: 'Test Task',
  description: 'A task for testing',
  priority: 'medium',
  due_date: new Date('2024-12-31'),
  estimated_duration: 60
};

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no tasks', async () => {
    // Create user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        timezone: testUser.timezone
      })
      .execute();

    const result = await getTasks(1);

    expect(result).toEqual([]);
  });

  it('should return all tasks for a specific user', async () => {
    // Create user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        timezone: testUser.timezone
      })
      .execute();

    // Create tasks for the user
    await db.insert(tasksTable)
      .values([
        {
          user_id: 1,
          title: 'Task 1',
          description: 'First task',
          priority: 'high',
          status: 'pending',
          due_date: new Date('2024-12-31'),
          estimated_duration: 30
        },
        {
          user_id: 1,
          title: 'Task 2',
          description: 'Second task',
          priority: 'low',
          status: 'completed',
          due_date: null,
          estimated_duration: null
        }
      ])
      .execute();

    const result = await getTasks(1);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Task 1');
    expect(result[0].description).toEqual('First task');
    expect(result[0].priority).toEqual('high');
    expect(result[0].status).toEqual('pending');
    expect(result[0].user_id).toEqual(1);
    expect(result[0].due_date).toBeInstanceOf(Date);
    expect(result[0].estimated_duration).toEqual(30);

    expect(result[1].title).toEqual('Task 2');
    expect(result[1].description).toEqual('Second task');
    expect(result[1].priority).toEqual('low');
    expect(result[1].status).toEqual('completed');
    expect(result[1].user_id).toEqual(1);
    expect(result[1].due_date).toBeNull();
    expect(result[1].estimated_duration).toBeNull();
  });

  it('should only return tasks for the specified user', async () => {
    // Create two users
    await db.insert(usersTable)
      .values([
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
      ])
      .execute();

    // Create tasks for both users
    await db.insert(tasksTable)
      .values([
        {
          user_id: 1,
          title: 'User 1 Task',
          description: 'Task for user 1',
          priority: 'medium',
          status: 'pending'
        },
        {
          user_id: 2,
          title: 'User 2 Task',
          description: 'Task for user 2',
          priority: 'high',
          status: 'in_progress'
        }
      ])
      .execute();

    const result = await getTasks(1);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User 1 Task');
    expect(result[0].user_id).toEqual(1);
    expect(result[0].description).toEqual('Task for user 1');
    expect(result[0].priority).toEqual('medium');
    expect(result[0].status).toEqual('pending');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return tasks with all required fields', async () => {
    // Create user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        timezone: testUser.timezone
      })
      .execute();

    // Create a complete task
    await db.insert(tasksTable)
      .values({
        user_id: 1,
        title: testTask.title,
        description: testTask.description,
        priority: testTask.priority,
        status: 'pending',
        due_date: testTask.due_date,
        estimated_duration: testTask.estimated_duration,
        actual_duration: 45
      })
      .execute();

    const result = await getTasks(1);

    expect(result).toHaveLength(1);
    const task = result[0];
    
    // Verify all required fields are present
    expect(task.id).toBeDefined();
    expect(task.user_id).toEqual(1);
    expect(task.title).toEqual('Test Task');
    expect(task.description).toEqual('A task for testing');
    expect(task.status).toEqual('pending');
    expect(task.priority).toEqual('medium');
    expect(task.due_date).toBeInstanceOf(Date);
    expect(task.estimated_duration).toEqual(60);
    expect(task.actual_duration).toEqual(45);
    expect(task.created_at).toBeInstanceOf(Date);
    expect(task.updated_at).toBeInstanceOf(Date);
  });
});
