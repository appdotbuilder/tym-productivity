
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productivityStatsTable } from '../db/schema';
import { type GetProductivityStatsInput } from '../schema';
import { getProductivityStats } from '../handlers/get_productivity_stats';

describe('getProductivityStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;

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

    // Create test productivity stats data
    const baseDate = new Date('2024-01-01');
    const stats = [];

    // Create stats for test user across multiple dates
    for (let i = 0; i < 5; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);

      stats.push({
        user_id: testUserId,
        date: date,
        tasks_completed: 5 + i,
        tasks_created: 3 + i,
        total_focus_time: 120 + (i * 30), // minutes
        pomodoro_sessions: 4 + i,
        events_attended: 2 + i
      });
    }

    // Create stats for other user (should not be returned)
    stats.push({
      user_id: otherUserId,
      date: new Date('2024-01-02'),
      tasks_completed: 10,
      tasks_created: 8,
      total_focus_time: 180,
      pomodoro_sessions: 6,
      events_attended: 3
    });

    await db.insert(productivityStatsTable)
      .values(stats)
      .execute();
  });

  it('should return productivity stats for user within date range', async () => {
    const input: GetProductivityStatsInput = {
      user_id: testUserId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-03')
    };

    const result = await getProductivityStats(input);

    expect(result).toHaveLength(3);
    
    // Verify all results belong to test user
    result.forEach(stat => {
      expect(stat.user_id).toEqual(testUserId);
      expect(stat.date).toBeInstanceOf(Date);
      expect(stat.date >= input.start_date).toBe(true);
      expect(stat.date <= input.end_date).toBe(true);
    });

    // Verify data structure and types
    const firstStat = result[0];
    expect(firstStat.id).toBeDefined();
    expect(typeof firstStat.tasks_completed).toBe('number');
    expect(typeof firstStat.tasks_created).toBe('number');
    expect(typeof firstStat.total_focus_time).toBe('number');
    expect(typeof firstStat.pomodoro_sessions).toBe('number');
    expect(typeof firstStat.events_attended).toBe('number');
    expect(firstStat.created_at).toBeInstanceOf(Date);
  });

  it('should return empty array when no stats exist for date range', async () => {
    const input: GetProductivityStatsInput = {
      user_id: testUserId,
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-06-30')
    };

    const result = await getProductivityStats(input);

    expect(result).toHaveLength(0);
  });

  it('should not return stats for other users', async () => {
    const input: GetProductivityStatsInput = {
      user_id: testUserId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-05')
    };

    const result = await getProductivityStats(input);

    // Should only return stats for testUserId, not otherUserId
    result.forEach(stat => {
      expect(stat.user_id).toEqual(testUserId);
      expect(stat.user_id).not.toEqual(otherUserId);
    });
  });

  it('should return stats ordered by date ascending', async () => {
    const input: GetProductivityStatsInput = {
      user_id: testUserId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-05')
    };

    const result = await getProductivityStats(input);

    expect(result.length).toBeGreaterThan(1);

    // Verify ascending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date >= result[i - 1].date).toBe(true);
    }
  });

  it('should handle single date range correctly', async () => {
    const singleDate = new Date('2024-01-02');
    const input: GetProductivityStatsInput = {
      user_id: testUserId,
      start_date: singleDate,
      end_date: singleDate
    };

    const result = await getProductivityStats(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(testUserId);
    expect(result[0].date.toDateString()).toEqual(singleDate.toDateString());
  });
});
