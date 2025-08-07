
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, eventsTable, remindersTable } from '../db/schema';
import { getReminders } from '../handlers/get_reminders';

describe('getReminders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return pending reminders for user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
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
        priority: 'medium'
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Create past reminder (should be returned)
    const pastTime = new Date(Date.now() - 60000); // 1 minute ago
    await db.insert(remindersTable)
      .values({
        user_id: userId,
        task_id: taskId,
        reminder_type: 'notification',
        reminder_time: pastTime,
        message: 'Task reminder',
        is_sent: false
      })
      .execute();

    // Create future reminder (should not be returned)
    const futureTime = new Date(Date.now() + 60000); // 1 minute from now
    await db.insert(remindersTable)
      .values({
        user_id: userId,
        task_id: taskId,
        reminder_type: 'email',
        reminder_time: futureTime,
        message: 'Future reminder',
        is_sent: false
      })
      .execute();

    const result = await getReminders(userId);

    expect(result).toHaveLength(1);
    expect(result[0].message).toEqual('Task reminder');
    expect(result[0].reminder_type).toEqual('notification');
    expect(result[0].is_sent).toBe(false);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].task_id).toEqual(taskId);
    expect(result[0].reminder_time).toBeInstanceOf(Date);
  });

  it('should not return already sent reminders', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create sent reminder (should not be returned)
    const pastTime = new Date(Date.now() - 60000);
    await db.insert(remindersTable)
      .values({
        user_id: userId,
        reminder_type: 'notification',
        reminder_time: pastTime,
        message: 'Already sent',
        is_sent: true
      })
      .execute();

    const result = await getReminders(userId);

    expect(result).toHaveLength(0);
  });

  it('should return event reminders', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test event
    const eventResult = await db.insert(eventsTable)
      .values({
        user_id: userId,
        title: 'Test Event',
        event_type: 'meeting',
        start_time: new Date(),
        end_time: new Date(Date.now() + 3600000), // 1 hour later
        is_all_day: false
      })
      .returning()
      .execute();
    const eventId = eventResult[0].id;

    // Create event reminder
    const reminderTime = new Date(Date.now() - 30000); // 30 seconds ago
    await db.insert(remindersTable)
      .values({
        user_id: userId,
        event_id: eventId,
        reminder_type: 'both',
        reminder_time: reminderTime,
        message: 'Meeting reminder',
        is_sent: false
      })
      .execute();

    const result = await getReminders(userId);

    expect(result).toHaveLength(1);
    expect(result[0].message).toEqual('Meeting reminder');
    expect(result[0].event_id).toEqual(eventId);
    expect(result[0].task_id).toBeNull();
    expect(result[0].reminder_type).toEqual('both');
  });

  it('should return empty array for user with no pending reminders', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await getReminders(userId);

    expect(result).toHaveLength(0);
  });

  it('should only return reminders for specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        username: 'user1',
        password_hash: 'hashed_password',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashed_password',
        timezone: 'UTC'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    const pastTime = new Date(Date.now() - 60000);

    // Create reminder for user1
    await db.insert(remindersTable)
      .values({
        user_id: user1Id,
        reminder_type: 'notification',
        reminder_time: pastTime,
        message: 'User 1 reminder',
        is_sent: false
      })
      .execute();

    // Create reminder for user2
    await db.insert(remindersTable)
      .values({
        user_id: user2Id,
        reminder_type: 'notification',
        reminder_time: pastTime,
        message: 'User 2 reminder',
        is_sent: false
      })
      .execute();

    const result = await getReminders(user1Id);

    expect(result).toHaveLength(1);
    expect(result[0].message).toEqual('User 1 reminder');
    expect(result[0].user_id).toEqual(user1Id);
  });
});
