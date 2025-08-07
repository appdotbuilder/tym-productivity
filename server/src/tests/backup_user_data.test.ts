
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  tasksTable, 
  eventsTable, 
  timeBlocksTable, 
  pomodoroSessionsTable, 
  productivityStatsTable,
  remindersTable
} from '../db/schema';
import { backupUserData } from '../handlers/backup_user_data';
import { eq } from 'drizzle-orm';

describe('backupUserData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let secondUserId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable).values([
      {
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword123',
        timezone: 'America/New_York'
      },
      {
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashedpassword456',
        timezone: 'UTC'
      }
    ]).returning().execute();

    testUserId = users[0].id;
    secondUserId = users[1].id;
  });

  it('should successfully backup user with no data', async () => {
    const result = await backupUserData(testUserId);

    expect(result.success).toBe(true);
    expect(result.backupId).toMatch(/backup_\d+_\d+/);
    expect(result.data).toBeDefined();
    expect(result.data!.userId).toBe(testUserId);
    expect(result.data!.createdAt).toBeInstanceOf(Date);
    
    // All data arrays should be empty
    expect(result.data!.data.tasks).toHaveLength(0);
    expect(result.data!.data.events).toHaveLength(0);
    expect(result.data!.data.timeBlocks).toHaveLength(0);
    expect(result.data!.data.pomodoroSessions).toHaveLength(0);
    expect(result.data!.data.productivityStats).toHaveLength(0);
    expect(result.data!.data.reminders).toHaveLength(0);
  });

  it('should backup all user tasks', async () => {
    // Create test tasks
    const tasks = await db.insert(tasksTable).values([
      {
        user_id: testUserId,
        title: 'Task 1',
        description: 'First task',
        priority: 'high',
        status: 'pending',
        estimated_duration: 60
      },
      {
        user_id: testUserId,
        title: 'Task 2',
        description: null,
        priority: 'low',
        status: 'completed',
        actual_duration: 45
      },
      {
        user_id: secondUserId, // Different user - should not be included
        title: 'Other user task',
        description: 'Should not appear',
        priority: 'medium',
        status: 'pending'
      }
    ]).returning().execute();

    const result = await backupUserData(testUserId);

    expect(result.success).toBe(true);
    expect(result.data!.data.tasks).toHaveLength(2);
    
    const backupTasks = result.data!.data.tasks;
    expect(backupTasks[0].title).toBe('Task 1');
    expect(backupTasks[0].user_id).toBe(testUserId);
    expect(backupTasks[0].priority).toBe('high');
    expect(backupTasks[0].estimated_duration).toBe(60);
    
    expect(backupTasks[1].title).toBe('Task 2');
    expect(backupTasks[1].description).toBeNull();
    expect(backupTasks[1].actual_duration).toBe(45);

    // Verify no other user's tasks are included
    expect(backupTasks.every(task => task.user_id === testUserId)).toBe(true);
  });

  it('should backup all user events', async () => {
    const startTime = new Date('2024-01-01T10:00:00Z');
    const endTime = new Date('2024-01-01T11:00:00Z');

    await db.insert(eventsTable).values([
      {
        user_id: testUserId,
        title: 'Meeting 1',
        description: 'Important meeting',
        event_type: 'meeting',
        start_time: startTime,
        end_time: endTime,
        location: 'Office',
        is_all_day: false
      },
      {
        user_id: testUserId,
        title: 'Personal Event',
        description: null,
        event_type: 'personal',
        start_time: startTime,
        end_time: endTime,
        location: null,
        is_all_day: true
      }
    ]).returning().execute();

    const result = await backupUserData(testUserId);

    expect(result.success).toBe(true);
    expect(result.data!.data.events).toHaveLength(2);
    
    const backupEvents = result.data!.data.events;
    expect(backupEvents[0].title).toBe('Meeting 1');
    expect(backupEvents[0].event_type).toBe('meeting');
    expect(backupEvents[0].location).toBe('Office');
    expect(backupEvents[0].is_all_day).toBe(false);
    
    expect(backupEvents[1].title).toBe('Personal Event');
    expect(backupEvents[1].event_type).toBe('personal');
    expect(backupEvents[1].is_all_day).toBe(true);
  });

  it('should backup all user time blocks', async () => {
    // Create a task first for reference
    const task = await db.insert(tasksTable).values({
      user_id: testUserId,
      title: 'Task for time block',
      priority: 'medium',
      status: 'pending'
    }).returning().execute();

    const blockStart = new Date('2024-01-01T14:00:00Z');
    const blockEnd = new Date('2024-01-01T15:00:00Z');

    await db.insert(timeBlocksTable).values([
      {
        user_id: testUserId,
        task_id: task[0].id,
        title: 'Work Block',
        start_time: blockStart,
        end_time: blockEnd,
        color: '#FF0000'
      },
      {
        user_id: testUserId,
        task_id: null,
        title: 'General Block',
        start_time: blockStart,
        end_time: blockEnd,
        color: null
      }
    ]).returning().execute();

    const result = await backupUserData(testUserId);

    expect(result.success).toBe(true);
    expect(result.data!.data.timeBlocks).toHaveLength(2);
    
    const timeBlocks = result.data!.data.timeBlocks;
    expect(timeBlocks[0].title).toBe('Work Block');
    expect(timeBlocks[0].task_id).toBe(task[0].id);
    expect(timeBlocks[0].color).toBe('#FF0000');
    
    expect(timeBlocks[1].title).toBe('General Block');
    expect(timeBlocks[1].task_id).toBeNull();
    expect(timeBlocks[1].color).toBeNull();
  });

  it('should backup all user pomodoro sessions', async () => {
    const startedAt = new Date('2024-01-01T09:00:00Z');
    const completedAt = new Date('2024-01-01T09:25:00Z');

    await db.insert(pomodoroSessionsTable).values([
      {
        user_id: testUserId,
        task_id: null,
        duration: 25,
        break_duration: 5,
        status: 'completed',
        started_at: startedAt,
        completed_at: completedAt
      },
      {
        user_id: testUserId,
        task_id: null,
        duration: 25,
        break_duration: 5,
        status: 'running',
        started_at: startedAt,
        completed_at: null
      }
    ]).returning().execute();

    const result = await backupUserData(testUserId);

    expect(result.success).toBe(true);
    expect(result.data!.data.pomodoroSessions).toHaveLength(2);
    
    const sessions = result.data!.data.pomodoroSessions;
    expect(sessions[0].duration).toBe(25);
    expect(sessions[0].break_duration).toBe(5);
    expect(sessions[0].status).toBe('completed');
    expect(sessions[0].completed_at).toEqual(completedAt);
    
    expect(sessions[1].status).toBe('running');
    expect(sessions[1].completed_at).toBeNull();
  });

  it('should backup all user productivity stats', async () => {
    const statsDate = new Date('2024-01-01');

    await db.insert(productivityStatsTable).values([
      {
        user_id: testUserId,
        date: statsDate,
        tasks_completed: 5,
        tasks_created: 3,
        total_focus_time: 120,
        pomodoro_sessions: 4,
        events_attended: 2
      },
      {
        user_id: testUserId,
        date: new Date('2024-01-02'),
        tasks_completed: 3,
        tasks_created: 1,
        total_focus_time: 90,
        pomodoro_sessions: 2,
        events_attended: 1
      }
    ]).returning().execute();

    const result = await backupUserData(testUserId);

    expect(result.success).toBe(true);
    expect(result.data!.data.productivityStats).toHaveLength(2);
    
    const stats = result.data!.data.productivityStats;
    expect(stats[0].tasks_completed).toBe(5);
    expect(stats[0].total_focus_time).toBe(120);
    expect(stats[0].pomodoro_sessions).toBe(4);
    
    expect(stats[1].tasks_completed).toBe(3);
    expect(stats[1].total_focus_time).toBe(90);
  });

  it('should backup all user reminders', async () => {
    // Create a task for reference
    const task = await db.insert(tasksTable).values({
      user_id: testUserId,
      title: 'Task with reminder',
      priority: 'medium',
      status: 'pending'
    }).returning().execute();

    const reminderTime = new Date('2024-01-01T08:00:00Z');

    await db.insert(remindersTable).values([
      {
        user_id: testUserId,
        task_id: task[0].id,
        event_id: null,
        reminder_type: 'notification',
        reminder_time: reminderTime,
        message: 'Task reminder',
        is_sent: false
      },
      {
        user_id: testUserId,
        task_id: null,
        event_id: null,
        reminder_type: 'email',
        reminder_time: reminderTime,
        message: 'General reminder',
        is_sent: true
      }
    ]).returning().execute();

    const result = await backupUserData(testUserId);

    expect(result.success).toBe(true);
    expect(result.data!.data.reminders).toHaveLength(2);
    
    const reminders = result.data!.data.reminders;
    expect(reminders[0].task_id).toBe(task[0].id);
    expect(reminders[0].reminder_type).toBe('notification');
    expect(reminders[0].message).toBe('Task reminder');
    expect(reminders[0].is_sent).toBe(false);
    
    expect(reminders[1].reminder_type).toBe('email');
    expect(reminders[1].message).toBe('General reminder');
    expect(reminders[1].is_sent).toBe(true);
  });

  it('should backup comprehensive user data with related entities', async () => {
    // Create task
    const task = await db.insert(tasksTable).values({
      user_id: testUserId,
      title: 'Comprehensive task',
      description: 'Task with related data',
      priority: 'high',
      status: 'in_progress',
      estimated_duration: 60
    }).returning().execute();

    // Create event
    const event = await db.insert(eventsTable).values({
      user_id: testUserId,
      title: 'Project meeting',
      event_type: 'meeting',
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T11:00:00Z'),
      is_all_day: false
    }).returning().execute();

    // Create time block for the task
    await db.insert(timeBlocksTable).values({
      user_id: testUserId,
      task_id: task[0].id,
      title: 'Work on comprehensive task',
      start_time: new Date('2024-01-01T14:00:00Z'),
      end_time: new Date('2024-01-01T15:00:00Z'),
      color: '#00FF00'
    }).returning().execute();

    // Create pomodoro session for the task
    await db.insert(pomodoroSessionsTable).values({
      user_id: testUserId,
      task_id: task[0].id,
      duration: 25,
      break_duration: 5,
      status: 'completed',
      completed_at: new Date('2024-01-01T14:25:00Z')
    }).returning().execute();

    // Create reminders for both task and event
    await db.insert(remindersTable).values([
      {
        user_id: testUserId,
        task_id: task[0].id,
        event_id: null,
        reminder_type: 'notification',
        reminder_time: new Date('2024-01-01T13:45:00Z'),
        message: 'Start working on task',
        is_sent: false
      },
      {
        user_id: testUserId,
        task_id: null,
        event_id: event[0].id,
        reminder_type: 'email',
        reminder_time: new Date('2024-01-01T09:45:00Z'),
        message: 'Meeting in 15 minutes',
        is_sent: true
      }
    ]).returning().execute();

    // Create productivity stats
    await db.insert(productivityStatsTable).values({
      user_id: testUserId,
      date: new Date('2024-01-01'),
      tasks_completed: 2,
      tasks_created: 1,
      total_focus_time: 85,
      pomodoro_sessions: 3,
      events_attended: 1
    }).returning().execute();

    const result = await backupUserData(testUserId);

    expect(result.success).toBe(true);
    expect(result.data!.userId).toBe(testUserId);
    
    // Verify all data types are present
    expect(result.data!.data.tasks).toHaveLength(1);
    expect(result.data!.data.events).toHaveLength(1);
    expect(result.data!.data.timeBlocks).toHaveLength(1);
    expect(result.data!.data.pomodoroSessions).toHaveLength(1);
    expect(result.data!.data.reminders).toHaveLength(2);
    expect(result.data!.data.productivityStats).toHaveLength(1);
    
    // Verify relationships are maintained through IDs
    expect(result.data!.data.timeBlocks[0].task_id).toBe(task[0].id);
    expect(result.data!.data.pomodoroSessions[0].task_id).toBe(task[0].id);
    expect(result.data!.data.reminders[0].task_id).toBe(task[0].id);
    expect(result.data!.data.reminders[1].event_id).toBe(event[0].id);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;
    
    await expect(backupUserData(nonExistentUserId)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should only backup data for the specified user', async () => {
    // Create data for both users
    await db.insert(tasksTable).values([
      {
        user_id: testUserId,
        title: 'User 1 Task',
        priority: 'high',
        status: 'pending'
      },
      {
        user_id: secondUserId,
        title: 'User 2 Task',
        priority: 'low',
        status: 'completed'
      }
    ]).returning().execute();

    await db.insert(eventsTable).values([
      {
        user_id: testUserId,
        title: 'User 1 Event',
        event_type: 'personal',
        start_time: new Date('2024-01-01T10:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
        is_all_day: false
      },
      {
        user_id: secondUserId,
        title: 'User 2 Event',
        event_type: 'work',
        start_time: new Date('2024-01-01T14:00:00Z'),
        end_time: new Date('2024-01-01T15:00:00Z'),
        is_all_day: false
      }
    ]).returning().execute();

    const result = await backupUserData(testUserId);

    expect(result.success).toBe(true);
    expect(result.data!.data.tasks).toHaveLength(1);
    expect(result.data!.data.events).toHaveLength(1);
    
    // Verify only testUserId data is included
    expect(result.data!.data.tasks[0].user_id).toBe(testUserId);
    expect(result.data!.data.tasks[0].title).toBe('User 1 Task');
    expect(result.data!.data.events[0].user_id).toBe(testUserId);
    expect(result.data!.data.events[0].title).toBe('User 1 Event');
  });

  it('should generate unique backup IDs', async () => {
    const result1 = await backupUserData(testUserId);
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const result2 = await backupUserData(testUserId);

    expect(result1.backupId).not.toBe(result2.backupId);
    expect(result1.backupId).toMatch(/backup_\d+_\d+/);
    expect(result2.backupId).toMatch(/backup_\d+_\d+/);
  });
});
