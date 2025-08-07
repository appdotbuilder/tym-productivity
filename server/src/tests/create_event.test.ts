
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable, usersTable } from '../db/schema';
import { type CreateEventInput } from '../schema';
import { createEvent } from '../handlers/create_event';
import { eq } from 'drizzle-orm';

describe('createEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  const startTime = new Date('2024-01-15T10:00:00Z');
  const endTime = new Date('2024-01-15T11:00:00Z');

  const testInput: CreateEventInput = {
    user_id: 1, // Will be updated with actual user ID
    title: 'Team Meeting',
    description: 'Weekly team sync',
    event_type: 'meeting',
    start_time: startTime,
    end_time: endTime,
    location: 'Conference Room A',
    is_all_day: false
  };

  beforeEach(async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        timezone: 'UTC'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;
    testInput.user_id = testUserId;
  });

  it('should create an event', async () => {
    const result = await createEvent(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.title).toEqual('Team Meeting');
    expect(result.description).toEqual('Weekly team sync');
    expect(result.event_type).toEqual('meeting');
    expect(result.start_time).toEqual(startTime);
    expect(result.end_time).toEqual(endTime);
    expect(result.location).toEqual('Conference Room A');
    expect(result.is_all_day).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save event to database', async () => {
    const result = await createEvent(testInput);

    // Query using proper drizzle syntax
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, result.id))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].title).toEqual('Team Meeting');
    expect(events[0].user_id).toEqual(testUserId);
    expect(events[0].event_type).toEqual('meeting');
    expect(events[0].start_time).toEqual(startTime);
    expect(events[0].end_time).toEqual(endTime);
    expect(events[0].is_all_day).toEqual(false);
    expect(events[0].created_at).toBeInstanceOf(Date);
    expect(events[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create all-day event', async () => {
    const allDayInput = {
      ...testInput,
      title: 'Holiday',
      event_type: 'personal' as const,
      is_all_day: true,
      location: null
    };

    const result = await createEvent(allDayInput);

    expect(result.title).toEqual('Holiday');
    expect(result.event_type).toEqual('personal');
    expect(result.is_all_day).toEqual(true);
    expect(result.location).toBeNull();
  });

  it('should handle null description and location', async () => {
    const minimalInput = {
      ...testInput,
      description: null,
      location: null
    };

    const result = await createEvent(minimalInput);

    expect(result.description).toBeNull();
    expect(result.location).toBeNull();
    expect(result.title).toEqual('Team Meeting');
  });

  it('should throw error for invalid user', async () => {
    const invalidInput = {
      ...testInput,
      user_id: 99999
    };

    await expect(createEvent(invalidInput)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for invalid time range', async () => {
    const invalidTimeInput = {
      ...testInput,
      start_time: new Date('2024-01-15T11:00:00Z'),
      end_time: new Date('2024-01-15T10:00:00Z') // End before start
    };

    await expect(createEvent(invalidTimeInput)).rejects.toThrow(/start time must be before end time/i);
  });

  it('should throw error for equal start and end times', async () => {
    const sameTimeInput = {
      ...testInput,
      start_time: new Date('2024-01-15T10:00:00Z'),
      end_time: new Date('2024-01-15T10:00:00Z')
    };

    await expect(createEvent(sameTimeInput)).rejects.toThrow(/start time must be before end time/i);
  });
});
