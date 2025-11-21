# pocket-architect v1.0 Implementation Progress Tracker

**Last Updated**: 2024-12-19  
**Project Status**: Planning Complete, Implementation Not Started

---

## Overall Progress

- **Total Phases**: 7
- **Completed Phases**: 0
- **In Progress**: 0
- **Not Started**: 7
- **Completion**: 0%

---

## Phase Status

### Phase 1: Foundation (1-2 days)
**Status**: ⏳ Not Started  
**Target Deliverable**: `pocket-architect --version` works, all commands show help text

#### Tasks:
- [ ] Project init with hatch + src layout
- [ ] Typer + Rich skeleton CLI with --version, --provider global option
- [ ] Pydantic v2 settings + keyring utils
- [ ] `pocket-architect --version` works

**Notes**: 
- Architecture guide completed (2024-12-19)
- Plan created and documented

---

### Phase 2: Provider Abstraction (2-3 days)
**Status**: ⏳ Not Started  
**Target Deliverable**: `pocket-architect cvat up --provider local` works end-to-end

#### Tasks:
- [ ] Create `providers/base.py` ABC with required methods
- [ ] Implement `core/types.py` with Pydantic models
- [ ] Implement `core/session.py` for unified session handling
- [ ] Implement `core/state.py` for session persistence
- [ ] Implement Local provider fully (docker-compose + nvidia)
- [ ] Test: `pocket-architect cvat up --provider local` works end-to-end

**Dependencies**: Phase 1

---

### Phase 3: Security & Credentials (2 days)
**Status**: ⏳ Not Started  
**Target Deliverable**: First run triggers auth, refuses over-privileged credentials

#### Tasks:
- [ ] Create `utils/sso.py` for provider authentication flows
- [ ] Create `security/sandbox.py` for least-privilege role creation
- [ ] Implement AWS scoped role creation
- [ ] Implement RunPod API key validation
- [ ] Implement credential validation and refusal of over-privileged keys
- [ ] Test: First run triggers SSO/API-key flow automatically
- [ ] Test: Refuses AdministratorAccess/root keys

**Dependencies**: Phase 2

---

### Phase 4: AWS Provider (4-5 days)
**Status**: ⏳ Not Started  
**Target Deliverable**: `pocket-architect cvat up --provider aws` and `pocket-architect auto-annotate --provider aws` work

#### Tasks:
- [ ] Create `providers/aws/client.py` wrapper
- [ ] Create `providers/aws/terraform/cvat/` module (adapt existing main.tf)
- [ ] Create `providers/aws/terraform/auto_annotate/` module
- [ ] Create `providers/aws/terraform/training_node/` module
- [ ] Create `backends/terraform.py` wrapper with plan parsing
- [ ] Implement CVAT deployment with HTTPS + random password (keyring)
- [ ] Implement auto-annotation worker provisioning
- [ ] Implement training node provisioning
- [ ] Create `providers/aws/blueprints.py` with templates
- [ ] Test: `pocket-architect cvat up --provider aws` works
- [ ] Test: `pocket-architect auto-annotate --provider aws` works

**Dependencies**: Phase 3

**Notes**: 
- Existing `terraform/main.tf` can be adapted for CVAT module
- Existing Python scripts can be reference for AWS implementation

---

### Phase 5: CoreWeave + RunPod Providers (4-5 days each)
**Status**: ⏳ Not Started  
**Target Deliverable**: Both providers fully functional with all commands

#### CoreWeave Tasks:
- [ ] Create `providers/coreweave/` directory
- [ ] Implement Kubernetes client wrapper
- [ ] Create `coreweave/client.py` with pod provisioning
- [ ] Implement CVAT deployment (Kubernetes + PVC)
- [ ] Implement HTTPS via Ingress
- [ ] Implement all Provider methods
- [ ] Add cost estimation (CoreWeave pricing API)
- [ ] Test: All commands work with CoreWeave

#### RunPod Tasks:
- [ ] Create `providers/runpod/` directory
- [ ] Implement REST API client (requests)
- [ ] Create `runpod/client.py` with Secure Cloud pod templates
- [ ] Implement network volume mounts
- [ ] Implement API key authentication
- [ ] Implement all Provider methods
- [ ] Add cost estimation (RunPod pricing)
- [ ] Test: All commands work with RunPod

