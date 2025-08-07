
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
import { eq } from 'drizzle-orm';

export interface BackupData {
  userId: number;
  data: {
    tasks: any[];
    events: any[];
    timeBlocks: any[];
    pomodoroSessions: any[];
    productivityStats: any[];
    reminders: any[];
  };
  createdAt: Date;
}

export async function backupUserData(userId: number): Promise<{ success: boolean; backupId: string; data?: BackupData }> {
  try {
    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Get all user tasks
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.user_id, userId))
      .execute();

    // Get all user events
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.user_id, userId))
      .execute();

    // Get all user time blocks
    const timeBlocks = await db.select()
      .from(timeBlocksTable)
      .where(eq(timeBlocksTable.user_id, userId))
      .execute();

    // Get all user pomodoro sessions
    const pomodoroSessions = await db.select()
      .from(pomodoroSessionsTable)
      .where(eq(pomodoroSessionsTable.user_id, userId))
      .execute();

    // Get all user productivity stats
    const productivityStats = await db.select()
      .from(productivityStatsTable)
      .where(eq(productivityStatsTable.user_id, userId))
      .execute();

    // Get all user reminders
    const reminders = await db.select()
      .from(remindersTable)
      .where(eq(remindersTable.user_id, userId))
      .execute();

    // Create backup data structure
    const backupData: BackupData = {
      userId,
      data: {
        tasks,
        events,
        timeBlocks,
        pomodoroSessions,
        productivityStats,
        reminders
      },
      createdAt: new Date()
    };

    const backupId = `backup_${userId}_${Date.now()}`;

    return {
      success: true,
      backupId,
      data: backupData
    };
  } catch (error) {
    console.error('Backup user data failed:', error);
    throw error;
  }
}
