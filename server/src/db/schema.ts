
import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer, 
  boolean, 
  pgEnum,
  varchar
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'cancelled']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const eventTypeEnum = pgEnum('event_type', ['meeting', 'appointment', 'personal', 'work', 'other']);
export const reminderTypeEnum = pgEnum('reminder_type', ['notification', 'email', 'both']);
export const pomodoroStatusEnum = pgEnum('pomodoro_status', ['running', 'paused', 'completed', 'cancelled']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Tasks table
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('pending'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  due_date: timestamp('due_date'),
  estimated_duration: integer('estimated_duration'), // in minutes
  actual_duration: integer('actual_duration'), // in minutes
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Events table
export const eventsTable = pgTable('events', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  event_type: eventTypeEnum('event_type').notNull().default('other'),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time').notNull(),
  location: varchar('location', { length: 255 }),
  is_all_day: boolean('is_all_day').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Reminders table
export const remindersTable = pgTable('reminders', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  task_id: integer('task_id').references(() => tasksTable.id, { onDelete: 'cascade' }),
  event_id: integer('event_id').references(() => eventsTable.id, { onDelete: 'cascade' }),
  reminder_type: reminderTypeEnum('reminder_type').notNull().default('notification'),
  reminder_time: timestamp('reminder_time').notNull(),
  message: text('message').notNull(),
  is_sent: boolean('is_sent').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Time blocks table
export const timeBlocksTable = pgTable('time_blocks', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  task_id: integer('task_id').references(() => tasksTable.id, { onDelete: 'cascade' }),
  event_id: integer('event_id').references(() => eventsTable.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time').notNull(),
  color: varchar('color', { length: 7 }), // hex color code
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Pomodoro sessions table
export const pomodoroSessionsTable = pgTable('pomodoro_sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  task_id: integer('task_id').references(() => tasksTable.id, { onDelete: 'cascade' }),
  duration: integer('duration').notNull(), // in minutes
  break_duration: integer('break_duration').notNull(), // in minutes
  status: pomodoroStatusEnum('status').notNull().default('running'),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Productivity stats table
export const productivityStatsTable = pgTable('productivity_stats', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(), // daily stats
  tasks_completed: integer('tasks_completed').notNull().default(0),
  tasks_created: integer('tasks_created').notNull().default(0),
  total_focus_time: integer('total_focus_time').notNull().default(0), // in minutes
  pomodoro_sessions: integer('pomodoro_sessions').notNull().default(0),
  events_attended: integer('events_attended').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  tasks: many(tasksTable),
  events: many(eventsTable),
  reminders: many(remindersTable),
  timeBlocks: many(timeBlocksTable),
  pomodoroSessions: many(pomodoroSessionsTable),
  productivityStats: many(productivityStatsTable),
}));

export const tasksRelations = relations(tasksTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [tasksTable.user_id],
    references: [usersTable.id],
  }),
  reminders: many(remindersTable),
  timeBlocks: many(timeBlocksTable),
  pomodoroSessions: many(pomodoroSessionsTable),
}));

export const eventsRelations = relations(eventsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [eventsTable.user_id],
    references: [usersTable.id],
  }),
  reminders: many(remindersTable),
  timeBlocks: many(timeBlocksTable),
}));

export const remindersRelations = relations(remindersTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [remindersTable.user_id],
    references: [usersTable.id],
  }),
  task: one(tasksTable, {
    fields: [remindersTable.task_id],
    references: [tasksTable.id],
  }),
  event: one(eventsTable, {
    fields: [remindersTable.event_id],
    references: [eventsTable.id],
  }),
}));

export const timeBlocksRelations = relations(timeBlocksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [timeBlocksTable.user_id],
    references: [usersTable.id],
  }),
  task: one(tasksTable, {
    fields: [timeBlocksTable.task_id],
    references: [tasksTable.id],
  }),
  event: one(eventsTable, {
    fields: [timeBlocksTable.event_id],
    references: [eventsTable.id],
  }),
}));

export const pomodoroSessionsRelations = relations(pomodoroSessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [pomodoroSessionsTable.user_id],
    references: [usersTable.id],
  }),
  task: one(tasksTable, {
    fields: [pomodoroSessionsTable.task_id],
    references: [tasksTable.id],
  }),
}));

export const productivityStatsRelations = relations(productivityStatsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [productivityStatsTable.user_id],
    references: [usersTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  tasks: tasksTable,
  events: eventsTable,
  reminders: remindersTable,
  timeBlocks: timeBlocksTable,
  pomodoroSessions: pomodoroSessionsTable,
  productivityStats: productivityStatsTable,
};

// TypeScript types for table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;
export type Event = typeof eventsTable.$inferSelect;
export type NewEvent = typeof eventsTable.$inferInsert;
export type Reminder = typeof remindersTable.$inferSelect;
export type NewReminder = typeof remindersTable.$inferInsert;
export type TimeBlock = typeof timeBlocksTable.$inferSelect;
export type NewTimeBlock = typeof timeBlocksTable.$inferInsert;
export type PomodoroSession = typeof pomodoroSessionsTable.$inferSelect;
export type NewPomodoroSession = typeof pomodoroSessionsTable.$inferInsert;
export type ProductivityStats = typeof productivityStatsTable.$inferSelect;
export type NewProductivityStats = typeof productivityStatsTable.$inferInsert;
