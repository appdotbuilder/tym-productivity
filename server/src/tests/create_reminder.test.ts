
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { remindersTable, usersTable, tasksTable, eventsTable } from '../db/schema';
import { type CreateReminderInput } from '../schema';
import { createReminder } from '../handlers/create_reminder';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  password_hash: 'hashed_password',
  timezone: 'UTC'
};

const testTask = {
  user_id: 1, // Will be set after user creation
  title: 'Test Task',
  description: 'A task for testing',
  priority: 'medium' as const,
  due_date: new Date('2024-12-31'),
  estimated_duration: 60
};

const testEvent = {
  user_id: 1, // Will be set after user creation
  title: 'Test Event',
  description: 'An event for testing',
  event_type: 'meeting' as const,
  start_time: new Date('2024-12-25T10:00:00Z'),
  end_time: new Date('2024-12-25T11:00:00Z'),
  location: 'Conference Room',
  is_all_day: false
};

const testReminderInput: CreateReminderInput = {
  user_id: 1, // Will be set after user creation
  task_id: 1, // Will be set after task creation
  event_id: null,
  reminder_type: 'notification',
  reminder_time: new Date('2024-12-30T09:00:00Z'),
  message: 'Don\'t forget about your task!'
};

describe('createReminder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a reminder for a task', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite task
    const taskResult = await db.insert(tasksTable)
      .values({ ...testTask, user_id: userId })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Create reminder input
    const reminderInput = {
      ...testReminderInput,
      user_id: userId,
      task_id: taskId,
      event_id: null
    };

    const result = await createReminder(reminderInput);

    // Validate reminder fields
    expect(result.user_id).toEqual(userId);
    expect(result.task_id).toEqual(taskId);
    expect(result.event_id).toBeNull();
    expect(result.reminder_type).toEqual('notification');
    expect(result.reminder_time).toEqual(testReminderInput.reminder_time);
    expect(result.message).toEqual(testReminderInput.message);
    expect(result.is_sent).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a reminder for an event', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite event
    const eventResult = await db.insert(eventsTable)
      .values({ ...testEvent, user_id: userId })
      .returning()
      .execute();
    const eventId = eventResult[0].id;

    // Create reminder input
    const reminderInput = {
      ...testReminderInput,
      user_id: userId,
      task_id: null,
      event_id: eventId
    };

    const result = await createReminder(reminderInput);

    // Validate reminder fields
    expect(result.user_id).toEqual(userId);
    expect(result.task_id).toBeNull();
    expect(result.event_id).toEqual(eventId);
    expect(result.reminder_type).toEqual('notification');
    expect(result.reminder_time).toEqual(testReminderInput.reminder_time);
    expect(result.message).toEqual(testReminderInput.message);
    expect(result.is_sent).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save reminder to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite task
    const taskResult = await db.insert(tasksTable)
      .values({ ...testTask, user_id: userId })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Create reminder input
    const reminderInput = {
      ...testReminderInput,
      user_id: userId,
      task_id: taskId,
      event_id: null
    };

    const result = await createReminder(reminderInput);

    // Query database to verify reminder was saved
    const reminders = await db.select()
      .from(remindersTable)
      .where(eq(remindersTable.id, result.id))
      .execute();

    expect(reminders).toHaveLength(1);
    expect(reminders[0].user_id).toEqual(userId);
    expect(reminders[0].task_id).toEqual(taskId);
    expect(reminders[0].event_id).toBeNull();
    expect(reminders[0].message).toEqual(testReminderInput.message);
    expect(reminders[0].is_sent).toBe(false);
    expect(reminders[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when both task_id and event_id are provided', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create reminder input with both task_id and event_id
    const reminderInput = {
      ...testReminderInput,
      user_id: userId,
      task_id: 1,
      event_id: 1
    };

    await expect(createReminder(reminderInput)).rejects.toThrow(/Either task_id or event_id must be provided, but not both/i);
  });

  it('should throw error when neither task_id nor event_id are provided', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create reminder input with neither task_id nor event_id
    const reminderInput = {
      ...testReminderInput,
      user_id: userId,
      task_id: null,
      event_id: null
    };

    await expect(createReminder(reminderInput)).rejects.toThrow(/Either task_id or event_id must be provided, but not both/i);
  });

  it('should throw error when referenced task does not exist', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create reminder input with non-existent task_id
    const reminderInput = {
      ...testReminderInput,
      user_id: userId,
      task_id: 999, // Non-existent task ID
      event_id: null
    };

    await expect(createReminder(reminderInput)).rejects.toThrow(/Referenced task does not exist/i);
  });

  it('should throw error when referenced event does not exist', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create reminder input with non-existent event_id
    const reminderInput = {
      ...testReminderInput,
      user_id: userId,
      task_id: null,
      event_id: 999 // Non-existent event ID
    };

    await expect(createReminder(reminderInput)).rejects.toThrow(/Referenced event does not exist/i);
  });
});
