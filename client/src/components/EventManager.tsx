
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Event, CreateEventInput, UpdateEventInput } from '../../../server/src/schema';

interface EventManagerProps {
  events: Event[];
  userId: number;
  onEventsUpdate: (events: Event[]) => void;
  onDataRefresh: () => void;
}

export function EventManager({ events, userId, onEventsUpdate, onDataRefresh }: EventManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const [createFormData, setCreateFormData] = useState<CreateEventInput>({
    user_id: userId,
    title: '',
    description: null,
    event_type: 'other',
    start_time: new Date(),
    end_time: new Date(Date.now() + 3600000), // 1 hour later
    location: null,
    is_all_day: false
  });

  const [editFormData, setEditFormData] = useState<Partial<UpdateEventInput>>({});

  // Filter events
  const filteredEvents = events.filter((event: Event) => {
    const now = new Date();
    switch (filter) {
      case 'today': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return new Date(event.start_time) >= today && new Date(event.start_time) < tomorrow;
      }
      case 'upcoming':
        return new Date(event.start_time) > now;
      case 'past':
        return new Date(event.end_time) < now;
      case 'meeting':
      case 'appointment':
      case 'personal':
      case 'work':
        return event.event_type === filter;
      default:
        return true;
    }
  }).sort((a: Event, b: Event) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.createEvent.mutate(createFormData);
      
      // Create new event for local state
      const simulatedEvent: Event = {
        id: Date.now(),
        user_id: userId,
        title: createFormData.title,
        description: createFormData.description,
        event_type: createFormData.event_type,
        start_time: createFormData.start_time,
        end_time: createFormData.end_time,
        location: createFormData.location,
        is_all_day: createFormData.is_all_day,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      onEventsUpdate([...events, simulatedEvent]);
      
      // Reset form
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 3600000);
      setCreateFormData({
        user_id: userId,
        title: '',
        description: null,
        event_type: 'other',
        start_time: now,
        end_time: oneHourLater,
        location: null,
        is_all_day: false
      });
      setIsCreateDialogOpen(false);
      onDataRefresh();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    
    setIsLoading(true);
    
    try {
      const updatedEventData: UpdateEventInput = {
        id: selectedEvent.id,
        ...editFormData
      };
      
      await trpc.updateEvent.mutate(updatedEventData);
      
      // Update local state
      const updatedEvents = events.map((event: Event) =>
        event.id === selectedEvent.id
          ? { ...event, ...editFormData, updated_at: new Date() }
          : event
      );
      
      onEventsUpdate(updatedEvents);
      setIsEditDialogOpen(false);
      setSelectedEvent(null);
      setEditFormData({});
      onDataRefresh();
    } catch (error) {
      console.error('Failed to update event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    setIsLoading(true);
    
    try {
      await trpc.deleteEvent.mutate({ eventId, userId });
      
      // Update local state
      const updatedEvents = events.filter((event: Event) => event.id !== eventId);
      onEventsUpdate(updatedEvents);
      onDataRefresh();
    } catch (error) {
      console.error('Failed to delete event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (event: Event) => {
    setSelectedEvent(event);
    setEditFormData({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      is_all_day: event.is_all_day
    });
    setIsEditDialogOpen(true);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800';
      case 'appointment': return 'bg-green-100 text-green-800';
      case 'personal': return 'bg-purple-100 text-purple-800';
      case 'work': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'meeting': return '👥';
      case 'appointment': return '📅';
      case 'personal': return '🏠';
      case 'work': return '💼';
      default: return '📋';
    }
  };

  const isEventToday = (event: Event) => {
    const today = new Date();
    const eventDate = new Date(event.start_time);
    return eventDate.toDateString() === today.toDateString();
  };

  const isEventUpcoming = (event: Event) => {
    return new Date(event.start_time) > new Date();
  };

  return (
    <div className="space-y-6">
      {/* Event Manager Header */}
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              📆 Event Manager
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  ➕ Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={createFormData.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateEventInput) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Event title"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={createFormData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCreateFormData((prev: CreateEventInput) => ({ 
                          ...prev, 
                          description: e.target.value || null 
                        }))
                      }
                      placeholder="Event description (optional)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="event_type">Type</Label>
                    <Select 
                      value={createFormData.event_type} 
                      onValueChange={(value: 'meeting' | 'appointment' | 'personal' | 'work' | 'other') =>
                        setCreateFormData((prev: CreateEventInput) => ({ ...prev, event_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">👥 Meeting</SelectItem>
                        <SelectItem value="appointment">📅 Appointment</SelectItem>
                        <SelectItem value="personal">🏠 Personal</SelectItem>
                        <SelectItem value="work">💼 Work</SelectItem>
                        <SelectItem value="other">📋 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_all_day"
                      checked={createFormData.is_all_day}
                      onCheckedChange={(checked: boolean) =>
                        setCreateFormData((prev: CreateEventInput) => ({ ...prev, is_all_day: checked }))
                      }
                    />
                    <Label htmlFor="is_all_day">All day event</Label>
                  </div>

                  {!createFormData.is_all_day && (
                    <>
                      <div>
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                          id="start_time"
                          type="datetime-local"
                          value={new Date(createFormData.start_time).toISOString().slice(0, 16)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateFormData((prev: CreateEventInput) => ({ 
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
                            setCreateFormData((prev: CreateEventInput) => ({ 
                              ...prev, 
                              end_time: new Date(e.target.value) 
                            }))
                          }
                          required
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={createFormData.location || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateEventInput) => ({ 
                          ...prev, 
                          location: e.target.value || null 
                        }))
                      }
                      placeholder="Event location (optional)"
                    />
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
                      {isLoading ? 'Creating...' : 'Create Event'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Filter Events</Label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="appointment">Appointments</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-600 mt-6">
              Showing {filteredEvents.length} of {events.length} events
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-lg font-medium">No events found</p>
                <p className="text-sm">Create your first event to get started!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event: Event) => (
            <Card 
              key={event.id} 
              className={`bg-white/70 backdrop-blur-sm transition-all hover:shadow-md ${
                isEventToday(event) ? 'ring-2 ring-blue-200' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getEventIcon(event.event_type)}</span>
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      {isEventToday(event) && (
                        <Badge className="bg-blue-500 text-white">
                          📅 Today
                        </Badge>
                      )}
                      {isEventUpcoming(event) && !isEventToday(event) && (
                        <Badge variant="outline">
                          🔜 Upcoming
                        </Badge>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="text-gray-600 mb-3">{event.description}</p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type.toUpperCase()}
                      </Badge>
                      
                      {event.is_all_day && (
                        <Badge variant="outline">
                          🌅 All Day
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        🕒 {event.is_all_day 
                          ? new Date(event.start_time).toLocaleDateString()
                          : `${new Date(event.start_time).toLocaleDateString()} ${new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        }
                        {!event.is_all_day && ` - ${new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                      
                      {event.location && (
                        <span>📍 {event.location}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(event)}
                    >
                      ✏️ Edit
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          🗑️ Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Event</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{event.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteEvent(event.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateEventInput>) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Event title"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditFormData((prev: Partial<UpdateEventInput>) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  placeholder="Event description (optional)"
                />
              </div>

              <div>
                <Label htmlFor="edit-event_type">Type</Label>
                <Select 
                  value={editFormData.event_type || selectedEvent.event_type} 
                  onValueChange={(value: 'meeting' | 'appointment' | 'personal' | 'work' | 'other') =>
                    setEditFormData((prev: Partial<UpdateEventInput>) => ({ ...prev, event_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">👥 Meeting</SelectItem>
                    <SelectItem value="appointment">📅 Appointment</SelectItem>
                    <SelectItem value="personal">🏠 Personal</SelectItem>
                    <SelectItem value="work">💼 Work</SelectItem>
                    <SelectItem value="other">📋 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editFormData.location || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateEventInput>) => ({ 
                      ...prev, 
                      location: e.target.value || null 
                    }))
                  }
                  placeholder="Event location (optional)"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Event'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
