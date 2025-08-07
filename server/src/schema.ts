
import { z } from 'zod';

// Enums for various types
export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const eventTypeSchema = z.enum(['meeting', 'appointment', 'personal', 'work', 'other']);
export const reminderTypeSchema = z.enum(['notification', 'email', 'both']);
export const pomodoroStatusSchema = z.enum(['running', 'paused', 'completed', 'cancelled']);
export const viewTypeSchema = z.enum(['daily', 'weekly', 'monthly']);

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  password_hash: z.string(),
  timezone: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Task schema
export const taskSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  due_date: z.coerce.date().nullable(),
  estimated_duration: z.number().nullable(), // in minutes
  actual_duration: z.number().nullable(), // in minutes
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Event schema
export const eventSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  event_type: eventTypeSchema,
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  location: z.string().nullable(),
  is_all_day: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Event = z.infer<typeof eventSchema>;

// Reminder schema
export const reminderSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  task_id: z.number().nullable(),
  event_id: z.number().nullable(),
  reminder_type: reminderTypeSchema,
  reminder_time: z.coerce.date(),
  message: z.string(),
  is_sent: z.boolean(),
  created_at: z.coerce.date()
});

export type Reminder = z.infer<typeof reminderSchema>;

// Time block schema
export const timeBlockSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  task_id: z.number().nullable(),
  event_id: z.number().nullable(),
  title: z.string(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  color: z.string().nullable(),
  created_at: z.coerce.date()
});

export type TimeBlock = z.infer<typeof timeBlockSchema>;

// Pomodoro session schema
export const pomodoroSessionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  task_id: z.number().nullable(),
  duration: z.number(), // in minutes
  break_duration: z.number(), // in minutes
  status: pomodoroStatusSchema,
  started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type PomodoroSession = z.infer<typeof pomodoroSessionSchema>;

// Productivity analytics schema
export const productivityStatsSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  date: z.coerce.date(),
  tasks_completed: z.number().int(),
  tasks_created: z.number().int(),
  total_focus_time: z.number(), // in minutes
  pomodoro_sessions: z.number().int(),
  events_attended: z.number().int(),
  created_at: z.coerce.date()
});

export type ProductivityStats = z.infer<typeof productivityStatsSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  timezone: z.string()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createTaskInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  priority: taskPrioritySchema,
  due_date: z.coerce.date().nullable(),
  estimated_duration: z.number().positive().nullable()
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const createEventInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  event_type: eventTypeSchema,
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  location: z.string().nullable(),
  is_all_day: z.boolean()
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

export const createReminderInputSchema = z.object({
  user_id: z.number(),
  task_id: z.number().nullable(),
  event_id: z.number().nullable(),
  reminder_type: reminderTypeSchema,
  reminder_time: z.coerce.date(),
  message: z.string()
});

export type CreateReminderInput = z.infer<typeof createReminderInputSchema>;

export const createTimeBlockInputSchema = z.object({
  user_id: z.number(),
  task_id: z.number().nullable(),
  event_id: z.number().nullable(),
  title: z.string().min(1),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  color: z.string().nullable()
});

export type CreateTimeBlockInput = z.infer<typeof createTimeBlockInputSchema>;

export const createPomodoroSessionInputSchema = z.object({
  user_id: z.number(),
  task_id: z.number().nullable(),
  duration: z.number().positive(),
  break_duration: z.number().positive()
});

export type CreatePomodoroSessionInput = z.infer<typeof createPomodoroSessionInputSchema>;

// Update schemas
export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_date: z.coerce.date().nullable().optional(),
  estimated_duration: z.number().positive().nullable().optional(),
  actual_duration: z.number().positive().nullable().optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const updateEventInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  event_type: eventTypeSchema.optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  location: z.string().nullable().optional(),
  is_all_day: z.boolean().optional()
});

export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;

export const updatePomodoroSessionInputSchema = z.object({
  id: z.number(),
  status: pomodoroStatusSchema,
  completed_at: z.coerce.date().nullable().optional()
});

export type UpdatePomodoroSessionInput = z.infer<typeof updatePomodoroSessionInputSchema>;

// Query schemas
export const getCalendarDataInputSchema = z.object({
  user_id: z.number(),
  view_type: viewTypeSchema,
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type GetCalendarDataInput = z.infer<typeof getCalendarDataInputSchema>;

export const getProductivityStatsInputSchema = z.object({
  user_id: z.number(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type GetProductivityStatsInput = z.infer<typeof getProductivityStatsInputSchema>;
