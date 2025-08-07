
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import type { Task, Event, TimeBlock } from '../../../server/src/schema';

interface CalendarViewProps {
  tasks: Task[];
  events: Event[];
  timeBlocks: TimeBlock[];
  userId: number;
}

type ViewType = 'daily' | 'weekly' | 'monthly';

export function CalendarView({ tasks, events, timeBlocks }: CalendarViewProps) {
  const [viewType, setViewType] = useState<ViewType>('weekly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState<{
    tasks: Task[];
    events: Event[];
    timeBlocks: TimeBlock[];
  }>({ tasks: [], events: [], timeBlocks: [] });

  // Calculate date range based on view type
  const getDateRange = useCallback((date: Date, view: ViewType) => {
    const start = new Date(date);
    const end = new Date(date);

    switch (view) {
      case 'daily': {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'weekly': {
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'monthly': {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      }
    }

    return { start, end };
  }, []);

  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    const { start, end } = getDateRange(selectedDate, viewType);
    
    try {
      // Filter existing data by date range
      const filteredTasks = tasks.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return dueDate >= start && dueDate <= end;
      });

      const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate >= start && eventDate <= end;
      });

      const filteredTimeBlocks = timeBlocks.filter(block => {
        const blockDate = new Date(block.start_time);
        return blockDate >= start && blockDate <= end;
      });

      setCalendarData({
        tasks: filteredTasks,
        events: filteredEvents,
        timeBlocks: filteredTimeBlocks
      });
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    }
  }, [selectedDate, viewType, tasks, events, timeBlocks, getDateRange]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    switch (viewType) {
      case 'daily':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setSelectedDate(newDate);
  };

  // Format date range for display
  const getDateRangeString = () => {
    const { start, end } = getDateRange(selectedDate, viewType);
    
    switch (viewType) {
      case 'daily':
        return selectedDate.toLocaleDateString();
      case 'weekly':
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      case 'monthly':
        return selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      default:
        return '';
    }
  };

  // Get time slots for daily/weekly view
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        hour
      });
    }
    return slots;
  };

  // Get items for specific hour
  const getItemsForHour = (hour: number) => {
    const items: Array<{ type: 'event' | 'timeblock'; item: Event | TimeBlock }> = [];
    
    calendarData.events.forEach(event => {
      const eventHour = new Date(event.start_time).getHours();
      if (eventHour === hour) {
        items.push({ type: 'event', item: event });
      }
    });

    calendarData.timeBlocks.forEach(block => {
      const blockHour = new Date(block.start_time).getHours();
      if (blockHour === hour) {
        items.push({ type: 'timeblock', item: block });
      }
    });

    return items;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              📅 Calendar View
            </CardTitle>
            <div className="flex items-center gap-4">
              <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                  ←
                </Button>
                <span className="font-medium min-w-48 text-center">
                  {getDateRangeString()}
                </span>
                <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                  →
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Calendar Area */}
        <div className="col-span-9">
          {viewType === 'monthly' ? (
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date: Date | undefined) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="space-y-1">
                  {getTimeSlots().map(({ time, hour }) => (
                    <div key={hour} className="grid grid-cols-12 gap-2 min-h-12 border-b border-gray-100 py-2">
                      <div className="col-span-2 text-sm text-gray-500 font-medium">
                        {time}
                      </div>
                      <div className="col-span-10 space-y-1">
                        {getItemsForHour(hour).map((item, index) => (
                          <div
                            key={`${item.type}-${item.item.id}-${index}`}
                            className={`p-2 rounded-md text-sm ${
                              item.type === 'event'
                                ? 'bg-purple-100 text-purple-800 border-l-4 border-purple-500'
                                : 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
                            }`}
                          >
                            <div className="font-medium">{item.item.title}</div>
                            {item.type === 'event' && 'start_time' in item.item && 'end_time' in item.item && (
                              <div className="text-xs opacity-75">
                                {new Date(item.item.start_time).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })} - {new Date(item.item.end_time).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-span-3 space-y-4">
          {/* Today's Tasks */}
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Today's Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {calendarData.tasks.length === 0 ? (
                <p className="text-sm text-gray-500">No tasks for this period</p>
              ) : (
                calendarData.tasks.map((task: Task) => (
                  <div key={task.id} className="p-3 rounded-md border bg-white">
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(task.priority)}`} />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-gray-600 mt-1">{task.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">
                            {task.priority}
                          </Badge>
                        </div>
                        {task.due_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {calendarData.events.length === 0 ? (
                <p className="text-sm text-gray-500">No events for this period</p>
              ) : (
                calendarData.events.map((event: Event) => (
                  <div key={event.id} className="p-3 rounded-md border bg-white">
                    <div className="font-medium text-sm">{event.title}</div>
                    {event.description && (
                      <div className="text-xs text-gray-600 mt-1">{event.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        {event.event_type}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(event.start_time).toLocaleString()}
                    </div>
                    {event.location && (
                      <div className="text-xs text-gray-500">📍 {event.location}</div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
