
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { Reminder, Task, Event, CreateReminderInput } from '../../../server/src/schema';

interface ReminderManagerProps {
  tasks: Task[];
  events: Event[];
  userId: number;
}

export function ReminderManager({ tasks, events, userId }: ReminderManagerProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const [createFormData, setCreateFormData] = useState<CreateReminderInput>({
    user_id: userId,
    task_id: null,
    event_id: null,
    reminder_type: 'notification',
    reminder_time: new Date(Date.now() + 3600000), // 1 hour from now
    message: ''
  });

  // Load reminders
  const loadReminders = useCallback(async () => {
    setIsLoading(true);
    try {
      // Create sample reminders data for demonstration
      const sampleReminders: Reminder[] = [
        {
          id: 1,
          user_id: userId,
          task_id: tasks.length > 0 ? tasks[0].id : null,
          event_id: null,
          reminder_type: 'notification',
          reminder_time: new Date(Date.now() + 1800000), // 30 minutes from now
          message: 'Don\'t forget to work on your project proposal!',
          is_sent: false,
          created_at: new Date()
        },
        {
          id: 2,
          user_id: userId,
          task_id: null,
          event_id: events.length > 0 ? events[0].id : null,
          reminder_type: 'both',
          reminder_time: new Date(Date.now() + 900000), // 15 minutes from now
          message: 'Team standup meeting starting soon',
          is_sent: false,
          created_at: new Date()
        }
      ];
      
      setReminders(sampleReminders);
    } catch (error) {
      console.error('Failed to load reminders:', error);
      setReminders([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, tasks, events]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Filter reminders
  const filteredReminders = reminders.filter((reminder: Reminder) => {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return new Date(reminder.reminder_time) > now && !reminder.is_sent;
      case 'past':
        return new Date(reminder.reminder_time) <= now || reminder.is_sent;
      case 'task':
        return reminder.task_id !== null;
      case 'event':
        return reminder.event_id !== null;
      default:
        return true;
    }
  }).sort((a: Reminder, b: Reminder) => 
    new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime()
  );

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.createReminder.mutate(createFormData);
      
      // Create reminder for local state
      const simulatedReminder: Reminder = {
        id: Date.now(),
        user_id: userId,
        task_id: createFormData.task_id,
        event_id: createFormData.event_id,
        reminder_type: createFormData.reminder_type,
        reminder_time: createFormData.reminder_time,
        message: createFormData.message,
        is_sent: false,
        created_at: new Date()
      };
      
      setReminders(prev => [...prev, simulatedReminder]);
      
      // Reset form
      setCreateFormData({
        user_id: userId,
        task_id: null,
        event_id: null,
        reminder_type: 'notification',
        reminder_time: new Date(Date.now() + 3600000),
        message: ''
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create reminder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate smart reminders
  const generateSmartReminders = () => {
    const newReminders: CreateReminderInput[] = [];
    
    // Add reminders for tasks due soon
    tasks.forEach((task: Task) => {
      if (task.due_date && task.status !== 'completed') {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        const timeDiff = dueDate.getTime() - now.getTime();
        const daysDiff = timeDiff / (1000 * 3600 * 24);
        
        if (daysDiff > 0 && daysDiff <= 2) {
          // Reminder 1 day before due date
          const reminderTime = new Date(dueDate.getTime() - 86400000);
          
          newReminders.push({
            user_id: userId,
            task_id: task.id,
            event_id: null,
            reminder_type: 'notification',
            reminder_time: reminderTime,
            message: `Task "${task.title}" is due tomorrow!`
          });
        }
      }
    });
    
    // Add reminders for events starting soon
    events.forEach((event: Event) => {
      const eventStart = new Date(event.start_time);
      const now = new Date();
      
      if (eventStart > now) {
        // Reminder 30 minutes before event
        const reminderTime = new Date(eventStart.getTime() - 1800000);
        
        if (reminderTime > now) {
          newReminders.push({
            user_id: userId,
            task_id: null,
            event_id: event.id,
            reminder_type: 'notification',
            reminder_time: reminderTime,
            message: `Event "${event.title}" starts in 30 minutes`
          });
        }
      }
    });
    
    return newReminders;
  };

  const addSmartReminders = async () => {
    const smartReminders = generateSmartReminders();
    
    for (const reminderData of smartReminders) {
      try {
        await trpc.createReminder.mutate(reminderData);
        
        // Add to local state
        const simulatedReminder: Reminder = {
          id: Date.now() + Math.random(),
          ...reminderData,
          is_sent: false,
          created_at: new Date()
        };
        
        setReminders(prev => [...prev, simulatedReminder]);
      } catch (error) {
        console.error('Failed to create smart reminder:', error);
      }
    }
  };

  const getLinkedItem = (reminder: Reminder) => {
    if (reminder.task_id) {
      return tasks.find((task: Task) => task.id === reminder.task_id);
    }
    if (reminder.event_id) {
      return events.find((event: Event) => event.id === reminder.event_id);
    }
    return null;
  };

  const getReminderTypeColor = (type: string) => {
    switch (type) {
      case 'notification': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'both': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'notification': return '🔔';
      case 'email': return '📧';
      case 'both': return '📢';
      default: return '📋';
    }
  };

  const isReminderUpcoming = (reminder: Reminder) => {
    return new Date(reminder.reminder_time) > new Date() && !reminder.is_sent;
  };

  const isReminderOverdue = (reminder: Reminder) => {
    return new Date(reminder.reminder_time) <= new Date() && !reminder.is_sent;
  };

  const getTimeUntilReminder = (reminder: Reminder) => {
    const now = new Date();
    const reminderTime = new Date(reminder.reminder_time);
    const timeDiff = reminderTime.getTime() - now.getTime();
    
    if (timeDiff < 0) return 'Overdue';
    
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Reminder Manager Header */}
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🔔 Reminder Manager
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={addSmartReminders}
                disabled={isLoading}
              >
                🤖 Smart Reminders
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    ➕ Create Reminder
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Reminder</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateReminder} className="space-y-4">
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={createFormData.message}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setCreateFormData((prev: CreateReminderInput) => ({ 
                            ...prev, 
                            message: e.target.value 
                          }))
                        }
                        placeholder="Reminder message"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="reminder_time">Reminder Time</Label>
                      <Input
                        id="reminder_time"
                        type="datetime-local"
                        value={new Date(createFormData.reminder_time).toISOString().slice(0, 16)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateReminderInput) => ({ 
                            ...prev, 
                            reminder_time: new Date(e.target.value) 
                          }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="reminder_type">Type</Label>
                      <Select 
                        value={createFormData.reminder_type} 
                        onValueChange={(value: 'notification' | 'email' | 'both') =>
                          setCreateFormData((prev: CreateReminderInput) => ({ ...prev, reminder_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification">🔔 Notification</SelectItem>
                          <SelectItem value="email">📧 Email</SelectItem>
                          <SelectItem value="both">📢 Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="task_id">Link to Task (optional)</Label>
                      <Select 
                        value={createFormData.task_id?.toString() || (tasks.length > 0 ? 'none' : 'empty')} 
                        onValueChange={(value: string) => 
                          setCreateFormData((prev: CreateReminderInput) => ({ 
                            ...prev, 
                            task_id: value === 'none' || value === 'empty' ? null : parseInt(value),
                            event_id: null // Clear event if task is selected
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks.length > 0 ? (
                            <>
                              <SelectItem value="none">No task</SelectItem>
                              {tasks.map((task: Task) => (
                                <SelectItem key={task.id} value={task.id.toString()}>
                                  {task.title}
                                </SelectItem>
                              ))}
                            </>
                          ) : (
                            <SelectItem value="empty">No tasks available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="event_id">Link to Event (optional)</Label>
                      <Select 
                        value={createFormData.event_id?.toString() || (events.length > 0 ? 'none' : 'empty')} 
                        onValueChange={(value: string) => 
                          setCreateFormData((prev: CreateReminderInput) => ({ 
                            ...prev, 
                            event_id: value === 'none' || value === 'empty' ? null : parseInt(value),
                            task_id: null // Clear task if event is selected
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an event" />
                        </SelectTrigger>
                        <SelectContent>
                          {events.length > 0 ? (
                            <>
                              <SelectItem value="none">No event</SelectItem>
                              {events.map((event: Event) => (
                                <SelectItem key={event.id} value={event.id.toString()}>
                                  {event.title}
                                </SelectItem>
                              ))}
                            </>
                          ) : (
                            <SelectItem value="empty">No events available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Reminder'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Filter Reminders</Label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reminders</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                  <SelectItem value="task">Task Reminders</SelectItem>
                  <SelectItem value="event">Event Reminders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-600 mt-6">
              Showing {filteredReminders.length} of {reminders.length} reminders
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminders List */}
      <div className="space-y-4">
        {filteredReminders.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <div className="text-4xl mb-4">🔔</div>
                <p className="text-lg font-medium">No reminders found</p>
                <p className="text-sm">Create your first reminder or generate smart reminders!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredReminders.map((reminder: Reminder) => {
            const linkedItem = getLinkedItem(reminder);
            
            return (
              <Card 
                key={reminder.id} 
                className={`bg-white/70 backdrop-blur-sm transition-all hover:shadow-md ${
                  isReminderOverdue(reminder) ? 'ring-2 ring-red-200' : 
                  isReminderUpcoming(reminder) ? 'ring-2 ring-blue-200' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {getReminderTypeIcon(reminder.reminder_type)}
                        </span>
                        <h3 className="font-semibold text-lg">{reminder.message}</h3>
                        {isReminderOverdue(reminder) && (
                          <Badge className="bg-red-500 text-white animate-pulse">
                            ⚠️ Overdue
                          </Badge>
                        )}
                        {isReminderUpcoming(reminder) && (
                          <Badge variant="outline">
                            🕒 {getTimeUntilReminder(reminder)}
                          </Badge>
                        )}
                        {reminder.is_sent && (
                          <Badge className="bg-green-100 text-green-800">
                            ✅ Sent
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getReminderTypeColor(reminder.reminder_type)}>
                          {reminder.reminder_type.toUpperCase()}
                        </Badge>
                        
                        {linkedItem && (
                          <Badge variant="outline">
                            {'priority' in linkedItem 
                              ? `📋 Task: ${linkedItem.title}` 
                              : `📅 Event: ${linkedItem.title}`
                            }
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          🕒 Reminder: {new Date(reminder.reminder_time).toLocaleString()}
                        </span>
                        <span>
                          Created: {reminder.created_at.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          // Remove reminder from local state
                          setReminders(prev => prev.filter(r => r.id !== reminder.id));
                        }}
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Quick Reminder Templates */}
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">⚡ Quick Reminder Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const reminderTime = new Date();
                reminderTime.setHours(reminderTime.getHours() + 1);
                
                setCreateFormData({
                  ...createFormData,
                  message: 'Take a break and stretch!',
                  reminder_time: reminderTime,
                  reminder_type: 'notification'
                });
                setIsCreateDialogOpen(true);
              }}
            >
              ☕ Break Reminder (1h)
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const reminderTime = new Date();
                reminderTime.setDate(reminderTime.getDate() + 1);
                reminderTime.setHours(9, 0, 0, 0);
                
                setCreateFormData({
                  ...createFormData,
                  message: 'Daily standup meeting reminder',
                  reminder_time: reminderTime,
                  reminder_type: 'notification'
                });
                setIsCreateDialogOpen(true);
              }}
            >
              🏃 Daily Standup (Tomorrow)
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const reminderTime = new Date();
                reminderTime.setDate(reminderTime.getDate() + 7);
                reminderTime.setHours(10, 0, 0, 0);
                
                setCreateFormData({
                  ...createFormData,
                  message: 'Weekly review and planning session',
                  reminder_time: reminderTime,
                  reminder_type: 'both'
                });
                setIsCreateDialogOpen(true);
              }}
            >
              📊 Weekly Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
