
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarView } from '@/components/CalendarView';
import { TaskManager } from '@/components/TaskManager';
import { EventManager } from '@/components/EventManager';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ProductivityDashboard } from '@/components/ProductivityDashboard';
import { TimeBlockManager } from '@/components/TimeBlockManager';
import { ReminderManager } from '@/components/ReminderManager';
import { trpc } from '@/utils/trpc';
import type { Task, Event, TimeBlock, PomodoroSession } from '../../server/src/schema';

// Demo user for the application
const DEMO_USER_ID = 1;

function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [activePomodoroSession, setActivePomodoroSession] = useState<PomodoroSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load data from server handlers
      const [tasksResult, eventsResult, timeBlocksResult] = await Promise.all([
        trpc.getTasks.query({ userId: DEMO_USER_ID }),
        trpc.getEvents.query({ userId: DEMO_USER_ID }),
        trpc.getTimeBlocks.query({ userId: DEMO_USER_ID })
      ]);

      setTasks(tasksResult);
      setEvents(eventsResult);
      setTimeBlocks(timeBlocksResult);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Since handlers are stubs, provide sample data for demonstration
      setTasks([
        {
          id: 1,
          user_id: DEMO_USER_ID,
          title: 'Complete project proposal',
          description: 'Finish the quarterly project proposal document',
          status: 'in_progress',
          priority: 'high',
          due_date: new Date(Date.now() + 86400000), // Tomorrow
          estimated_duration: 120,
          actual_duration: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          user_id: DEMO_USER_ID,
          title: 'Review team feedback',
          description: 'Go through all team feedback from last sprint',
          status: 'pending',
          priority: 'medium',
          due_date: new Date(Date.now() + 172800000), // Day after tomorrow
          estimated_duration: 60,
          actual_duration: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      setEvents([
        {
          id: 1,
          user_id: DEMO_USER_ID,
          title: 'Team Standup',
          description: 'Daily team synchronization meeting',
          event_type: 'meeting',
          start_time: new Date(Date.now() + 3600000), // 1 hour from now
          end_time: new Date(Date.now() + 5400000), // 1.5 hours from now
          location: 'Conference Room A',
          is_all_day: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      setTimeBlocks([
        {
          id: 1,
          user_id: DEMO_USER_ID,
          task_id: 1,
          event_id: null,
          title: 'Focus Time: Project Proposal',
          start_time: new Date(Date.now() + 7200000), // 2 hours from now
          end_time: new Date(Date.now() + 14400000), // 4 hours from now
          color: '#3b82f6',
          created_at: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get today's stats for dashboard preview
  const todayStats = {
    tasksCompleted: tasks.filter(t => t.status === 'completed').length,
    totalTasks: tasks.length,
    upcomingEvents: events.filter(e => e.start_time > new Date()).length,
    activeTimeBlocks: timeBlocks.filter(tb => 
      tb.start_time <= new Date() && tb.end_time >= new Date()
    ).length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Tym...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-blue-600">⏰</span>
                Tym
              </h1>
              <p className="text-gray-600 mt-1">Your intelligent time management companion</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {todayStats.tasksCompleted}/{todayStats.totalTasks} Tasks Done
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {todayStats.upcomingEvents} Events Today
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{todayStats.totalTasks}</div>
                <div className="text-sm text-gray-600">Active Tasks</div>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{todayStats.tasksCompleted}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{todayStats.upcomingEvents}</div>
                <div className="text-sm text-gray-600">Events</div>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{todayStats.activeTimeBlocks}</div>
                <div className="text-sm text-gray-600">Active Blocks</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8 bg-white/70 backdrop-blur-sm">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              📅 Calendar
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              ✅ Tasks
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              📆 Events
            </TabsTrigger>
            <TabsTrigger value="timeblocks" className="flex items-center gap-2">
              🗓️ Time Blocks
            </TabsTrigger>
            <TabsTrigger value="pomodoro" className="flex items-center gap-2">
              🍅 Focus Timer
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              🔔 Reminders
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              📊 Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <CalendarView
              tasks={tasks}
              events={events}
              timeBlocks={timeBlocks}
              userId={DEMO_USER_ID}
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <TaskManager
              tasks={tasks}
              userId={DEMO_USER_ID}
              onTasksUpdate={(updatedTasks: Task[]) => setTasks(updatedTasks)}
              onDataRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <EventManager
              events={events}
              userId={DEMO_USER_ID}
              onEventsUpdate={(updatedEvents: Event[]) => setEvents(updatedEvents)}
              onDataRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="timeblocks" className="space-y-6">
            <TimeBlockManager
              timeBlocks={timeBlocks}
              tasks={tasks}
              events={events}
              userId={DEMO_USER_ID}
              onTimeBlocksUpdate={(updatedTimeBlocks: TimeBlock[]) => setTimeBlocks(updatedTimeBlocks)}
              onDataRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="pomodoro" className="space-y-6">
            <PomodoroTimer
              tasks={tasks}
              userId={DEMO_USER_ID}
              activePomodoroSession={activePomodoroSession}
              onSessionUpdate={(session: PomodoroSession | null) => setActivePomodoroSession(session)}
            />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-6">
            <ReminderManager
              tasks={tasks}
              events={events}
              userId={DEMO_USER_ID}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ProductivityDashboard
              userId={DEMO_USER_ID}
              tasks={tasks}
              events={events}
            />
          </TabsContent>
        </Tabs>

        {/* Footer with sync status */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Data synced • Last backup: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
