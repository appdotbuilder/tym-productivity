
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, eventsTable, remindersTable, timeBlocksTable } from '../db/schema';
import { deleteEvent } from '../handlers/delete_event';
import { eq } from 'drizzle-orm';

describe('deleteEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;
  let testEventId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          username: 'testuser',
          password_hash: 'hashed_password',
          timezone: 'UTC'
        },
        {
          email: 'other@example.com',
          username: 'otheruser',
          password_hash: 'hashed_password',
          timezone: 'UTC'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test event
    const events = await db.insert(eventsTable)
      .values({
        user_id: testUserId,
        title: 'Test Event',
        description: 'A test event',
        event_type: 'meeting',
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
        location: 'Test Location',
        is_all_day: false
      })
      .returning()
      .execute();

    testEventId = events[0].id;
  });

  it('should delete event successfully', async () => {
    const result = await deleteEvent(testEventId, testUserId);

    expect(result.success).toBe(true);

    // Verify event is deleted from database
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, testEventId))
      .execute();

    expect(events).toHaveLength(0);
  });

  it('should return false for non-existent event', async () => {
    const nonExistentEventId = 99999;
    const result = await deleteEvent(nonExistentEventId, testUserId);

    expect(result.success).toBe(false);
  });

  it('should not delete event belonging to different user', async () => {
    const result = await deleteEvent(testEventId, otherUserId);

    expect(result.success).toBe(false);

    // Verify event still exists in database
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, testEventId))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].title).toEqual('Test Event');
  });

  it('should cascade delete related reminders and time blocks', async () => {
    // Create related reminder
    const reminders = await db.insert(remindersTable)
      .values({
        user_id: testUserId,
        event_id: testEventId,
        reminder_type: 'notification',
        reminder_time: new Date('2024-01-01T09:30:00Z'),
        message: 'Event reminder',
        is_sent: false
      })
      .returning()
      .execute();

    // Create related time block
    const timeBlocks = await db.insert(timeBlocksTable)
      .values({
        user_id: testUserId,
        event_id: testEventId,
        title: 'Event Time Block',
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
        color: '#FF0000'
      })
      .returning()
      .execute();

    const reminderId = reminders[0].id;
    const timeBlockId = timeBlocks[0].id;

    // Delete the event
    const result = await deleteEvent(testEventId, testUserId);
    expect(result.success).toBe(true);

    // Verify event is deleted
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, testEventId))
      .execute();
    expect(events).toHaveLength(0);

    // Verify related reminder is cascade deleted
    const remainingReminders = await db.select()
      .from(remindersTable)
      .where(eq(remindersTable.id, reminderId))
      .execute();
    expect(remainingReminders).toHaveLength(0);

    // Verify related time block is cascade deleted
    const remainingTimeBlocks = await db.select()
      .from(timeBlocksTable)
      .where(eq(timeBlocksTable.id, timeBlockId))
      .execute();
    expect(remainingTimeBlocks).toHaveLength(0);
  });

  it('should not affect other users events', async () => {
    // Create event for other user
    const otherEvents = await db.insert(eventsTable)
      .values({
        user_id: otherUserId,
        title: 'Other User Event',
        description: 'Event for other user',
        event_type: 'personal',
        start_time: new Date('2024-01-01T14:00:00Z'),
        end_time: new Date('2024-01-01T15:00:00Z'),
        is_all_day: false
      })
      .returning()
      .execute();

    const otherEventId = otherEvents[0].id;

    // Delete test user's event
    const result = await deleteEvent(testEventId, testUserId);
    expect(result.success).toBe(true);

    // Verify other user's event still exists
    const remainingEvents = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, otherEventId))
      .execute();

    expect(remainingEvents).toHaveLength(1);
    expect(remainingEvents[0].title).toEqual('Other User Event');
  });
});