**Dependencies**: Phase 4

---

### Phase 6: Model Registry & Inference (3 days)
**Status**: ⏳ Not Started  
**Target Deliverable**: `pocket-architect auto-annotate <path>` works with all models

#### Tasks:
- [ ] Create `models/registry.py` with hard-coded v1.0 model list:
  - [ ] SAM 2.1 hiera-large
  - [ ] YOLO11x-seg
  - [ ] YOLO11x-obb
  - [ ] Grounding DINO 1.5 + SAM 2
  - [ ] Detectron2 Mask R-CNN
- [ ] Implement model metadata (size, download URLs, requirements)
- [ ] Implement download cache in `~/.pocket-architect/models/`
- [ ] Create `models/inference.py` with unified InferenceEngine
- [ ] Implement provider-specific inference backends:
  - [ ] Local: Docker container execution
  - [ ] AWS: ECS/Fargate tasks
  - [ ] CoreWeave: Kubernetes jobs
  - [ ] RunPod: Pod execution
- [ ] Implement `commands/auto_annotate.py`:
  - [ ] Detect input type (images/video)
  - [ ] Select model based on input
  - [ ] Provision worker if needed
  - [ ] Run inference
  - [ ] Format output (COCO, CVAT XML, etc.)
  - [ ] Show cost estimate
- [ ] Test: `pocket-architect auto-annotate <path>` works with all models

**Dependencies**: Phase 5

---

### Phase 7: Polish & Safety (3 days)
**Status**: ⏳ Not Started  
**Target Deliverable**: All commands polished and security-hardened

#### Tasks:
- [ ] Create `core/cost.py` for live pricing queries
- [ ] Integrate cost estimation into all provider operations
- [ ] Implement `commands/destroy.py`:
  - [ ] Tag-based resource discovery
  - [ ] Guaranteed cleanup (retry logic)
  - [ ] Cost verification ($0.00 check)
  - [ ] State cleanup
- [ ] Implement `commands/cvat.py`:
  - [ ] `cvat up`: Provision CVAT instance
  - [ ] `cvat sync`: Bidirectional sync using rclone
  - [ ] Show sync progress and cost
- [ ] Implement `commands/train.py`:
  - [ ] Parse YOLO/SAM/Detectron2 config
  - [ ] Provision training node
  - [ ] Launch training job
  - [ ] Stream logs
  - [ ] Cost tracking
- [ ] Implement `commands/shell.py`:
  - [ ] SSH access (all providers)
  - [ ] VSCode Remote (local, AWS via SSM)
  - [ ] JupyterLab (auto-provision)
  - [ ] Show connection instructions
- [ ] Create `security/checker.py`:
  - [ ] checkov integration (CI-enforced)
  - [ ] tfsec integration
  - [ ] Terraform plan parsing for security issues
  - [ ] Block unsafe configurations
- [ ] Implement auto-shutdown & billing alerts:
  - [ ] CloudWatch alarms (AWS)
  - [ ] Provider-specific monitoring
  - [ ] Auto-shutdown after inactivity
  - [ ] Billing alert thresholds
- [ ] Set up Sigstore signing workflow:
  - [ ] Add signing to CI/CD
  - [ ] Reproducible builds configuration
  - [ ] Release signing process
- [ ] Test: All commands show live $/hour + projected monthly cost
- [ ] Test: `pocket-architect destroy` leaves exactly $0.00 recurring charges
- [ ] Test: All infrastructure passes checkov --compact and tfsec
- [ ] Test: CVAT defaults to HTTPS + random 32-char admin password in keyring
- [ ] Test: Refuses to run with AdministratorAccess/root keys

**Dependencies**: Phase 6

---

## Milestones

### Milestone 1: Foundation Complete
**Target Date**: TBD  
**Status**: ⏳ Not Started  
**Includes**: Phase 1 complete

### Milestone 2: Local Provider Working
**Target Date**: TBD  
**Status**: ⏳ Not Started  
**Includes**: Phase 2 complete

### Milestone 3: Security Hardened
**Target Date**: TBD  
**Status**: ⏳ Not Started  
**Includes**: Phase 3 complete

### Milestone 4: AWS Provider Complete
**Target Date**: TBD  
**Status**: ⏳ Not Started  
**Includes**: Phase 4 complete

