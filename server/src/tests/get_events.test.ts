
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, eventsTable } from '../db/schema';
import { type CreateUserInput, type CreateEventInput } from '../schema';
import { getEvents } from '../handlers/get_events';
import { eq } from 'drizzle-orm';

const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  timezone: 'UTC'
};

const testEventInput: CreateEventInput = {
  user_id: 1, // Will be updated after user creation
  title: 'Test Event',
  description: 'A test event',
  event_type: 'meeting',
  start_time: new Date('2024-01-15T10:00:00Z'),
  end_time: new Date('2024-01-15T11:00:00Z'),
  location: 'Conference Room A',
  is_all_day: false
};

describe('getEvents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no events', async () => {
    // Create user without any events
    await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        username: testUserInput.username,
        password_hash: testUserInput.password,
        timezone: testUserInput.timezone
      })
      .execute();

    const result = await getEvents(1);
    expect(result).toEqual([]);
  });

  it('should return all events for a user', async () => {
    // Create user first
    await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        username: testUserInput.username,
        password_hash: testUserInput.password,
        timezone: testUserInput.timezone
      })
      .execute();

    // Create multiple events
    const event1 = { ...testEventInput, user_id: 1, title: 'Event 1' };
    const event2 = { ...testEventInput, user_id: 1, title: 'Event 2' };
    
    await db.insert(eventsTable)
      .values([event1, event2])
      .execute();

    const result = await getEvents(1);
    
    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Event 1');
    expect(result[1].title).toEqual('Event 2');
    expect(result[0].user_id).toEqual(1);
    expect(result[1].user_id).toEqual(1);
  });

  it('should only return events for the specified user', async () => {
    // Create two users
    await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          password_hash: 'password123',
          timezone: 'UTC'
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          password_hash: 'password123',
          timezone: 'UTC'
        }
      ])
      .execute();

    // Create events for both users
    const event1 = { ...testEventInput, user_id: 1, title: 'User 1 Event' };
    const event2 = { ...testEventInput, user_id: 2, title: 'User 2 Event' };
    
    await db.insert(eventsTable)
      .values([event1, event2])
      .execute();

    const result = await getEvents(1);
    
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User 1 Event');
    expect(result[0].user_id).toEqual(1);
  });

  it('should return events with correct field types', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        username: testUserInput.username,
        password_hash: testUserInput.password,
        timezone: testUserInput.timezone
      })
      .execute();

    // Create event
    await db.insert(eventsTable)
      .values({
        ...testEventInput,
        user_id: 1
      })
      .execute();

    const result = await getEvents(1);
    
    expect(result).toHaveLength(1);
    const event = result[0];
    
    expect(event.id).toBeDefined();
    expect(typeof event.id).toEqual('number');
    expect(event.user_id).toEqual(1);
    expect(event.title).toEqual('Test Event');
    expect(event.description).toEqual('A test event');
    expect(event.event_type).toEqual('meeting');
    expect(event.start_time).toBeInstanceOf(Date);
    expect(event.end_time).toBeInstanceOf(Date);
    expect(event.location).toEqual('Conference Room A');
    expect(event.is_all_day).toEqual(false);
    expect(event.created_at).toBeInstanceOf(Date);
    expect(event.updated_at).toBeInstanceOf(Date);
  });

  it('should handle events with nullable fields', async () => {
    // Create user
    await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        username: testUserInput.username,
        password_hash: testUserInput.password,
        timezone: testUserInput.timezone
      })
      .execute();

    // Create event with nullable fields as null
    const minimalEvent = {
      user_id: 1,
      title: 'Minimal Event',
      description: null,
      event_type: 'other' as const,
      start_time: new Date('2024-01-15T10:00:00Z'),
      end_time: new Date('2024-01-15T11:00:00Z'),
      location: null,
      is_all_day: false
    };
    
    await db.insert(eventsTable)
      .values(minimalEvent)
      .execute();

    const result = await getEvents(1);
    
    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].location).toBeNull();
  });
});
