import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  CheckSquare, 
  Clock, 
  Trophy,
  Calendar,
  AlertCircle,
  User,
  MessageCircle
} from "lucide-react";
import ChatSystem from "@/components/chat/ChatSystem";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  department: string | null;
  points: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  points: number;
  due_date: string | null;
  assignee_id: string | null;
  created_at: string;
  profiles?: any;
}

interface EmployeeDashboardProps {
  profile: Profile;
}

export default function EmployeeDashboard({ profile }: EmployeeDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interns, setInterns] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    points: 10,
    due_date: "",
    assignee_id: ""
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch tasks created by this employee
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('created_by', profile.user_id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch all interns for task assignment
      const { data: internsData, error: internsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'intern')
        .order('full_name');

      if (internsError) throw internsError;

      setTasks(tasksData || []);
      setInterns(internsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          description: newTask.description || null,
          priority: newTask.priority,
          points: newTask.points,
          due_date: newTask.due_date || null,
          assignee_id: newTask.assignee_id || null,
          created_by: profile.user_id
        });

      if (error) throw error;

      setShowCreateTask(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        points: 10,
        due_date: "",
        assignee_id: ""
      });
      
      fetchData(); // Refresh data
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'in_progress': return 'bg-primary text-primary-foreground';
      case 'overdue': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const overdueTasks = tasks.filter(t => t.status === 'overdue').length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Employee Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage tasks and monitor intern progress
          </p>
        </div>
        
        <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Assign a new task to an intern with specific requirements and deadlines.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the task requirements..."
                  className="bg-input border-border min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min="1"
                    value={newTask.points}
                    onChange={(e) => setNewTask(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assign to Intern</Label>
                  <Select
                    value={newTask.assignee_id}
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, assignee_id: value }))}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select intern" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {interns.map((intern) => (
                        <SelectItem key={intern.user_id} value={intern.user_id}>
                          {intern.full_name || intern.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateTask(false)}>
                Cancel
              </Button>
              <Button onClick={createTask} className="bg-primary hover:bg-primary/90">
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Button
          onClick={() => setShowChat(true)}
          variant="outline"
          className="border-border hover:bg-muted"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Team Chat
        </Button>
      </div>

      {/* Chat Dialog */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Team Chat</DialogTitle>
          </DialogHeader>
          <ChatSystem currentUser={profile} />
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card border-border hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{tasks.length}</div>
            <p className="text-xs text-muted-foreground">Tasks created by you</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-border hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeTasks}</div>
            <p className="text-xs text-muted-foreground">In progress or pending</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-border hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Trophy className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-border hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{interns.length}</div>
            <p className="text-xs text-muted-foreground">Interns in team</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Overview */}
      <Card className="bg-gradient-card shadow-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Tasks Overview
          </CardTitle>
          <CardDescription>
            Monitor the progress of all tasks you've assigned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tasks created yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Create Task" to assign work to interns
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className="flex items-start justify-between p-4 border border-border rounded-lg bg-background-secondary hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{task.title}</h4>
                      <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {task.points} points
                      </div>
                      {task.profiles && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.profiles.full_name || task.profiles.email}
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}