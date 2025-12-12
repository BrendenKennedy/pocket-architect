import { useState } from 'react';
import {
  Search,
  RefreshCw,
  Filter,
  BookOpen,
  Brain,
  Database,
  Server,
  Shield,
  Zap,
  GitBranch,
  TrendingUp,
  Cloud,
  Cpu,
  HardDrive,
  Network,
  DollarSign,
  Lock,
  Activity,
  Layers,
  CheckCircle2,
  PlayCircle,
  Clock,
  Target,
  Workflow,
  Terminal,
  Box,
  FolderKanban,
  Settings,
  Award
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { LearningDetailsDialog } from './LearningDetailsDialog';
import { Progress } from './ui/progress';
import { StatusBadge } from './ui/status-badge';

// Helper function to get progress bar color based on percentage
const getProgressColor = (progress: number): string => {
  if (progress >= 75) return 'bg-status-success';
  if (progress >= 40) return 'bg-status-warning';
  return 'bg-status-error';
};

const mockLearningModules: any[] = [
  {
    id: 1,
    title: "Getting Started with Pocket Architect",
    description: "Learn the fundamentals of using Pocket Architect for ML infrastructure management",
    category: "Getting Started",
    difficulty: "Beginner",
    duration: "15 min",
    progress: 0,
    status: "not-started",
    topics: ["Projects", "Instances", "Dashboard", "Workflow"],
    icon: BookOpen
  },
  {
    id: 2,
    title: "Projects & Instance Management",
    description: "Master the unified architecture for organizing ML infrastructure",
    category: "Core Concepts",
    difficulty: "Beginner",
    duration: "20 min",
    progress: 0,
    status: "not-started",
    topics: ["Project Organization", "Instance Lifecycle", "SSH Connectivity"],
    icon: FolderKanban
  },
  {
    id: 3,
    title: "Blueprints for Rapid Provisioning",
    description: "Create and manage reusable infrastructure templates",
    category: "Infrastructure",
    difficulty: "Intermediate",
    duration: "25 min",
    progress: 0,
    status: "not-started",
    topics: ["Blueprint Creation", "Instance Types", "AMI Selection", "Storage Config"],
    icon: Workflow
  },
  {
    id: 4,
    title: "Security Groups & Network Isolation",
    description: "Configure network security for ML workloads",
    category: "Security",
    difficulty: "Intermediate",
    duration: "20 min",
    progress: 0,
    status: "not-started",
    topics: ["Security Groups", "Port Management", "Access Control", "Best Practices"],
    icon: Shield
  },
  {
    id: 5,
    title: "Multi-Region Deployments",
    description: "Deploy infrastructure across AWS regions for global ML workloads",
    category: "Advanced",
    difficulty: "Advanced",
    duration: "30 min",
    progress: 0,
    status: "not-started",
    topics: ["Region Selection", "Cross-Region Replication", "Geo-Routing", "Latency Optimization"],
    icon: Cloud
  },
  {
    id: 6,
    title: "Distributed Model Training",
    description: "Set up and manage distributed training across multiple instances",
    category: "ML Workflows",
    difficulty: "Advanced",
    duration: "35 min",
    progress: 0,
    status: "not-started",
    topics: ["Horovod", "PyTorch Distributed", "Multi-Instance Setup", "Network Optimization"],
    icon: Zap
  },
  {
    id: 7,
    title: "GPU Instance Optimization",
    description: "Maximize performance and cost-efficiency for GPU workloads",
    category: "Performance",
    difficulty: "Intermediate",
    duration: "25 min",
    progress: 0,
    status: "not-started",
    topics: ["GPU Instance Types", "CUDA Setup", "Memory Management", "Cost Optimization"],
    icon: Cpu
  },
  {
    id: 8,
    title: "Development Environment Setup",
    description: "Create productive development environments for ML engineers",
    category: "Development",
    difficulty: "Beginner",
    duration: "20 min",
    progress: 0,
    status: "not-started",
    topics: ["Jupyter Setup", "SSH Config", "Tmux Sessions", "Development Tools"],
    icon: Terminal
  },
  {
    id: 9,
    title: "Data Pipeline Management",
    description: "Handle large-scale data movement and processing for ML",
    category: "Data",
    difficulty: "Intermediate",
    duration: "30 min",
    progress: 0,
    status: "not-started",
    topics: ["S3 Integration", "Data Loading", "Preprocessing", "Storage Optimization"],
    icon: Database
  },
  {
    id: 10,
    title: "Experiment Tracking & MLOps",
    description: "Implement MLOps practices with experiment tracking and model management",
    category: "MLOps",
    difficulty: "Intermediate",
    duration: "25 min",
    progress: 0,
    status: "not-started",
    topics: ["MLflow", "Weights & Biases", "Model Registry", "Experiment Management"],
    icon: Activity
  },
  {
    id: 11,
    title: "Model Deployment & Serving",
    description: "Deploy trained models for inference at scale",
    category: "Deployment",
    difficulty: "Advanced",
    duration: "35 min",
    progress: 0,
    status: "not-started",
    topics: ["Model Optimization", "ONNX Runtime", "TensorRT", "API Serving"],
    icon: Box
  },
  {
    id: 12,
    title: "Security Best Practices for ML",
    description: "Secure your ML infrastructure and protect sensitive data",
    category: "Security",
    difficulty: "Advanced",
    duration: "30 min",
    progress: 0,
    status: "not-started",
    topics: ["Data Protection", "Access Control", "Encryption", "Compliance"],
    icon: Lock
  },
  {
    id: 13,
    title: "Cost Optimization Strategies",
    description: "Minimize cloud costs while maintaining ML workload performance",
    category: "Cost Management",
    difficulty: "Intermediate",
    duration: "25 min",
    progress: 0,
    status: "not-started",
    topics: ["Spot Instances", "Auto-Stop", "Resource Sizing", "Budget Management"],
    icon: DollarSign
  },
  {
    id: 14,
    title: "Advanced Networking & VPC Design",
    description: "Design secure, scalable network architectures for ML workloads",
    category: "Infrastructure",
    difficulty: "Advanced",
    duration: "40 min",
    progress: 0,
    status: "not-started",
    topics: ["VPC Design", "Network Security", "Multi-Region", "Performance"],
    icon: Network
  },
  {
    id: 15,
    title: "Monitoring & Observability for ML Systems",
    description: "Implement comprehensive monitoring for ML infrastructure and applications",
    category: "Operations",
    difficulty: "Intermediate",
    duration: "35 min",
    progress: 0,
    status: "not-started",
    topics: ["CloudWatch", "Custom Metrics", "Alerting", "ML Monitoring"],
    icon: Activity
  },
  {
    id: 16,
    title: "Auto Scaling & Resource Management",
    description: "Automatically adjust compute resources based on demand and cost constraints",
    category: "Infrastructure",
    difficulty: "Advanced",
    duration: "45 min",
    progress: 0,
    status: "not-started",
    topics: ["Auto Scaling Groups", "Scaling Policies", "Cost Optimization", "Performance"],
    icon: Zap
  },
  {
    id: 17,
    title: "Disaster Recovery & Backup Strategies",
    description: "Protect ML systems with comprehensive backup and recovery solutions",
    category: "Reliability",
    difficulty: "Advanced",
    duration: "40 min",
    progress: 0,
    status: "not-started",
    topics: ["Backup Strategies", "DR Architectures", "Business Continuity", "Testing"],
    icon: Shield
  },
  {
    id: 18,
    title: "Compliance & Governance for ML Systems",
    description: "Ensure regulatory compliance and implement governance frameworks",
    category: "Security",
    difficulty: "Advanced",
    duration: "50 min",
    progress: 0,
    status: "not-started",
    topics: ["Compliance Frameworks", "Governance", "Audit", "Risk Management"],
    icon: Lock
  },
  {
    id: 19,
    title: "Ethics & Responsible AI in ML Systems",
    description: "Implement ethical AI practices and responsible ML development",
    category: "Ethics",
    difficulty: "Advanced",
    duration: "45 min",
    progress: 0,
    status: "not-started",
    topics: ["Bias Detection", "Fairness", "Explainability", "Privacy"],
    icon: Brain
  },
  {
    id: 20,
    title: "Future Trends & Emerging Technologies",
    description: "Explore quantum computing, neuromorphic chips, and sustainable AI",
    category: "Innovation",
    difficulty: "Advanced",
    duration: "55 min",
    progress: 0,
    status: "not-started",
    topics: ["Quantum ML", "Neuromorphic Computing", "Sustainable AI", "Edge Computing"],
    icon: TrendingUp
  },
  {
    id: 21,
    title: "Pocket Architect Mastery & Certification",
    description: "Validate your expertise and prepare for certification exams",
    category: "Certification",
    difficulty: "Expert",
    duration: "30 min",
    progress: 0,
    status: "not-started",
    topics: ["Certification Prep", "Career Development", "Professional Skills", "Community"],
    icon: Award
  }
];

export function Learning() {
  const [modules] = useState(mockLearningModules);
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewModuleOpen, setViewModuleOpen] = useState(false);
  const [viewedModule, setViewedModule] = useState<any>(null);

  const handleSelectModule = (id: number) => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedModules.length === modules.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(modules.map(m => m.id));
    }
  };

  const handleViewModule = (module: any) => {
    setViewedModule(module);
    setViewModuleOpen(true);
  };

  const filteredModules = modules.filter((module) => {
    const matchesSearch =
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'all' || module.category === categoryFilter;

    const matchesDifficulty =
      difficultyFilter === 'all' || module.difficulty === difficultyFilter;

    const matchesStatus =
      statusFilter === 'all' || module.status === statusFilter;

    return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus;
  });

  const categories = ['all', ...Array.from(new Set(modules.map(m => m.category)))];
  const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced'];
  const statuses = ['all', 'not-started', 'in-progress', 'completed'];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'text-status-success';
      case 'intermediate':
        return 'text-status-warning';
      case 'advanced':
        return 'text-status-error';
      default:
        return 'text-text-muted';
    }
  };

  const totalProgress = Math.round(
    modules.reduce((acc, m) => acc + m.progress, 0) / modules.length
  );

  return (
    <div className="flex-1 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-primary">Learning Hub</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
            className="text-muted-foreground hover:text-primary"
        >
          <RefreshCw className="size-5" />
        </Button>
      </div>

      {/* Progress Summary */}
      <Card className="bg-card border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-text-primary mb-1">Overall Progress</h3>
            <p className="text-text-muted">
              {modules.filter(m => m.status === 'completed').length} of {modules.length} modules completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-primary mb-1">{totalProgress}%</div>
            <p className="text-text-muted">Complete</p>
          </div>
        </div>
        <Progress value={totalProgress} className="h-2" indicatorClassName={getProgressColor(totalProgress)} />
      </Card>

      {/* Action Bar */}
      <div className="flex items-center gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
          <Input
            placeholder="Search learning modules, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background-elevated border-border-muted text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {/* Filters */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-background-elevated border-border-muted text-text-primary">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[160px] bg-background-elevated border-border-muted text-text-primary">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            {difficulties.map((diff) => (
              <SelectItem key={diff} value={diff}>
                {diff === 'all' ? 'All Levels' : diff}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-background-elevated border-border-muted text-text-primary">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status === 'all' ? 'All Status' : status.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Learning Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map((module) => {
          const IconComponent = module.icon;
          return (
            <Card
              key={module.id}
              className={`bg-card border-border p-5 cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 ${
                selectedModules.includes(module.id)
                  ? 'border-primary shadow-lg shadow-primary/20'
                  : ''
              }`}
              onClick={() => handleViewModule(module)}
            >
               <div className="flex items-start justify-between mb-4">
                 <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30">
                   <IconComponent className="size-5 text-primary" />
                 </div>
                 <StatusBadge status={module.status} />
               </div>

              <h3 className="text-text-primary mb-2">{module.title}</h3>
              <p className="text-text-muted text-sm mb-4 line-clamp-2">
                {module.description}
              </p>

              <div className="flex items-center gap-3 mb-4">
                <Badge variant="secondary" className="bg-background-elevated text-text-secondary">
                  {module.category}
                </Badge>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="size-3 text-text-muted" />
                  <span className="text-text-muted">{module.duration}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`text-sm ${getDifficultyColor(module.difficulty)}`}>
                  {module.difficulty}
                </span>
                <span className="text-text-tertiary">•</span>
                <span className="text-sm text-text-muted">
                  {module.topics.length} topics
                </span>
              </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Progress</span>
                    <span className="text-text-primary">{module.progress}%</span>
                  </div>
                  <Progress value={module.progress} className="h-1.5" indicatorClassName={getProgressColor(module.progress)} />
                </div>
            </Card>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="size-12 text-border-muted mx-auto mb-3" />
          <p className="text-text-muted">No learning modules found</p>
        </div>
      )}

      {/* Learning Details Dialog */}
      <LearningDetailsDialog
        open={viewModuleOpen}
        onClose={() => setViewModuleOpen(false)}
        module={viewedModule}
      />
    </div>
  );
}