
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { trpc } from '@/utils/trpc';
import type { Task, PomodoroSession } from '../../../server/src/schema';

interface PomodoroTimerProps {
  tasks: Task[];
  userId: number;
  activePomodoroSession: PomodoroSession | null;
  onSessionUpdate: (session: PomodoroSession | null) => void;
}

type TimerState = 'idle' | 'focus' | 'break' | 'paused';

export function PomodoroTimer({ tasks, userId, activePomodoroSession, onSessionUpdate }: PomodoroTimerProps) {
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [remainingTime, setRemainingTime] = useState(25 * 60); // 25 minutes in seconds
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState(25);
  const [customBreakDuration, setCustomBreakDuration] = useState(5);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isCustomSessionDialogOpen, setIsCustomSessionDialogOpen] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (timerState === 'focus' || timerState === 'break') {
      interval = setInterval(() => {
        setRemainingTime((prev: number) => {
          if (prev <= 1) {
            // Timer finished
            if (timerState === 'focus') {
              setIsBreakTime(true);
              setTimerState('break');
              setRemainingTime(customBreakDuration * 60);
              playNotificationSound();
            } else {
              // Break finished
              setIsBreakTime(false);
              setTimerState('idle');
              setCompletedSessions(prev => prev + 1);
              playNotificationSound();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState, customBreakDuration]);

  const playNotificationSound = () => {
    // Create a simple beep sound
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const startPomodoroSession = async (duration?: number, breakDuration?: number) => {
    const sessionDuration = duration || customDuration;
    const sessionBreakDuration = breakDuration || customBreakDuration;
    
    try {
      // Create session via API
      await trpc.createPomodoroSession.mutate({
        user_id: userId,
        task_id: selectedTaskId,
        duration: sessionDuration,
        break_duration: sessionBreakDuration
      });

      // Create local session state
      const simulatedSession: PomodoroSession = {
        id: Date.now(),
        user_id: userId,
        task_id: selectedTaskId,
        duration: sessionDuration,
        break_duration: sessionBreakDuration,
        status: 'running',
        started_at: new Date(),
        completed_at: null,
        created_at: new Date()
      };

      onSessionUpdate(simulatedSession);
      setTimerState('focus');
      setRemainingTime(sessionDuration * 60);
      setIsBreakTime(false);
    } catch (error) {
      console.error('Failed to start Pomodoro session:', error);
    }
  };

  const pauseSession = () => {
    setTimerState('paused');
  };

  const resumeSession = () => {
    setTimerState(isBreakTime ? 'break' : 'focus');
  };

  const stopSession = async () => {
    if (activePomodoroSession) {
      try {
        await trpc.updatePomodoroSession.mutate({
          id: activePomodoroSession.id,
          status: 'cancelled'
        });
      } catch (error) {
        console.error('Failed to update session:', error);
      }
    }
    
    setTimerState('idle');
    setRemainingTime(customDuration * 60);
    setIsBreakTime(false);
    onSessionUpdate(null);
  };

  const completeSession = async () => {
    if (activePomodoroSession) {
      try {
        await trpc.updatePomodoroSession.mutate({
          id: activePomodoroSession.id,
          status: 'completed',
          completed_at: new Date()
        });
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
    }
    
    setTimerState('idle');
    setCompletedSessions(prev => prev + 1);
    onSessionUpdate(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalTime = isBreakTime ? customBreakDuration * 60 : customDuration * 60;
    return ((totalTime - remainingTime) / totalTime) * 100;
  };

  const getSelectedTask = () => {
    return tasks.find((task: Task) => task.id === selectedTaskId);
  };

  const presetSessions = [
    { name: 'Classic Pomodoro', focus: 25, break: 5, icon: '🍅' },
    { name: 'Extended Focus', focus: 45, break: 10, icon: '🎯' },
    { name: 'Quick Sprint', focus: 15, break: 3, icon: '⚡' },
    { name: 'Deep Work', focus: 60, break: 15, icon: '🧠' }
  ];

  return (
    <div className="space-y-6">
      {/* Pomodoro Timer Header */}
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🍅 Pomodoro Focus Timer
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Timer */}
        <div className="col-span-8">
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              {/* Timer Display */}
              <div className="mb-8">
                <div className={`text-8xl font-mono font-bold mb-4 ${
                  isBreakTime ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatTime(remainingTime)}
                </div>
                
                <Progress 
                  value={getProgress()} 
                  className={`h-4 mb-4 ${
                    isBreakTime ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'
                  }`}
                />

                <div className="flex items-center justify-center gap-2 mb-6">
                  <Badge 
                    className={`text-lg px-4 py-2 ${
                      isBreakTime 
                        ? 'bg-green-100 text-green-800' 
                        : timerState === 'focus' 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {isBreakTime 
                      ? '☕ Break Time' 
                      : timerState === 'focus' 
                        ? '🎯 Focus Time'
                        : '⏸️ Ready to Focus'
                    }
                  </Badge>
                  
                  {selectedTaskId && (
                    <Badge variant="outline" className="text-sm">
                      Working on: {getSelectedTask()?.title}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-4">
                {timerState === 'idle' && (
                  <>
                    <Button
                      onClick={() => startPomodoroSession()}
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-lg px-8 py-4"
                    >
                      ▶️ Start Focus Session
                    </Button>
                    
                    <Dialog open={isCustomSessionDialogOpen} onOpenChange={setIsCustomSessionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="lg">
                          ⚙️ Custom Session
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Custom Session</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="custom-focus">Focus Duration (minutes)</Label>
                            <Input
                              id="custom-focus"
                              type="number"
                              min="1"
                              max="120"
                              value={customDuration}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                setCustomDuration(parseInt(e.target.value) || 25)
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="custom-break">Break Duration (minutes)</Label>
                            <Input
                              id="custom-break"
                              type="number"
                              min="1"
                              max="30"
                              value={customBreakDuration}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                setCustomBreakDuration(parseInt(e.target.value) || 5)
                              }
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsCustomSessionDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => {
                                startPomodoroSession(customDuration, customBreakDuration);
                                setIsCustomSessionDialogOpen(false);
                              }}
                            >
                              Start Custom Session
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}

                {timerState === 'focus' && (
                  <>
                    <Button onClick={pauseSession} size="lg" variant="outline">
                      ⏸️ Pause
                    </Button>
                    <Button onClick={stopSession} size="lg" variant="destructive">
                      ⏹️ Stop
                    </Button>
                  </>
                )}

                {timerState === 'break' && (
                  <>
                    <Button onClick={pauseSession} size="lg" variant="outline">
                      ⏸️ Pause
                    </Button>
                    <Button onClick={completeSession} size="lg" className="bg-green-600 hover:bg-green-700">
                      ✅ Complete Session
                    </Button>
                  </>
                )}

                {timerState === 'paused' && (
                  <>
                    <Button onClick={resumeSession} size="lg" className="bg-blue-600 hover:bg-blue-700">
                      ▶️ Resume
                    </Button>
                    <Button onClick={stopSession} size="lg" variant="destructive">
                      ⏹️ Stop
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 space-y-4">
          {/* Session Stats */}
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Today's Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed Sessions</span>
                <Badge className="bg-green-100 text-green-800">
                  {completedSessions} 🍅
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Focus Time</span>
                <span className="text-sm font-medium">
                  {Math.round(completedSessions * customDuration)} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Streak</span>
                <span className="text-sm font-medium">🔥 {completedSessions}</span>
              </div>
            </CardContent>
          </Card>

          {/* Task Selection */}
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Focus Task</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedTaskId?.toString() || 'none'} 
                onValueChange={(value: string) => setSelectedTaskId(value === 'none' ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a task to focus on" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific task</SelectItem>
                  {tasks.filter((task: Task) => task.status !== 'completed').map((task: Task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        {task.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Preset Sessions */}
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {presetSessions.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => startPomodoroSession(preset.focus, preset.break)}
                  disabled={timerState !== 'idle'}
                >
                  <span className="mr-2">{preset.icon}</span>
                  <span className="flex-1 text-left">{preset.name}</span>
                  <span className="text-xs text-gray-500">
                    {preset.focus}/{preset.break}min
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">💡 Focus Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Remove distractions from your workspace</li>
                <li>• Set clear goals for each session</li>
                <li>• Take breaks to maintain focus</li>
                <li>• Stay hydrated and comfortable</li>
                <li>• Review your progress regularly</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
