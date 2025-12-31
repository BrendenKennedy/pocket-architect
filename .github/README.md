# CI/CD Pipeline Documentation

## Overview

Pocket Architect uses an optimized CI/CD pipeline that leverages Tauri's built-in capabilities for efficient cross-platform builds and deployments.

## Pipeline Features

### 🚀 **Fast Feedback Loop**
- **Parallel Testing**: Frontend and backend tests run simultaneously
- **Early Failure Detection**: Tests run before builds to catch issues quickly
- **Cross-Platform Validation**: Tests run on Linux for speed, builds on all platforms

### 🔧 **Tauri-Optimized Builds**
- **Native Tauri Action**: Uses `tauri-apps/tauri-action@v0` for official support
- **Smart Caching**: Separate caches for Rust and Node.js dependencies
- **Bundle Optimization**: Configured for all target platforms (Windows, macOS, Linux)
- **Artifact Management**: Automatic upload of build artifacts

### 📦 **Release Automation**
- **Semantic Versioning**: Tag-based releases (e.g., `v1.2.3`)
- **Multi-Platform Bundles**: Creates installers for all supported platforms
- **GitHub Releases**: Automatic release creation with assets
- **Update Support**: Ready for Tauri's built-in updater

## Workflow Structure

### CI Pipeline (`ci.yml`)
```yaml
├── test-tauri (ubuntu-latest)
│   ├── Setup dependencies
│   ├── Run frontend tests + coverage
│   ├── Run Rust tests + linting
│   └── Validate formatting
│
├── build-tauri (ubuntu/win/mac matrix)
│   ├── Cross-platform builds
│   ├── Bundle creation
│   └── Artifact upload
│
└── release (ubuntu-latest, on release only)
    ├── Download all artifacts
    ├── Create release archives
    └── Upload to GitHub Releases
```

### Release Pipeline (`release.yml`)
```yaml
└── publish-tauri (ubuntu-latest, on tag push)
    ├── Full test suite
    ├── Production build
    ├── GitHub Release creation
    └── Tauri release upload
```

## Tauri-Specific Optimizations

### Configuration (`tauri.conf.json`)
- **Bundle Targets**: Optimized for all platforms
- **Security Settings**: Proper CSP and permissions
- **Window Configuration**: Responsive sizing with constraints
- **Updater Ready**: Configured for future auto-updates

### Build Scripts
- **`build-tauri.sh`**: Cross-platform optimized build script
- **`build-tauri.bat`**: Windows-specific build script
- **Feature Flags**: Support for conditional AWS SDK builds
- **Timing & Size Reports**: Build performance monitoring

## Usage

### Local Development
```bash
# Quick development build
npm run tauri dev

# Production build for current platform
npm run tauri build

# Optimized build script
./scripts/bash/build-tauri.sh release aws-sdk
```

### CI/CD Triggers
- **Push/PR**: Runs full test suite and cross-platform builds
- **Release Tag**: Creates GitHub release with all platform installers
- **Dependabot**: Weekly dependency updates with grouped PRs

## Platform-Specific Details

### Linux (Ubuntu)
- **Dependencies**: `webkit2gtk`, `appindicator3`, `librsvg2`
- **Bundles**: `.deb`, `.rpm`, `.AppImage`
- **Testing**: Primary test platform for speed

### Windows
- **Dependencies**: WebView2 (handled by Tauri)
- **Bundles**: `.msi`, `.exe`
- **Signing**: Ready for code signing certificates

### macOS
- **Dependencies**: Xcode command line tools
- **Bundles**: `.dmg`, `.pkg`
- **Notarization**: Ready for Apple notarization

## Performance Optimizations

### Caching Strategy
- **Rust Dependencies**: Cached per target architecture
- **Node.js Dependencies**: Cached per `package-lock.json`
- **Build Artifacts**: 30-day retention for debugging

### Build Matrix Optimization
- **Fail-Fast Disabled**: Allows all platforms to complete
- **Parallel Execution**: Maximum concurrency within GitHub limits
- **Conditional Builds**: Only builds changed components

### Dependency Management
- **Dependabot**: Weekly updates with smart grouping
- **Security Updates**: Priority for security patches
- **Major Version Control**: Manual approval for breaking changes

## Monitoring & Debugging

### Build Logs
- **Detailed Output**: Full command output preserved
- **Timing Information**: Build duration tracking
- **Error Reporting**: Clear failure messages with solutions

### Artifact Management
- **Retention Policy**: 30 days for build artifacts
- **Naming Convention**: `artifacts-{platform}` for easy identification
- **Download Access**: Available for all team members

## Security Considerations

### Secret Management
- **Tauri Keys**: Secure storage for code signing
- **GitHub Tokens**: Automatic token handling
- **AWS Credentials**: Optional for CI testing

### Code Signing
- **Windows**: Certificate thumbprint configuration ready
- **macOS**: Notarization setup prepared
- **Linux**: Repository signing support

## Future Enhancements

### Planned Improvements
- **Build Caching**: Advanced caching with `sccache`
- **Parallel Builds**: Multi-target simultaneous builds
- **Test Coverage**: Coverage reporting and badges
- **Performance Monitoring**: Build time tracking and optimization

### Integration Opportunities
- **Docker Builds**: Containerized build environments
- **Cloud Builds**: External CI/CD services for larger projects
- **Automated Testing**: Integration test environments
- **Deployment Automation**: Auto-deployment to app stores

## Troubleshooting

### Common Issues
- **WebKit Dependencies**: Ensure system packages are installed
- **Node.js Version**: Use Node 20 for compatibility
- **Rust Toolchain**: Ensure stable toolchain is used
- **Cache Issues**: Clear caches if builds are inconsistent

### Debug Commands
```bash
# Check Tauri installation
npm run tauri --version

# Validate configuration
npm run tauri info

# Clean build artifacts
npm run tauri build -- --no-bundle
```

## Contributing

When modifying the CI/CD pipeline:
1. Test changes on a feature branch first
2. Update this documentation
3. Ensure all platforms still build successfully
4. Consider impact on build times and costs

## Support

For CI/CD issues:
1. Check GitHub Actions logs
2. Review Tauri documentation
3. Test locally with build scripts
4. Create issue with full error logs