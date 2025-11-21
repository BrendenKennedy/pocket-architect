# mlcloud v1.0 Complete Requirements & Build Plan

**Project Name**: mlcloud  
**Description**: A zero-install, platform-agnostic Python CLI that turns any laptop into an on-demand GPU computer-vision workstation with zero vendor lock-in.

**Status**: Ready for implementation  
**Target**: Complete v1.0 specification for senior coding agent

---

## Final v1.0 Scope (Non-Negotiable Boundaries)

### Core Commands (Exactly Six)

1. `mlcloud auto-annotate <path>` → fully automatic labeling (images or video frames)
2. `mlcloud cvat up` → spin full CVAT instance with optional pre-annotation + HTTPS
3. `mlcloud cvat sync` → bidirectional sync with running CVAT
4. `mlcloud train <config.yaml>` → launch YOLO/SAM/Detectron2 training job
5. `mlcloud shell` → instant SSH or VSCode Remote / JupyterLab into the GPU node
6. `mlcloud destroy` → guaranteed zero-cost teardown

### Supported Providers (v1.0)

- **AWS (EC2 Spot + EFS)** — full
- **CoreWeave** — full
- **RunPod (Secure Cloud only)** — full
- **Local (Docker + NVIDIA Container Toolkit)** — full

### Supported Auto-Annotation Models (v1.0)

- SAM 2.1 hiera-large
- YOLO11x-seg
- YOLO11x-obb
- Grounding DINO 1.5 + SAM 2
- Detectron2 Mask R-CNN (pretrained)

### Non-Functional Requirements (Mandatory)

- `pip install mlcloud` works with zero pre-installed CLIs (AWS/GCP/Azure)
- First run triggers SSO/API-key flow automatically
- Cold start < 3 min to first mask (CoreWeave/RunPod target)
- Every command shows live $/hour + projected monthly cost
- `mlcloud destroy` leaves exactly $0.00 recurring charges
- All cloud credentials are sandboxed with least privilege
- CVAT defaults to HTTPS + random 32-char admin password stored only in OS keyring
- All infrastructure passes checkov --compact and tfsec (CI-enforced)
- All releases signed with Sigstore + reproducible builds

### Explicitly Out of Scope (v1.0)

- GCP, Azure, Vast.ai
- Web dashboard
- Multi-user orgs / team billing
- Model registry (hard-coded list only)
- Windows support
- Kubernetes backends (except CoreWeave which uses K8s internally)
- Inference serving

---

## Security Hardening (Must Be Implemented Before v1.0)

1. **Automatic creation of least-privilege scoped roles/API keys per provider**
   - AWS: Create IAM role with minimal permissions (EC2, VPC read, EFS, SSM)
   - RunPod: Validate API key permissions, refuse admin keys
   - CoreWeave: Validate API key scope

2. **Refuse to run with AdministratorAccess / root keys**
   - Check credentials before any operation
   - Show clear error message with link to documentation
   - Block execution if over-privileged credentials detected

3. **All Terraform/CDK statically checked + runtime plan parsing**
   - Run checkov --compact on all Terraform modules
   - Run tfsec on all Terraform modules
   - Parse Terraform plan output for security issues
   - Block unsafe configurations

4. **CVAT: forced HTTPS, random credentials, keyring-only storage**
   - HTTPS required (no HTTP-only option)
   - Generate random 32-character admin password
   - Store password only in OS keyring (macOS Keychain, Linux Secret Service, Windows Credential Manager)
   - Never log or display password

5. **Billing alerts + auto-shutdown defaults**
   - CloudWatch alarms for AWS (cost thresholds)
   - Provider-specific monitoring
   - Auto-shutdown after inactivity (configurable, default enabled)
   - Billing alert thresholds per provider

---

## Repository & Package Structure (Exact Skeleton)

