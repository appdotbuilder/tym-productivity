
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, eventsTable } from '../db/schema';
import { type UpdateEventInput } from '../schema';
import { updateEvent } from '../handlers/update_event';
import { eq } from 'drizzle-orm';

describe('updateEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testEventId: number;

  beforeEach(async () => {
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
    testUserId = userResult[0].id;

    // Create test event
    const eventResult = await db.insert(eventsTable)
      .values({
        user_id: testUserId,
        title: 'Original Event',
        description: 'Original description',
        event_type: 'meeting',
        start_time: new Date('2024-01-15T10:00:00Z'),
        end_time: new Date('2024-01-15T11:00:00Z'),
        location: 'Conference Room A',
        is_all_day: false
      })
      .returning()
      .execute();
    testEventId = eventResult[0].id;
  });

  it('should update event title', async () => {
    const input: UpdateEventInput = {
      id: testEventId,
      title: 'Updated Meeting'
    };

    const result = await updateEvent(input);

    expect(result.id).toEqual(testEventId);
    expect(result.title).toEqual('Updated Meeting');
    expect(result.description).toEqual('Original description'); // unchanged
    expect(result.event_type).toEqual('meeting'); // unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields', async () => {
    const newStartTime = new Date('2024-01-16T14:00:00Z');
    const newEndTime = new Date('2024-01-16T15:30:00Z');

    const input: UpdateEventInput = {
      id: testEventId,
      title: 'Rescheduled Meeting',
      description: 'Updated description',
      event_type: 'appointment',
      start_time: newStartTime,
      end_time: newEndTime,
      location: 'Conference Room B',
      is_all_day: true
    };

    const result = await updateEvent(input);

    expect(result.title).toEqual('Rescheduled Meeting');
    expect(result.description).toEqual('Updated description');
    expect(result.event_type).toEqual('appointment');
    expect(result.start_time).toEqual(newStartTime);
    expect(result.end_time).toEqual(newEndTime);
    expect(result.location).toEqual('Conference Room B');
    expect(result.is_all_day).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update nullable fields to null', async () => {
    const input: UpdateEventInput = {
      id: testEventId,
      description: null,
      location: null
    };

    const result = await updateEvent(input);

    expect(result.description).toBeNull();
    expect(result.location).toBeNull();
    expect(result.title).toEqual('Original Event'); // unchanged
  });

  it('should persist changes to database', async () => {
    const input: UpdateEventInput = {
      id: testEventId,
      title: 'Database Test Event',
      event_type: 'personal'
    };

    await updateEvent(input);

    // Verify changes are saved in database
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, testEventId))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].title).toEqual('Database Test Event');
    expect(events[0].event_type).toEqual('personal');
    expect(events[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent event', async () => {
    const input: UpdateEventInput = {
      id: 99999,
      title: 'Non-existent Event'
    };

    await expect(updateEvent(input)).rejects.toThrow(/Event with id 99999 not found/i);
  });

  it('should only update specified fields', async () => {
    const input: UpdateEventInput = {
      id: testEventId,
      event_type: 'work'
    };

    const result = await updateEvent(input);

    // Only event_type should change
    expect(result.event_type).toEqual('work');
    expect(result.title).toEqual('Original Event');
    expect(result.description).toEqual('Original description');
    expect(result.location).toEqual('Conference Room A');
    expect(result.is_all_day).toEqual(false);
  });
});
