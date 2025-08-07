
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../../../server/src/schema';

interface TaskManagerProps {
  tasks: Task[];
  userId: number;
  onTasksUpdate: (tasks: Task[]) => void;
  onDataRefresh: () => void;
}

export function TaskManager({ tasks, userId, onTasksUpdate, onDataRefresh }: TaskManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');

  const [createFormData, setCreateFormData] = useState<CreateTaskInput>({
    user_id: userId,
    title: '',
    description: null,
    priority: 'medium',
    due_date: null,
    estimated_duration: null
  });

  const [editFormData, setEditFormData] = useState<Partial<UpdateTaskInput>>({});

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter((task: Task) => {
      switch (filter) {
        case 'pending': return task.status === 'pending';
        case 'in_progress': return task.status === 'in_progress';
        case 'completed': return task.status === 'completed';
        case 'overdue': {
          return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
        }
        default: return true;
      }
    })
    .sort((a: Task, b: Task) => {
      switch (sortBy) {
        case 'priority': {
          const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        case 'due_date':
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.createTask.mutate(createFormData);
      // Create new task for local state
      const simulatedTask: Task = {
        id: Date.now(),
        user_id: userId,
        title: createFormData.title,
        description: createFormData.description,
        status: 'pending',
        priority: createFormData.priority,
        due_date: createFormData.due_date,
        estimated_duration: createFormData.estimated_duration,
        actual_duration: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      onTasksUpdate([...tasks, simulatedTask]);
      setCreateFormData({
        user_id: userId,
        title: '',
        description: null,
        priority: 'medium',
        due_date: null,
        estimated_duration: null
      });
      setIsCreateDialogOpen(false);
      onDataRefresh();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    setIsLoading(true);
    
    try {
      const updatedTaskData: UpdateTaskInput = {
        id: selectedTask.id,
        ...editFormData
      };
      
      await trpc.updateTask.mutate(updatedTaskData);
      
      // Update local state
      const updatedTasks = tasks.map((task: Task) =>
        task.id === selectedTask.id
          ? { ...task, ...editFormData, updated_at: new Date() }
          : task
      );
      
      onTasksUpdate(updatedTasks);
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setEditFormData({});
      onDataRefresh();
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    setIsLoading(true);
    
    try {
      await trpc.deleteTask.mutate({ taskId, userId });
      
      // Update local state
      const updatedTasks = tasks.filter((task: Task) => task.id !== taskId);
      onTasksUpdate(updatedTasks);
      onDataRefresh();
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setEditFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      estimated_duration: task.estimated_duration,
      actual_duration: task.actual_duration
    });
    setIsEditDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
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

  const isOverdue = (task: Task) => {
    return task.due_date && 
           new Date(task.due_date) < new Date() && 
           task.status !== 'completed';
  };

  return (
    <div className="space-y-6">
      {/* Task Manager Header */}
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              ✅ Task Manager
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  ➕ Create Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={createFormData.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Task title"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={createFormData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCreateFormData((prev: CreateTaskInput) => ({ 
                          ...prev, 
                          description: e.target.value || null 
                        }))
                      }
                      placeholder="Task description (optional)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={createFormData.priority} 
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                        setCreateFormData((prev: CreateTaskInput) => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={createFormData.due_date ? 
                        new Date(createFormData.due_date).toISOString().slice(0, 16) : ''
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateTaskInput) => ({ 
                          ...prev, 
                          due_date: e.target.value ? new Date(e.target.value) : null 
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="estimated_duration">Estimated Duration (minutes)</Label>
                    <Input
                      id="estimated_duration"
                      type="number"
                      min="0"
                      value={createFormData.estimated_duration || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateTaskInput) => ({ 
                          ...prev, 
                          estimated_duration: e.target.value ? parseInt(e.target.value) : null 
                        }))
                      }
                      placeholder="Estimated duration"
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
                      {isLoading ? 'Creating...' : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Sort */}
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Filter by Status</Label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label>Sort by</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-600 mt-6">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-sm">Create your first task to get started!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task: Task) => (
            <Card 
              key={task.id} 
              className={`bg-white/70 backdrop-blur-sm transition-all hover:shadow-md ${
                isOverdue(task) ? 'ring-2 ring-red-200' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                      {isOverdue(task) && (
                        <Badge className="bg-red-500 text-white animate-pulse">
                          ⚠️ Overdue
                        </Badge>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600 mb-3">{task.description}</p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      
                      {task.estimated_duration && (
                        <Badge variant="outline">
                          ⏱️ {task.estimated_duration}min
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {task.due_date && (
                        <span>
                          📅 Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span>
                        Created: {task.created_at.toLocaleDateString()}
                      </span>
                      {task.actual_duration && (
                        <span className="text-green-600">
                          ✅ Completed in {task.actual_duration}min
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(task)}
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
                          <AlertDialogTitle>Delete Task</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{task.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTask(task.id)}
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

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateTaskInput>) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Task title"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditFormData((prev: Partial<UpdateTaskInput>) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  placeholder="Task description (optional)"
                />
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editFormData.status || selectedTask.status} 
                  onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'cancelled') =>
                    setEditFormData((prev: Partial<UpdateTaskInput>) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select 
                  value={editFormData.priority || selectedTask.priority} 
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                    setEditFormData((prev: Partial<UpdateTaskInput>) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-actual-duration">Actual Duration (minutes)</Label>
                <Input
                  id="edit-actual-duration"
                  type="number"
                  min="0"
                  value={editFormData.actual_duration || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateTaskInput>) => ({ 
                      ...prev, 
                      actual_duration: e.target.value ? parseInt(e.target.value) : null 
                    }))
                  }
                  placeholder="Actual time spent"
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
                  {isLoading ? 'Updating...' : 'Update Task'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