```
mlcloud/
├── mlcloud/                      # src-layout package
│   ├── __init__.py
│   ├── __main__.py               # python -m mlcloud
│   ├── cli.py                    # Typer app (single entrypoint)
│   ├── config/                   # pydantic-settings
│   │   ├── settings.py
│   │   └── profiles.py
│   ├── core/
│   │   ├── types.py              # shared pydantic models
│   │   ├── session.py            # unified Session with provider client
│   │   ├── cost.py               # live pricing + normalisation
│   │   └── state.py              # ~/.mlcloud/sessions/
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py               # abstract Provider(ABC)
│   │   ├── aws/
│   │   │   ├── client.py
│   │   │   ├── terraform/        # embedded, version-pinned modules
│   │   │   │   ├── cvat/
│   │   │   │   ├── training_node/
│   │   │   │   └── auto_annotate/
│   │   │   └── blueprints.py
│   │   ├── coreweave/
│   │   │   └── same structure (uses kubernetes + block storage)
│   │   ├── runpod/
│   │   │   └── same structure (REST API + pod templates)
│   │   └── local/
│   │       └── docker-compose based
│   ├── backends/
│   │   └── terraform.py          # thin wrapper (subprocess + plan parsing)
│   ├── commands/
│   │   ├── auto_annotate.py
│   │   ├── cvat.py
│   │   ├── train.py
│   │   ├── shell.py
│   │   └── destroy.py
│   ├── models/
│   │   ├── registry.py           # hard-coded v1.0 model list + download cache
│   │   └── inference.py          # unified inference interface
│   ├── utils/
│   │   ├── keyring.py            # OS credential storage
│   │   ├── sso.py                # provider login flows
│   │   ├── cost_estimator.py
│   │   ├── rclone.py             # sync wrapper
│   │   └── rich_ui.py            # progress, tables, live panels
│   └── security/
│       ├── sandbox.py            # create scoped roles/keys
│       └── checker.py            # tfsec/checkov integration
├── tests/                        # pytest + terratest style
├── terraform_modules/            # shared modules (checked with checkov)
├── pyproject.toml               # hatch + dependencies
├── README.md
└── LICENSE (MIT)
```

---

## Build Order (Exact Sequence for Coding Agent)

### Phase 1 – Foundation (1–2 days)

**Tasks:**
- Project init with hatch + src layout
- Typer + Rich skeleton CLI with --version, --provider global option
- Pydantic v2 settings + keyring utils
- `mlcloud --version` works

**Deliverable**: `mlcloud --version` works, all commands show help text

---

### Phase 2 – Provider Abstraction (2–3 days)

**Tasks:**
- `providers/base.py` ABC with methods: `provision_cvat`, `provision_worker`, `sync`, `shell`, `destroy`, `cost_estimate`
- Implement local provider fully (docker-compose + nvidia)
- `mlcloud cvat up --provider local` works end-to-end

**Deliverable**: `mlcloud cvat up --provider local` works end-to-end

---

### Phase 3 – Security & Credentials (2 days)

**Tasks:**
- `utils/sso.py` + `security/sandbox.py`
- Automatic least-privilege role creation (AWS + RunPod)
- Refuse over-privileged credentials

**Deliverable**: First run triggers auth, refuses over-privileged credentials

---

### Phase 4 – AWS Provider (4–5 days)

**Tasks:**
- Full embedded Terraform modules (CVAT + auto-annotate worker)
- `mlcloud cvat up --provider aws` works
- `mlcloud auto-annotate --provider aws` works

**Deliverable**: `mlcloud cvat up --provider aws` and `mlcloud auto-annotate --provider aws` work

**Note**: Existing `terraform/main.tf` from aws-cvat-infrastructure can be adapted for CVAT module

---

### Phase 5 – CoreWeave + RunPod (4–5 days each, parallelizable)

**Tasks:**
- Identical interface, different backends
- CoreWeave: Kubernetes + block storage
- RunPod: REST API + pod templates

**Deliverable**: Both providers fully functional with all commands

