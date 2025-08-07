
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, eventsTable, timeBlocksTable } from '../db/schema';
import { type GetCalendarDataInput } from '../schema';
import { getCalendarData } from '../handlers/get_calendar_data';

const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password_hash: 'hashed_password',
    timezone: 'UTC'
};

const baseDate = new Date('2024-01-15T10:00:00Z');
const startDate = new Date('2024-01-01T00:00:00Z');
const endDate = new Date('2024-01-31T23:59:59Z');

describe('getCalendarData', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return empty calendar data when no data exists', async () => {
        // Create user first
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();

        const input: GetCalendarDataInput = {
            user_id: userResult[0].id,
            view_type: 'monthly',
            start_date: startDate,
            end_date: endDate
        };

        const result = await getCalendarData(input);

        expect(result.tasks).toEqual([]);
        expect(result.events).toEqual([]);
        expect(result.timeBlocks).toEqual([]);
    });

    it('should return calendar data within date range', async () => {
        // Create user
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();

        const userId = userResult[0].id;

        // Create test data within range
        await db.insert(tasksTable).values({
            user_id: userId,
            title: 'Task in range',
            priority: 'medium',
            due_date: baseDate
        }).execute();

        await db.insert(eventsTable).values({
            user_id: userId,
            title: 'Event in range',
            event_type: 'meeting',
            start_time: baseDate,
            end_time: new Date(baseDate.getTime() + 3600000), // +1 hour
            is_all_day: false
        }).execute();

        await db.insert(timeBlocksTable).values({
            user_id: userId,
            title: 'Time block in range',
            start_time: baseDate,
            end_time: new Date(baseDate.getTime() + 1800000) // +30 minutes
        }).execute();

        const input: GetCalendarDataInput = {
            user_id: userId,
            view_type: 'monthly',
            start_date: startDate,
            end_date: endDate
        };

        const result = await getCalendarData(input);

        expect(result.tasks).toHaveLength(1);
        expect(result.tasks[0].title).toBe('Task in range');
        expect(result.tasks[0].due_date).toEqual(baseDate);

        expect(result.events).toHaveLength(1);
        expect(result.events[0].title).toBe('Event in range');
        expect(result.events[0].start_time).toEqual(baseDate);

        expect(result.timeBlocks).toHaveLength(1);
        expect(result.timeBlocks[0].title).toBe('Time block in range');
        expect(result.timeBlocks[0].start_time).toEqual(baseDate);
    });

    it('should filter out data outside date range', async () => {
        // Create user
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();

        const userId = userResult[0].id;

        // Create data outside range
        const outsideDate = new Date('2024-02-15T10:00:00Z');

        await db.insert(tasksTable).values({
            user_id: userId,
            title: 'Task outside range',
            priority: 'medium',
            due_date: outsideDate
        }).execute();

        await db.insert(eventsTable).values({
            user_id: userId,
            title: 'Event outside range',
            event_type: 'meeting',
            start_time: outsideDate,
            end_time: new Date(outsideDate.getTime() + 3600000),
            is_all_day: false
        }).execute();

        await db.insert(timeBlocksTable).values({
            user_id: userId,
            title: 'Time block outside range',
            start_time: outsideDate,
            end_time: new Date(outsideDate.getTime() + 1800000)
        }).execute();

        // Create data inside range
        await db.insert(tasksTable).values({
            user_id: userId,
            title: 'Task in range',
            priority: 'high',
            due_date: baseDate
        }).execute();

        const input: GetCalendarDataInput = {
            user_id: userId,
            view_type: 'monthly',
            start_date: startDate,
            end_date: endDate
        };

        const result = await getCalendarData(input);

        expect(result.tasks).toHaveLength(1);
        expect(result.tasks[0].title).toBe('Task in range');
        expect(result.events).toHaveLength(0);
        expect(result.timeBlocks).toHaveLength(0);
    });

    it('should only return data for specified user', async () => {
        // Create two users
        const user1Result = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();

        const user2Result = await db.insert(usersTable)
            .values({
                ...testUser,
                email: 'user2@example.com',
                username: 'user2'
            })
            .returning()
            .execute();

        const user1Id = user1Result[0].id;
        const user2Id = user2Result[0].id;

        // Create data for both users
        await db.insert(tasksTable).values([
            {
                user_id: user1Id,
                title: 'User 1 task',
                priority: 'medium',
                due_date: baseDate
            },
            {
                user_id: user2Id,
                title: 'User 2 task',
                priority: 'medium',
                due_date: baseDate
            }
        ]).execute();

        const input: GetCalendarDataInput = {
            user_id: user1Id,
            view_type: 'monthly',
            start_date: startDate,
            end_date: endDate
        };

        const result = await getCalendarData(input);

        expect(result.tasks).toHaveLength(1);
        expect(result.tasks[0].title).toBe('User 1 task');
        expect(result.tasks[0].user_id).toBe(user1Id);
    });

    it('should handle tasks with null due_date by excluding them', async () => {
        // Create user
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();

        const userId = userResult[0].id;

        // Create task with null due_date
        await db.insert(tasksTable).values({
            user_id: userId,
            title: 'Task without due date',
            priority: 'medium',
            due_date: null
        }).execute();

        // Create task with due_date
        await db.insert(tasksTable).values({
            user_id: userId,
            title: 'Task with due date',
            priority: 'medium',
            due_date: baseDate
        }).execute();

        const input: GetCalendarDataInput = {
            user_id: userId,
            view_type: 'monthly',
            start_date: startDate,
            end_date: endDate
        };

        const result = await getCalendarData(input);

        // Should only return task with due_date
        expect(result.tasks).toHaveLength(1);
        expect(result.tasks[0].title).toBe('Task with due date');
        expect(result.tasks[0].due_date).toEqual(baseDate);
    });
});
