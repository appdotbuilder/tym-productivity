
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { TimeBlock, Task, Event, CreateTimeBlockInput } from '../../../server/src/schema';

interface TimeBlockManagerProps {
  timeBlocks: TimeBlock[];
  tasks: Task[];
  events: Event[];
  userId: number;
  onTimeBlocksUpdate: (timeBlocks: TimeBlock[]) => void;
  onDataRefresh: () => void;
}

export function TimeBlockManager({ 
  timeBlocks, 
  tasks, 
  events, 
  userId, 
  onTimeBlocksUpdate, 
  onDataRefresh
}: TimeBlockManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const [createFormData, setCreateFormData] = useState<CreateTimeBlockInput>({
    user_id: userId,
    task_id: null,
    event_id: null,
    title: '',
    start_time: new Date(),
    end_time: new Date(Date.now() + 3600000), // 1 hour later
    color: '#3b82f6'
  });

  const predefinedColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' }
  ];

  // Filter time blocks for selected date
  const filteredTimeBlocks = timeBlocks.filter(block => {
    const blockDate = new Date(block.start_time);
    return blockDate.toDateString() === viewDate.toDateString();
  }).sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  // Generate time slots for the day
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = new Date(viewDate);
        time.setHours(hour, minute, 0, 0);
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleCreateTimeBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.createTimeBlock.mutate(createFormData);
      
      // Create time block for local state
      const simulatedTimeBlock: TimeBlock = {
        id: Date.now(),
        user_id: userId,
        task_id: createFormData.task_id,
        event_id: createFormData.event_id,
        title: createFormData.title,
        start_time: createFormData.start_time,
        end_time: createFormData.end_time,
        color: createFormData.color,
        created_at: new Date()
      };
      
      onTimeBlocksUpdate([...timeBlocks, simulatedTimeBlock]);
      
      // Reset form
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 3600000);
      setCreateFormData({
        user_id: userId,
        task_id: null,
        event_id: null,
        title: '',
        start_time: now,
        end_time: oneHourLater,
        color: '#3b82f6'
      });
      setIsCreateDialogOpen(false);
      onDataRefresh();
    } catch (error) {
      console.error('Failed to create time block:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTimeBlock = async (timeBlockId: number) => {
    setIsLoading(true);
    
    try {
      // No delete endpoint for time blocks in the router, so we'll simulate
      const updatedTimeBlocks = timeBlocks.filter((block: TimeBlock) => block.id !== timeBlockId);
      onTimeBlocksUpdate(updatedTimeBlocks);
      onDataRefresh();
    } catch (error) {
      console.error('Failed to delete time block:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setViewDate(newDate);
  };

  // Get time blocks for a specific time slot
  const getTimeBlocksForSlot = (slotTime: Date) => {
    return filteredTimeBlocks.filter(block => {
      const blockStart = new Date(block.start_time);
      const blockEnd = new Date(block.end_time);
      return slotTime >= blockStart && slotTime < blockEnd;
    });
  };

  // Check if time slot has conflicts
  const hasConflicts = (slotTime: Date) => {
    const blocks = getTimeBlocksForSlot(slotTime);
    return blocks.length > 1;
  };

  const getLinkedItem = (timeBlock: TimeBlock) => {
    if (timeBlock.task_id) {
      return tasks.find((task: Task) => task.id === timeBlock.task_id);
    }
    if (timeBlock.event_id) {
      return events.find((event: Event) => event.id === timeBlock.event_id);
    }
    return null;
  };

  const formatDuration = (startTime: Date, endTime: Date) => {
    const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60);
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (hours === 0) return `${minutes}min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  };

  return (
    <div className="space-y-6">
      {/* Time Block Manager Header */}
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🗓️ Time Block Manager
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                  ←
                </Button>
                <span className="font-medium min-w-48 text-center">
                  {viewDate.toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                  →
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewDate(new Date())}
              >
                Today
              </Button>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    ➕ Create Time Block
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Time Block</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTimeBlock} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={createFormData.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateTimeBlockInput) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Time block title"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="datetime-local"
                        value={new Date(createFormData.start_time).toISOString().slice(0, 16)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateTimeBlockInput) => ({ 
                            ...prev, 
                            start_time: new Date(e.target.value) 
                          }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="datetime-local"
                        value={new Date(createFormData.end_time).toISOString().slice(0, 16)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateTimeBlockInput) => ({ 
                            ...prev, 
                            end_time: new Date(e.target.value) 
                          }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="task_id">Link to Task (optional)</Label>
                      <Select 
                        value={createFormData.task_id?.toString() || 'none'} 
                        onValueChange={(value: string) => 
                          setCreateFormData((prev: CreateTimeBlockInput) => ({ 
                            ...prev, 
                            task_id: value === 'none' ? null : parseInt(value),
                            event_id: null // Clear event if task is selected
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No task</SelectItem>
                          {tasks.filter((task: Task) => task.status !== 'completed').map((task: Task) => (
                            <SelectItem key={task.id} value={task.id.toString()}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="event_id">Link to Event (optional)</Label>
                      <Select 
                        value={createFormData.event_id?.toString() || 'none'} 
                        onValueChange={(value: string) => 
                          setCreateFormData((prev: CreateTimeBlockInput) => ({ 
                            ...prev, 
                            event_id: value === 'none' ? null : parseInt(value),
                            task_id: null // Clear task if event is selected
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an event" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No event</SelectItem>
                          {events.map((event: Event) => (
                            <SelectItem key={event.id} value={event.id.toString()}>
                              {event.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Color</Label>
                      <div className="flex gap-2 mt-2">
                        {predefinedColors.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              createFormData.color === color.value 
                                ? 'border-gray-800' 
                                : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => 
                              setCreateFormData((prev: CreateTimeBlockInput) => ({ 
                                ...prev, 
                                color: color.value 
                              }))
                            }
                            title={color.name}
                          />
                        ))}
                      </div>
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
                        {isLoading ? 'Creating...' : 'Create Time Block'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        {/* Time Schedule */}
        <div className="col-span-9">
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-1">
                {timeSlots.map((slot, index) => {
                  if (index % 2 === 1) return null; // Show only hourly slots for main display
                  
                  const timeString = slot.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  const blocksInSlot = getTimeBlocksForSlot(slot);
                  const hasConflict = hasConflicts(slot);

                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 min-h-16 border-b border-gray-100 py-2">
                      <div className="col-span-2 text-sm text-gray-500 font-medium">
                        {timeString}
                      </div>
                      <div className="col-span-10 space-y-1">
                        {blocksInSlot.map((timeBlock: TimeBlock) => {
                          const linkedItem = getLinkedItem(timeBlock);
                          return (
                            <div
                              key={timeBlock.id}
                              className={`p-3 rounded-lg text-sm border-l-4 group ${
                                hasConflict ? 'ring-2 ring-red-300' : ''
                              }`}
                              style={{ 
                                backgroundColor: `${timeBlock.color}20`,
                                borderLeftColor: timeBlock.color || '#3b82f6'
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-800">
                                    {timeBlock.title}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {formatDuration(timeBlock.start_time, timeBlock.end_time)}
                                    {linkedItem && (
                                      <span className="ml-2">
                                        {'priority' in linkedItem 
                                          ? `📋 ${linkedItem.title}` 
                                          : `📅 ${linkedItem.title}`
                                        }
                                      </span>
                                    )}
                                  </div>
                                  {hasConflict && (
                                    <Badge className="bg-red-100 text-red-800 mt-1">
                                      ⚠️ Conflict
                                    </Badge>
                                  )}
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      ×
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Time Block</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{timeBlock.title}"?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteTimeBlock(timeBlock.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          );
                        })}
                        {blocksInSlot.length === 0 && (
                          <div className="h-12 flex items-center text-xs text-gray-400">
                            <span className="opacity-0 hover:opacity-100 cursor-pointer">
                              Click to add time block
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="col-span-3 space-y-4">
          {/* Day Summary */}
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Day Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Time Blocks</span>
                <span className="font-medium">{filteredTimeBlocks.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Blocked Time</span>
                <span className="font-medium">
                  {Math.round(
                    filteredTimeBlocks.reduce((total, block) => 
                      total + (new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / (1000 * 60), 0
                    )
                  )}min
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Conflicts</span>
                <span className={`font-medium ${
                  filteredTimeBlocks.some(block => hasConflicts(new Date(block.start_time))) 
                    ? 'text-red-600' : 'text-green-600'
                }`}>
                  {filteredTimeBlocks.filter(block => hasConflicts(new Date(block.start_time))).length || 'None'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => {
                  const now = new Date();
                  const oneHourLater = new Date(now.getTime() + 3600000);
                  setCreateFormData({
                    ...createFormData,
                    title: 'Focus Time',
                    start_time: now,
                    end_time: oneHourLater
                  });
                  setIsCreateDialogOpen(true);
                }}
              >
                🎯 Block Focus Time
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => {
                  const now = new Date();
                  const thirtyMinLater = new Date(now.getTime() + 1800000);
                  setCreateFormData({
                    ...createFormData,
                    title: 'Break',
                    start_time: now,
                    end_time: thirtyMinLater,
                    color: '#10b981'
                  });
                  setIsCreateDialogOpen(true);
                }}
              >
                ☕ Schedule Break
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => {
                  const now = new Date();
                  const twoHoursLater = new Date(now.getTime() + 7200000);
                  setCreateFormData({
                    ...createFormData,
                    title: 'Deep Work Session',
                    start_time: now,
                    end_time: twoHoursLater,
                    color: '#8b5cf6'
                  });
                  setIsCreateDialogOpen(true);
                }}
              >
                🧠 Deep Work Block
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">💡 Time Blocking Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Block similar tasks together</li>
                <li>• Include buffer time between blocks</li>
                <li>• Schedule your most important work first</li>
                <li>• Use colors to categorize different types of work</li>
                <li>• Review and adjust your blocks regularly</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
