
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, eventsTable, timeBlocksTable, pomodoroSessionsTable } from '../db/schema';
import { type CreateUserInput, type CreateTaskInput, type CreateEventInput, type CreateTimeBlockInput, type CreatePomodoroSessionInput } from '../schema';
import { syncUserData } from '../handlers/sync_user_data';

// Test data setup
const testUser: CreateUserInput = {
  email: 'sync@test.com',
  username: 'syncuser',
  password: 'password123',
  timezone: 'UTC'
};

const testTask: CreateTaskInput = {
  user_id: 1,
  title: 'Test Task',
  description: 'A test task for sync',
  priority: 'medium',
  due_date: new Date('2024-12-31'),
  estimated_duration: 60
};

const testEvent: CreateEventInput = {
  user_id: 1,
  title: 'Test Event',
  description: 'A test event for sync',
  event_type: 'meeting',
  start_time: new Date('2024-12-25T10:00:00Z'),
  end_time: new Date('2024-12-25T11:00:00Z'),
  location: 'Conference Room',
  is_all_day: false
};

const testTimeBlock: CreateTimeBlockInput = {
  user_id: 1,
  task_id: null,
  event_id: null,
  title: 'Focus Block',
  start_time: new Date('2024-12-25T14:00:00Z'),
  end_time: new Date('2024-12-25T16:00:00Z'),
  color: '#FF5733'
};

const testPomodoro: CreatePomodoroSessionInput = {
  user_id: 1,
  task_id: null,
  duration: 25,
  break_duration: 5
};

describe('syncUserData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should sync all user data when no timestamp provided', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        timezone: testUser.timezone
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test data
    await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: userId
      })
      .execute();

    await db.insert(eventsTable)
      .values({
        ...testEvent,
        user_id: userId
      })
      .execute();

    await db.insert(timeBlocksTable)
      .values({
        ...testTimeBlock,
        user_id: userId
      })
      .execute();

    await db.insert(pomodoroSessionsTable)
      .values({
        ...testPomodoro,
        user_id: userId
      })
      .execute();

    // Sync without timestamp
    const result = await syncUserData(userId);

    // Verify all data is returned
    expect(result.tasks).toHaveLength(1);
    expect(result.events).toHaveLength(1);
    expect(result.timeBlocks).toHaveLength(1);
    expect(result.pomodoroSessions).toHaveLength(1);
    expect(result.lastSyncTimestamp).toBeInstanceOf(Date);

    // Verify task data
    expect(result.tasks[0].title).toEqual('Test Task');
    expect(result.tasks[0].user_id).toEqual(userId);
    expect(result.tasks[0].priority).toEqual('medium');

    // Verify event data
    expect(result.events[0].title).toEqual('Test Event');
    expect(result.events[0].user_id).toEqual(userId);
    expect(result.events[0].event_type).toEqual('meeting');

    // Verify time block data
    expect(result.timeBlocks[0].title).toEqual('Focus Block');
    expect(result.timeBlocks[0].user_id).toEqual(userId);
    expect(result.timeBlocks[0].color).toEqual('#FF5733');

    // Verify pomodoro data
    expect(result.pomodoroSessions[0].duration).toEqual(25);
    expect(result.pomodoroSessions[0].user_id).toEqual(userId);
    expect(result.pomodoroSessions[0].status).toEqual('running');
  });

  it('should sync only data modified after timestamp', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        timezone: testUser.timezone
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create old data
    const oldTimestamp = new Date('2024-01-01T00:00:00Z');
    await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: userId,
        title: 'Old Task',
        created_at: oldTimestamp,
        updated_at: oldTimestamp
      })
      .execute();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create new data after sync timestamp
    const syncTimestamp = new Date();
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: userId,
        title: 'New Task'
      })
      .execute();

    await db.insert(eventsTable)
      .values({
        ...testEvent,
        user_id: userId
      })
      .execute();

    // Sync with timestamp
    const result = await syncUserData(userId, syncTimestamp);

    // Should only return new data
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toEqual('New Task');
    expect(result.events).toHaveLength(1);
    expect(result.timeBlocks).toHaveLength(0);
    expect(result.pomodoroSessions).toHaveLength(0);
  });

  it('should return empty arrays for user with no data', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        timezone: testUser.timezone
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Sync without any data
    const result = await syncUserData(userId);

    expect(result.tasks).toHaveLength(0);
    expect(result.events).toHaveLength(0);
    expect(result.timeBlocks).toHaveLength(0);
    expect(result.pomodoroSessions).toHaveLength(0);
    expect(result.lastSyncTimestamp).toBeInstanceOf(Date);
  });

  it('should only return data for specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@test.com',
        username: 'user1',
        password_hash: 'hashed_password',
        timezone: 'UTC'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@test.com',
        username: 'user2',
        password_hash: 'hashed_password',
        timezone: 'UTC'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create data for both users
    await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: user1Id,
        title: 'User 1 Task'
      })
      .execute();

    await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: user2Id,
        title: 'User 2 Task'
      })
      .execute();

    // Sync for user 1 only
    const result = await syncUserData(user1Id);

    // Should only return user 1's data
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toEqual('User 1 Task');
    expect(result.tasks[0].user_id).toEqual(user1Id);
  });
});
