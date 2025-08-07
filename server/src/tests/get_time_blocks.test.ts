
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, timeBlocksTable, tasksTable, eventsTable } from '../db/schema';
import { getTimeBlocks } from '../handlers/get_time_blocks';

describe('getTimeBlocks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return time blocks for a user', async () => {
    // Create a test user
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

    // Create test time blocks
    const timeBlock1 = await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'Morning Work Block',
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T11:00:00Z'),
        color: '#ff0000'
      })
      .returning()
      .execute();

    const timeBlock2 = await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'Afternoon Meeting Block',
        start_time: new Date('2024-01-15T14:00:00Z'),
        end_time: new Date('2024-01-15T15:30:00Z'),
        color: '#00ff00'
      })
      .returning()
      .execute();

    const result = await getTimeBlocks(userId);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Morning Work Block');
    expect(result[1].title).toEqual('Afternoon Meeting Block');
    expect(result[0].color).toEqual('#ff0000');
    expect(result[1].color).toEqual('#00ff00');
  });

  it('should return empty array for user with no time blocks', async () => {
    // Create a test user
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

    const result = await getTimeBlocks(userId);

    expect(result).toHaveLength(0);
  });

  it('should filter time blocks by start date', async () => {
    // Create a test user
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

    // Create time blocks on different dates
    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'Early Block',
        start_time: new Date('2024-01-10T09:00:00Z'),
        end_time: new Date('2024-01-10T10:00:00Z')
      })
      .execute();

    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'Later Block',
        start_time: new Date('2024-01-20T09:00:00Z'),
        end_time: new Date('2024-01-20T10:00:00Z')
      })
      .execute();

    const startDate = new Date('2024-01-15T00:00:00Z');
    const result = await getTimeBlocks(userId, startDate);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Later Block');
  });

  it('should filter time blocks by end date', async () => {
    // Create a test user
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

    // Create time blocks on different dates
    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'Early Block',
        start_time: new Date('2024-01-10T09:00:00Z'),
        end_time: new Date('2024-01-10T10:00:00Z')
      })
      .execute();

    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'Later Block',
        start_time: new Date('2024-01-20T09:00:00Z'),
        end_time: new Date('2024-01-20T10:00:00Z')
      })
      .execute();

    const endDate = new Date('2024-01-15T23:59:59Z');
    const result = await getTimeBlocks(userId, undefined, endDate);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Early Block');
  });

  it('should filter time blocks by date range', async () => {
    // Create a test user
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

    // Create time blocks on different dates
    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'Before Range',
        start_time: new Date('2024-01-05T09:00:00Z'),
        end_time: new Date('2024-01-05T10:00:00Z')
      })
      .execute();

    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'Within Range',
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T10:00:00Z')
      })
      .execute();

    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'After Range',
        start_time: new Date('2024-01-25T09:00:00Z'),
        end_time: new Date('2024-01-25T10:00:00Z')
      })
      .execute();

    const startDate = new Date('2024-01-10T00:00:00Z');
    const endDate = new Date('2024-01-20T23:59:59Z');
    const result = await getTimeBlocks(userId, startDate, endDate);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Within Range');
  });

  it('should return time blocks ordered by start time', async () => {
    // Create a test user
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

    // Create time blocks in non-chronological order
    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'Third Block',
        start_time: new Date('2024-01-15T15:00:00Z'),
        end_time: new Date('2024-01-15T16:00:00Z')
      })
      .execute();

    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'First Block',
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T10:00:00Z')
      })
      .execute();

    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        title: 'Second Block',
        start_time: new Date('2024-01-15T12:00:00Z'),
        end_time: new Date('2024-01-15T13:00:00Z')
      })
      .execute();

    const result = await getTimeBlocks(userId);

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('First Block');
    expect(result[1].title).toEqual('Second Block');
    expect(result[2].title).toEqual('Third Block');
  });

  it('should only return time blocks for the specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        username: 'user1',
        password_hash: 'hashedpassword',
        timezone: 'UTC'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashedpassword',
        timezone: 'UTC'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create time blocks for both users
    await db.insert(timeBlocksTable)
      .values({
        user_id: user1Id,
        title: 'User 1 Block',
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T10:00:00Z')
      })
      .execute();

    await db.insert(timeBlocksTable)
      .values({
        user_id: user2Id,
        title: 'User 2 Block',
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T10:00:00Z')
      })
      .execute();

    const result = await getTimeBlocks(user1Id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User 1 Block');
    expect(result[0].user_id).toEqual(user1Id);
  });

  it('should handle time blocks with task and event associations', async () => {
    // Create a test user
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

    // Create a test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Test Task',
        priority: 'medium'
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    // Create a test event
    const eventResult = await db.insert(eventsTable)
      .values({
        user_id: userId,
        title: 'Test Event',
        event_type: 'meeting',
        start_time: new Date('2024-01-15T14:00:00Z'),
        end_time: new Date('2024-01-15T15:00:00Z')
      })
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Create time blocks with associations
    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        task_id: taskId,
        title: 'Task Block',
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T10:00:00Z')
      })
      .execute();

    await db.insert(timeBlocksTable)
      .values({
        user_id: userId,
        event_id: eventId,
        title: 'Event Block',
        start_time: new Date('2024-01-15T14:00:00Z'),
        end_time: new Date('2024-01-15T15:00:00Z')
      })
      .execute();

    const result = await getTimeBlocks(userId);

    expect(result).toHaveLength(2);
    expect(result[0].task_id).toEqual(taskId);
    expect(result[0].event_id).toBeNull();
    expect(result[1].task_id).toBeNull();
    expect(result[1].event_id).toEqual(eventId);
  });
});