### Milestone 5: Multi-Provider Support
**Target Date**: TBD  
**Status**: ⏳ Not Started  
**Includes**: Phase 5 complete

### Milestone 6: Auto-Annotation Working
**Target Date**: TBD  
**Status**: ⏳ Not Started  
**Includes**: Phase 6 complete

### Milestone 7: v1.0 Release Ready
**Target Date**: TBD  
**Status**: ⏳ Not Started  
**Includes**: Phase 7 complete, all requirements met

---

## Requirements Checklist

### Core Commands (Exactly Six)
- [ ] `pocket-architect auto-annotate <path>` → fully automatic labeling
- [ ] `pocket-architect cvat up` → spin full CVAT instance
- [ ] `pocket-architect cvat sync` → bidirectional sync
- [ ] `pocket-architect train <config.yaml>` → launch training job
- [ ] `pocket-architect shell` → instant SSH/VSCode/JupyterLab
- [ ] `pocket-architect destroy` → guaranteed zero-cost teardown

### Supported Providers (v1.0)
- [ ] AWS (EC2 Spot + EFS) — full
- [ ] CoreWeave — full
- [ ] RunPod (Secure Cloud only) — full
- [ ] Local (Docker + NVIDIA Container Toolkit) — full

### Supported Auto-Annotation Models (v1.0)
- [ ] SAM 2.1 hiera-large
- [ ] YOLO11x-seg
- [ ] YOLO11x-obb
- [ ] Grounding DINO 1.5 + SAM 2
- [ ] Detectron2 Mask R-CNN (pretrained)

### Non-Functional Requirements
- [ ] `pip install pocket-architect` works with zero pre-installed CLIs
- [ ] First run triggers SSO/API-key flow automatically
- [ ] Cold start < 3 min to first mask (CoreWeave/RunPod target)
- [ ] Every command shows live $/hour + projected monthly cost
- [ ] `pocket-architect destroy` leaves exactly $0.00 recurring charges
- [ ] All cloud credentials are sandboxed with least privilege
- [ ] CVAT defaults to HTTPS + random 32-char admin password stored only in OS keyring
- [ ] All infrastructure passes checkov --compact and tfsec (CI-enforced)
- [ ] All releases signed with Sigstore + reproducible builds

### Security Hardening
- [ ] Automatic creation of least-privilege scoped roles/API keys per provider
- [ ] Refuse to run with AdministratorAccess / root keys
- [ ] All Terraform/CDK statically checked + runtime plan parsing
- [ ] CVAT: forced HTTPS, random credentials, keyring-only storage
- [ ] Billing alerts + auto-shutdown defaults

---

## Repository Structure Progress

### Target Structure
```
pocket-architect/
├── pocket-architect/                      # src-layout package
│   ├── __init__.py              [ ]
│   ├── __main__.py              [ ]
│   ├── cli.py                   [ ]
│   ├── config/                  [ ]
│   ├── core/                    [ ]
│   ├── providers/               [ ]
│   ├── backends/                [ ]
│   ├── commands/                [ ]
│   ├── models/                  [ ]
│   ├── utils/                   [ ]
│   └── security/               [ ]
├── tests/                        [ ]
├── terraform_modules/            [ ]
├── pyproject.toml               [ ]
├── README.md                     [ ]
└── LICENSE                       [ ]
```

**Status**: 0% complete (structure not created)

---

## Notes & Blockers

### Completed Work
- **2024-12-19**: Architecture guide created documenting current codebase
- **2024-12-19**: Implementation plan created with 7 phases

### Current Blockers
- None (implementation not started)

### Decisions Needed
- None currently

---

## Time Estimates

- **Phase 1**: 1-2 days
- **Phase 2**: 2-3 days
- **Phase 3**: 2 days
- **Phase 4**: 4-5 days
- **Phase 5**: 4-5 days each (8-10 days total, can be parallelized)
- **Phase 6**: 3 days
- **Phase 7**: 3 days

**Total Estimated Time**: 8-10 weeks for a senior agent working full-time

---

## Change Log

### 2024-12-19
- Created progress tracker
- Documented all 7 phases with task breakdowns
- Set initial status: Planning Complete, Implementation Not Started

