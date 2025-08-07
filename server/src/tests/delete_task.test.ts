
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, remindersTable, timeBlocksTable } from '../db/schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a task successfully', async () => {
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
    const userId = userResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Test Task',
        description: 'A task to delete',
        priority: 'medium'
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Delete the task
    const result = await deleteTask(taskId, userId);

    // Verify result
    expect(result.success).toBe(true);

    // Verify task is deleted from database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should delete related reminders and time blocks', async () => {
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
    const userId = userResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Test Task',
        description: 'A task with related records',
        priority: 'high'
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Create related reminder
    await db.insert(remindersTable)
      .values({
        user_id: userId,
        task_id: taskId,
        reminder_type: 'notification',
        reminder_time: new Date(),
        message: 'Task reminder'
      })
      .execute();

    // Create related time block
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        task_id: taskId,
        title: 'Work on task',
        start_time: startTime,
        end_time: endTime
      })
      .execute();

    // Delete the task
    const result = await deleteTask(taskId, userId);

    // Verify result
    expect(result.success).toBe(true);

    // Verify task is deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();
    expect(tasks).toHaveLength(0);

    // Verify related reminders are deleted
    const reminders = await db.select()
      .from(remindersTable)
      .where(eq(remindersTable.task_id, taskId))
      .execute();
    expect(reminders).toHaveLength(0);

    // Verify related time blocks are deleted
    const timeBlocks = await db.select()
      .from(timeBlocksTable)
      .where(eq(timeBlocksTable.task_id, taskId))
      .execute();
    expect(timeBlocks).toHaveLength(0);
  });

  it('should throw error for non-existent task', async () => {
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
    const userId = userResult[0].id;

    // Try to delete non-existent task
    await expect(deleteTask(999, userId)).rejects.toThrow(/task not found or access denied/i);
  });

  it('should throw error when user tries to delete another users task', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        username: 'user1',
        password_hash: 'hashedpassword',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashedpassword',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create task for user1
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user1Id,
        title: 'User 1 Task',
        description: 'This belongs to user 1',
        priority: 'low'
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Try to delete user1's task as user2
    await expect(deleteTask(taskId, user2Id)).rejects.toThrow(/task not found or access denied/i);

    // Verify task still exists
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();
    expect(tasks).toHaveLength(1);
  });

  it('should only delete specified task and not affect other tasks', async () => {
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
    const userId = userResult[0].id;

    // Create multiple tasks
    const task1Result = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Task 1',
        description: 'First task',
        priority: 'medium'
      })
      .returning()
      .execute();
    const task1Id = task1Result[0].id;

    const task2Result = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Task 2',
        description: 'Second task',
        priority: 'high'
      })
      .returning()
      .execute();
    const task2Id = task2Result[0].id;

    // Delete only the first task
    const result = await deleteTask(task1Id, userId);

    // Verify result
    expect(result.success).toBe(true);

    // Verify first task is deleted
    const task1Query = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task1Id))
      .execute();
    expect(task1Query).toHaveLength(0);

    // Verify second task still exists
    const task2Query = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task2Id))
      .execute();
    expect(task2Query).toHaveLength(1);
    expect(task2Query[0].title).toEqual('Task 2');
  });
});
