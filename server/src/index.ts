
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createTaskInputSchema,
  updateTaskInputSchema,
  createEventInputSchema,
  updateEventInputSchema,
  createReminderInputSchema,
  createTimeBlockInputSchema,
  createPomodoroSessionInputSchema,
  updatePomodoroSessionInputSchema,
  getCalendarDataInputSchema,
  getProductivityStatsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { createTask } from './handlers/create_task';
import { updateTask } from './handlers/update_task';
import { getTasks } from './handlers/get_tasks';
import { deleteTask } from './handlers/delete_task';
import { createEvent } from './handlers/create_event';
import { updateEvent } from './handlers/update_event';
import { getEvents } from './handlers/get_events';
import { deleteEvent } from './handlers/delete_event';
import { getCalendarData } from './handlers/get_calendar_data';
import { createReminder } from './handlers/create_reminder';
import { getReminders } from './handlers/get_reminders';
import { createTimeBlock } from './handlers/create_time_block';
import { getTimeBlocks } from './handlers/get_time_blocks';
import { createPomodoroSession } from './handlers/create_pomodoro_session';
import { updatePomodoroSession } from './handlers/update_pomodoro_session';
import { getPomodoroSessions } from './handlers/get_pomodoro_sessions';
import { getProductivityStats } from './handlers/get_productivity_stats';
import { syncUserData } from './handlers/sync_user_data';
import { backupUserData } from './handlers/backup_user_data';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Task management
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input)),

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input)),

  getTasks: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getTasks(input.userId)),

  deleteTask: publicProcedure
    .input(z.object({ taskId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteTask(input.taskId, input.userId)),

  // Event management
  createEvent: publicProcedure
    .input(createEventInputSchema)
    .mutation(({ input }) => createEvent(input)),

  updateEvent: publicProcedure
    .input(updateEventInputSchema)
    .mutation(({ input }) => updateEvent(input)),

  getEvents: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getEvents(input.userId)),

  deleteEvent: publicProcedure
    .input(z.object({ eventId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteEvent(input.eventId, input.userId)),

  // Calendar data
  getCalendarData: publicProcedure
    .input(getCalendarDataInputSchema)
    .query(({ input }) => getCalendarData(input)),

  // Reminders
  createReminder: publicProcedure
    .input(createReminderInputSchema)
    .mutation(({ input }) => createReminder(input)),

  getReminders: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getReminders(input.userId)),

  // Time blocking
  createTimeBlock: publicProcedure
    .input(createTimeBlockInputSchema)
    .mutation(({ input }) => createTimeBlock(input)),

  getTimeBlocks: publicProcedure
    .input(z.object({ 
      userId: z.number(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional()
    }))
    .query(({ input }) => getTimeBlocks(input.userId, input.startDate, input.endDate)),

  // Pomodoro timer
  createPomodoroSession: publicProcedure
    .input(createPomodoroSessionInputSchema)
    .mutation(({ input }) => createPomodoroSession(input)),

  updatePomodoroSession: publicProcedure
    .input(updatePomodoroSessionInputSchema)
    .mutation(({ input }) => updatePomodoroSession(input)),

  getPomodoroSessions: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getPomodoroSessions(input.userId)),

  // Analytics
  getProductivityStats: publicProcedure
    .input(getProductivityStatsInputSchema)
    .query(({ input }) => getProductivityStats(input)),

  // Data synchronization and backup
  syncUserData: publicProcedure
    .input(z.object({ 
      userId: z.number(),
      lastSyncTimestamp: z.coerce.date().optional()
    }))
    .query(({ input }) => syncUserData(input.userId, input.lastSyncTimestamp)),

  backupUserData: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input }) => backupUserData(input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Tym TRPC server listening at port: ${port}`);
}

start();
