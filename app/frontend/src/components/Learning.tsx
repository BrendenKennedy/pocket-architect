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
  Settings
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
  if (progress >= 75) return 'bg-success';
  if (progress >= 40) return 'bg-warning';
  return 'bg-error';
};

const mockLearningModules = [
  {
    id: 1,
    title: 'Getting Started with Pocket Architect',
    description: 'Learn the fundamentals of managing isolated AWS environments with Pocket Architect',
    category: 'Pocket Architect',
    difficulty: 'Beginner',
    duration: '20 min',
    progress: 100,
    status: 'completed',
    icon: BookOpen,
    topics: [
      'Understanding Projects vs Instances',
      'Navigating the Dashboard',
      'Creating Your First Project',
      'Launching Compute Instances',
      'Managing Security Configurations'
    ]
  },
  {
    id: 2,
    title: 'Projects & Instance Management',
    description: 'Master the unified architecture of Projects and Instances for organized infrastructure',
    category: 'Pocket Architect',
    difficulty: 'Beginner',
    duration: '25 min',
    progress: 100,
    status: 'completed',
    icon: FolderKanban,
    topics: [
      'Project as Logical Groupings',
      'Instance Lifecycle Management',
      'SSH Connectivity Setup',
      'Multi-instance Deployments',
      'Resource Tagging Best Practices'
    ]
  },
  {
    id: 3,
    title: 'Blueprints for Rapid Provisioning',
    description: 'Use Blueprints to standardize and accelerate infrastructure deployment',
    category: 'Pocket Architect',
    difficulty: 'Intermediate',
    duration: '30 min',
    progress: 75,
    status: 'in-progress',
    icon: Box,
    topics: [
      'Built-in vs Custom Blueprints',
      'Creating ML Training Blueprints',
      'GPU Instance Blueprints',
      'Development Environment Templates',
      'Blueprint Versioning Strategy'
    ]
  },
  {
    id: 4,
    title: 'Security Groups & Network Isolation',
    description: 'Configure secure network boundaries for your ML workloads',
    category: 'Pocket Architect',
    difficulty: 'Intermediate',
    duration: '35 min',
    progress: 60,
    status: 'in-progress',
    icon: Shield,
    topics: [
      'Understanding Security Configurations',
      'SSH Access Rules',
      'Port Management for Services',
      'VPC Isolation Patterns',
      'Custom Security Groups'
    ]
  },
  {
    id: 5,
    title: 'Multi-Region Deployment Strategies',
    description: 'Leverage Pocket Architect\'s multi-platform region support for global infrastructure',
    category: 'Pocket Architect',
    difficulty: 'Advanced',
    duration: '40 min',
    progress: 0,
    status: 'not-started',
    icon: Cloud,
    topics: [
      'AWS Region Selection',
      'GCP and Azure Integration',
      'Cross-Region Data Transfer',
      'Latency Optimization',
      'Disaster Recovery Setup'
    ]
  },
  {
    id: 6,
    title: 'Distributed Model Training',
    description: 'Best practices for scaling ML training across multiple GPUs and nodes',
    category: 'ML Workflows',
    difficulty: 'Advanced',
    duration: '45 min',
    progress: 100,
    status: 'completed',
    icon: Brain,
    topics: [
      'Data Parallelism vs Model Parallelism',
      'Gradient Accumulation Strategies',
      'Multi-node Training Setup',
      'Communication Optimization',
      'Fault Tolerance & Checkpointing'
    ]
  },
  {
    id: 7,
    title: 'GPU Instance Optimization',
    description: 'Selecting and configuring the right GPU instances for your ML workloads',
    category: 'Infrastructure',
    difficulty: 'Intermediate',
    duration: '30 min',
    progress: 100,
    status: 'completed',
    icon: Cpu,
    topics: [
      'P vs G vs Inf instance types',
      'GPU memory management',
      'Multi-GPU utilization',
      'Spot instances for training',
      'Cost vs performance trade-offs'
    ]
  },
  {
    id: 8,
    title: 'Headless Model Training',
    description: 'Setting up automated training pipelines without GUI dependencies',
    category: 'ML Workflows',
    difficulty: 'Intermediate',
    duration: '40 min',
    progress: 65,
    status: 'in-progress',
    icon: Terminal,
    topics: [
      'SSH-based remote training',
      'Tmux/Screen for persistent sessions',
      'Automated experiment logging',
      'Remote monitoring with TensorBoard',
      'Docker containers for reproducibility'
    ]
  },
  {
    id: 9,
    title: 'ML Data Pipeline Architecture',
    description: 'Designing efficient data ingestion and preprocessing pipelines',
    category: 'ML Workflows',
    difficulty: 'Advanced',
    duration: '50 min',
    progress: 40,
    status: 'in-progress',
    icon: Database,
    topics: [
      'S3 data lake organization',
      'Streaming vs batch processing',
      'Data versioning with DVC',
      'Feature stores (SageMaker, Feast)',
      'ETL optimization for ML'
    ]
  },
  {
    id: 10,
    title: 'Model Versioning & Experiment Tracking',
    description: 'Managing ML experiments, models, and artifacts at scale',
    category: 'MLOps',
    difficulty: 'Intermediate',
    duration: '35 min',
    progress: 0,
    status: 'not-started',
    icon: GitBranch,
    topics: [
      'MLflow for experiment tracking',
      'Weights & Biases integration',
      'Model registry best practices',
      'Artifact storage strategies',
      'Reproducible experiments'
    ]
  },
  {
    id: 11,
    title: 'Inference Optimization & Deployment',
    description: 'Deploying models for low-latency, high-throughput inference',
    category: 'ML Workflows',
    difficulty: 'Advanced',
    duration: '55 min',
    progress: 0,
    status: 'not-started',
    icon: Zap,
    topics: [
      'Model quantization & pruning',
      'ONNX Runtime optimization',
      'TensorRT for GPU inference',
      'Batch inference strategies',
      'Auto-scaling inference endpoints'
    ]
  },
  {
    id: 12,
    title: 'ML Security Best Practices',
    description: 'Securing ML workloads, data, and model artifacts',
    category: 'Security',
    difficulty: 'Intermediate',
    duration: '40 min',
    progress: 100,
    status: 'completed',
    icon: Shield,
    topics: [
      'IAM roles for ML services',
      'VPC isolation for training',
      'Encryption at rest and in transit',
      'Model poisoning prevention',
      'Secure credential management'
    ]
  },
  {
    id: 13,
    title: 'Cost Optimization for ML Workloads',
    description: 'Strategies to reduce cloud costs without sacrificing performance',
    category: 'Cost Optimization',
    difficulty: 'Intermediate',
    duration: '30 min',
    progress: 80,
    status: 'in-progress',
    icon: DollarSign,
    topics: [
      'Spot instances for training',
      'Reserved instances for inference',
      'Auto-shutdown idle instances',
      'Storage tiering (S3 lifecycle)',
      'Right-sizing compute resources'
    ]
  },
  {
    id: 14,
    title: 'Multi-Cloud ML Strategy',
    description: 'Leveraging AWS, GCP, and Azure for ML workloads',
    category: 'Infrastructure',
    difficulty: 'Advanced',
    duration: '45 min',
    progress: 0,
    status: 'not-started',
    icon: Cloud,
    topics: [
      'SageMaker vs Vertex AI vs Azure ML',
      'Cross-cloud data transfer',
      'Provider-specific GPU offerings',
      'Multi-cloud orchestration',
      'Cost comparison strategies'
    ]
  },
  {
    id: 15,
    title: 'High Availability for ML Systems',
    description: 'Building resilient and redundant ML infrastructure',
    category: 'Infrastructure',
    difficulty: 'Advanced',
    duration: '40 min',
    progress: 0,
    status: 'not-started',
    icon: Activity,
    topics: [
      'Multi-region deployment',
      'Load balancing for inference',
      'Model serving redundancy',
      'Disaster recovery planning',
      'Health checks & monitoring'
    ]
  },
  {
    id: 16,
    title: 'Hyperparameter Tuning at Scale',
    description: 'Efficient strategies for hyperparameter optimization',
    category: 'ML Workflows',
    difficulty: 'Advanced',
    duration: '50 min',
    progress: 0,
    status: 'not-started',
    icon: Target,
    topics: [
      'Bayesian optimization vs Grid search',
      'Parallel trial execution',
      'Early stopping strategies',
      'Ray Tune and Optuna',
      'SageMaker Automatic Model Tuning'
    ]
  },
  {
    id: 17,
    title: 'MLOps Pipeline Automation',
    description: 'CI/CD for machine learning workflows',
    category: 'MLOps',
    difficulty: 'Advanced',
    duration: '60 min',
    progress: 20,
    status: 'in-progress',
    icon: Workflow,
    topics: [
      'Automated model training pipelines',
      'Testing ML code and models',
      'Continuous deployment strategies',
      'Monitoring model drift',
      'Rollback procedures'
    ]
  },
  {
    id: 18,
    title: 'Deep Learning Framework Selection',
    description: 'Choosing the right framework for your ML project',
    category: 'ML Workflows',
    difficulty: 'Beginner',
    duration: '25 min',
    progress: 100,
    status: 'completed',
    icon: Layers,
    topics: [
      'PyTorch vs TensorFlow comparison',
      'JAX for research',
      'ONNX for framework interop',
      'Framework-specific optimizations',
      'Community and ecosystem'
    ]
  },
  {
    id: 19,
    title: 'Large-Scale Data Storage for ML',
    description: 'Organizing and managing petabyte-scale ML datasets',
    category: 'Infrastructure',
    difficulty: 'Advanced',
    duration: '45 min',
    progress: 0,
    status: 'not-started',
    icon: HardDrive,
    topics: [
      'S3 vs EFS vs EBS for ML data',
      'Data lake architecture',
      'Parquet and optimized formats',
      'Data partitioning strategies',
      'Cold storage and archival'
    ]
  },
  {
    id: 20,
    title: 'Real-Time ML Inference',
    description: 'Building low-latency prediction systems',
    category: 'ML Workflows',
    difficulty: 'Advanced',
    duration: '50 min',
    progress: 0,
    status: 'not-started',
    icon: Zap,
    topics: [
      'Model serving architectures',
      'Caching strategies',
      'API design for inference',
      'WebSocket for streaming',
      'Edge deployment considerations'
    ]
  },
  {
    id: 21,
    title: 'Network Configuration for ML',
    description: 'Optimizing network for distributed training and inference',
    category: 'Infrastructure',
    difficulty: 'Intermediate',
    duration: '35 min',
    progress: 0,
    status: 'not-started',
    icon: Network,
    topics: [
      'VPC design for ML workloads',
      'Inter-node communication',
      'Bandwidth requirements',
      'Elastic Fabric Adapter (EFA)',
      'VPN and secure remote access'
    ]
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
        return 'text-success';
      case 'intermediate':
        return 'text-warning';
      case 'advanced':
        return 'text-error';
      default:
        return 'text-muted-foreground';
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
          <BookOpen className="size-8 text-primary" />
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
              className={`bg-card border-border p-5 cursor-pointer transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 ${
                selectedModules.includes(module.id)
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                  : ''
              }`}
              onClick={() => handleViewModule(module)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
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

              {module.progress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Progress</span>
                    <span className="text-primary">{module.progress}%</span>
                  </div>
                  <Progress value={module.progress} className="h-1.5" indicatorClassName={getProgressColor(module.progress)} />
                </div>
              )}
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