---

### Phase 6 – Model Registry & Inference (3 days)

**Tasks:**
- Hard-coded model downloader + unified inference wrapper
- Implement all 5 models (SAM 2.1, YOLO11x-seg, YOLO11x-obb, Grounding DINO 1.5 + SAM 2, Detectron2)
- Provider-specific inference backends

**Deliverable**: `mlcloud auto-annotate <path>` works with all models

---

### Phase 7 – Polish & Safety (3 days)

**Tasks:**
- Cost estimation on every command
- `mlcloud destroy` with tag-based cleanup
- Auto-shutdown defaults
- Sigstore signing workflow

**Deliverable**: All commands polished and security-hardened

---

## Total Time Estimate

**8–10 weeks** for a senior agent working full-time

---

## Final Instruction to Coding Agent

Implement exactly this skeleton and scope. Do not add commands, providers, or features outside the list. Security hardening (least-privilege credentials, HTTPS, keyring passwords, tfsec enforcement) has absolute priority over all features. If something risks user funds or data, block it with a clear error message and link to documentation.

Start with Phase 1 and commit every phase end-to-end working.

**This spec is complete. Execute.**

---

## Key Implementation Notes

### Provider Interface (providers/base.py)

All providers must implement:

```python
class Provider(ABC):
    @abstractmethod
    def provision_cvat(self, enable_https: bool) -> Session:
        """Provision CVAT instance with optional HTTPS"""
        pass
    
    @abstractmethod
    def provision_worker(self, model: str) -> Worker:
        """Provision inference worker for auto-annotation"""
        pass
    
    @abstractmethod
    def sync(self, source: Path, dest: Path, direction: str) -> None:
        """Bidirectional sync with CVAT"""
        pass
    
    @abstractmethod
    def shell(self, method: str) -> None:
        """SSH/VSCode/JupyterLab access"""
        pass
    
    @abstractmethod
    def destroy(self) -> None:
        """Guaranteed zero-cost teardown"""
        pass
    
    @abstractmethod
    def cost_estimate(self) -> CostEstimate:
        """Live pricing + projected monthly cost"""
        pass
```

### Security Requirements

1. **Credential Validation**: Check before every operation
2. **Least Privilege**: Create scoped roles/keys automatically
3. **HTTPS Enforcement**: CVAT must use HTTPS (no HTTP option)
4. **Password Security**: Random 32-char, keyring-only, never logged
5. **Static Analysis**: checkov + tfsec on all Terraform
6. **Plan Parsing**: Runtime security checks on Terraform plans

### Cost Tracking

Every command must:
- Show live $/hour cost
- Show projected monthly cost
- Display before confirmation prompts
- Verify $0.00 after `destroy`

### Error Handling

- Clear error messages
- Links to documentation
- Block unsafe operations
- Never proceed with over-privileged credentials

---

## Dependencies

### Python Packages (pyproject.toml)

- `typer` - CLI framework
- `rich` - Terminal UI (progress, tables, panels)
- `pydantic` (v2) - Settings and data validation
- `pydantic-settings` - Configuration management
- `keyring` - OS credential storage
- `boto3` - AWS SDK
- `kubernetes` - CoreWeave client
- `requests` - RunPod API client
- `rclone` - File sync (via subprocess)
- `hatch` - Build system

### External Tools (Zero Install Requirement)

- Terraform (embedded or auto-installed)
- Docker (for local provider)
- NVIDIA Container Toolkit (for local provider)

---

## Testing Requirements

- Unit tests for each provider's client
- Integration tests for each command
- Security tests (checkov/tfsec) in CI
- Cost estimation accuracy tests
- Destroy command cleanup verification

---

## Release Requirements

- All releases signed with Sigstore
- Reproducible builds
- CI-enforced checkov/tfsec checks
- Zero pre-installed CLI requirement verified

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-19  
**Status**: Ready for Implementation

