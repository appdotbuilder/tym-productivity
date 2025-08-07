
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, eventsTable, timeBlocksTable } from '../db/schema';
import { type CreateTimeBlockInput } from '../schema';
import { createTimeBlock } from '../handlers/create_time_block';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  password_hash: 'hashedpassword123',
  timezone: 'UTC'
};

// Test task data
const testTask = {
  title: 'Test Task',
  description: 'A task for testing',
  priority: 'medium' as const,
  status: 'pending' as const
};

// Test event data
const testEvent = {
  title: 'Test Event',
  description: 'An event for testing',
  event_type: 'meeting' as const,
  start_time: new Date('2024-01-15T14:00:00Z'),
  end_time: new Date('2024-01-15T15:00:00Z'),
  location: 'Conference Room',
  is_all_day: false
};

describe('createTimeBlock', () => {
  let userId: number;
  let taskId: number;
  let eventId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: userId
      })
      .returning()
      .execute();
    taskId = taskResult[0].id;

    // Create test event
    const eventResult = await db.insert(eventsTable)
      .values({
        ...testEvent,
        user_id: userId
      })
      .returning()
      .execute();
    eventId = eventResult[0].id;
  });

  afterEach(resetDB);

  it('should create a time block successfully', async () => {
    const testInput: CreateTimeBlockInput = {
      user_id: userId,
      task_id: taskId,
      event_id: null,
      title: 'Focus Time Block',
      start_time: new Date('2024-01-15T09:00:00Z'),
      end_time: new Date('2024-01-15T10:30:00Z'),
      color: '#FF5733'
    };

    const result = await createTimeBlock(testInput);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.task_id).toEqual(taskId);
    expect(result.event_id).toBeNull();
    expect(result.title).toEqual('Focus Time Block');
    expect(result.start_time).toEqual(testInput.start_time);
    expect(result.end_time).toEqual(testInput.end_time);
    expect(result.color).toEqual('#FF5733');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create time block with event reference', async () => {
    const testInput: CreateTimeBlockInput = {
      user_id: userId,
      task_id: null,
      event_id: eventId,
      title: 'Event Time Block',
      start_time: new Date('2024-01-15T16:00:00Z'),
      end_time: new Date('2024-01-15T17:00:00Z'),
      color: null
    };

    const result = await createTimeBlock(testInput);

    expect(result.user_id).toEqual(userId);
    expect(result.task_id).toBeNull();
    expect(result.event_id).toEqual(eventId);
    expect(result.title).toEqual('Event Time Block');
    expect(result.color).toBeNull();
  });

  it('should save time block to database', async () => {
    const testInput: CreateTimeBlockInput = {
      user_id: userId,
      task_id: taskId,
      event_id: null,
      title: 'Database Test Block',
      start_time: new Date('2024-01-15T11:00:00Z'),
      end_time: new Date('2024-01-15T12:00:00Z'),
      color: '#00FF00'
    };

    const result = await createTimeBlock(testInput);

    const timeBlocks = await db.select()
      .from(timeBlocksTable)
      .where(eq(timeBlocksTable.id, result.id))
      .execute();

    expect(timeBlocks).toHaveLength(1);
    expect(timeBlocks[0].title).toEqual('Database Test Block');
    expect(timeBlocks[0].user_id).toEqual(userId);
    expect(timeBlocks[0].task_id).toEqual(taskId);
    expect(timeBlocks[0].color).toEqual('#00FF00');
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateTimeBlockInput = {
      user_id: 99999,
      task_id: null,
      event_id: null,
      title: 'Invalid User Block',
      start_time: new Date('2024-01-15T09:00:00Z'),
      end_time: new Date('2024-01-15T10:00:00Z'),
      color: null
    };

    expect(createTimeBlock(testInput)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for non-existent task', async () => {
    const testInput: CreateTimeBlockInput = {
      user_id: userId,
      task_id: 99999,
      event_id: null,
      title: 'Invalid Task Block',
      start_time: new Date('2024-01-15T09:00:00Z'),
      end_time: new Date('2024-01-15T10:00:00Z'),
      color: null
    };

    expect(createTimeBlock(testInput)).rejects.toThrow(/task not found/i);
  });

  it('should throw error for non-existent event', async () => {
    const testInput: CreateTimeBlockInput = {
      user_id: userId,
      task_id: null,
      event_id: 99999,
      title: 'Invalid Event Block',
      start_time: new Date('2024-01-15T09:00:00Z'),
      end_time: new Date('2024-01-15T10:00:00Z'),
      color: null
    };

    expect(createTimeBlock(testInput)).rejects.toThrow(/event not found/i);
  });

  it('should throw error when end time is before start time', async () => {
    const testInput: CreateTimeBlockInput = {
      user_id: userId,
      task_id: null,
      event_id: null,
      title: 'Invalid Time Range',
      start_time: new Date('2024-01-15T10:00:00Z'),
      end_time: new Date('2024-01-15T09:00:00Z'), // Before start time
      color: null
    };

    expect(createTimeBlock(testInput)).rejects.toThrow(/end time must be after start time/i);
  });

  it('should throw error when end time equals start time', async () => {
    const sameTime = new Date('2024-01-15T10:00:00Z');
    const testInput: CreateTimeBlockInput = {
      user_id: userId,
      task_id: null,
      event_id: null,
      title: 'Same Time Range',
      start_time: sameTime,
      end_time: sameTime,
      color: null
    };

    expect(createTimeBlock(testInput)).rejects.toThrow(/end time must be after start time/i);
  });

  it('should throw error for overlapping time blocks', async () => {
    // Create first time block
    const firstBlock: CreateTimeBlockInput = {
      user_id: userId,
      task_id: null,
      event_id: null,
      title: 'First Block',
      start_time: new Date('2024-01-15T10:00:00Z'),
      end_time: new Date('2024-01-15T12:00:00Z'),
      color: null
    };

    await createTimeBlock(firstBlock);

    // Try to create overlapping time block
    const overlappingBlock: CreateTimeBlockInput = {
      user_id: userId,
      task_id: null,
      event_id: null,
      title: 'Overlapping Block',
      start_time: new Date('2024-01-15T11:00:00Z'), // Overlaps with first block
      end_time: new Date('2024-01-15T13:00:00Z'),
      color: null
    };

    expect(createTimeBlock(overlappingBlock)).rejects.toThrow(/conflicts with existing time blocks/i);
  });

  it('should allow non-overlapping time blocks', async () => {
    // Create first time block
    const firstBlock: CreateTimeBlockInput = {
      user_id: userId,
      task_id: null,
      event_id: null,
      title: 'First Block',
      start_time: new Date('2024-01-15T10:00:00Z'),
      end_time: new Date('2024-01-15T12:00:00Z'),
      color: null
    };

    await createTimeBlock(firstBlock);

    // Create adjacent non-overlapping time block
    const adjacentBlock: CreateTimeBlockInput = {
      user_id: userId,
      task_id: null,
      event_id: null,
      title: 'Adjacent Block',
      start_time: new Date('2024-01-15T12:00:00Z'), // Starts when first ends
      end_time: new Date('2024-01-15T14:00:00Z'),
      color: null
    };

    const result = await createTimeBlock(adjacentBlock);
    expect(result.title).toEqual('Adjacent Block');
  });

  it('should allow overlapping time blocks for different users', async () => {
    // Create second user
    const secondUserResult = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user2@example.com',
        username: 'testuser2'
      })
      .returning()
      .execute();
    const userId2 = secondUserResult[0].id;

    // Create time block for first user
    const firstBlock: CreateTimeBlockInput = {
      user_id: userId,
      task_id: null,
      event_id: null,
      title: 'User 1 Block',
      start_time: new Date('2024-01-15T10:00:00Z'),
      end_time: new Date('2024-01-15T12:00:00Z'),
      color: null
    };

    await createTimeBlock(firstBlock);

    // Create overlapping time block for second user (should be allowed)
    const secondBlock: CreateTimeBlockInput = {
      user_id: userId2,
      task_id: null,
      event_id: null,
      title: 'User 2 Block',
      start_time: new Date('2024-01-15T11:00:00Z'),
      end_time: new Date('2024-01-15T13:00:00Z'),
      color: null
    };

    const result = await createTimeBlock(secondBlock);
    expect(result.title).toEqual('User 2 Block');
    expect(result.user_id).toEqual(userId2);
  });
});
