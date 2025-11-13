# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features that have been added

### Changed
- Changes in existing functionality

### Deprecated
- Features that will be removed in upcoming releases

### Removed
- Features that have been removed

### Fixed
- Bug fixes

### Security
- Security vulnerability fixes

## [1.1.1] - 2025-11-13

### Changed
- Adjusted the output format of the logger and error classification to improve troubleshooting experience

### Fixed
- Fixed the issue of log noise and missing information in the message processing flow under exceptional branches

## [1.1.0] - 2024-12-19

### Added
- Enhanced hot reload functionality for better development experience
- Improved message extraction performance and reliability
- Better error handling and debugging information
- Enhanced TypeScript support with more comprehensive type definitions

### Changed
- Optimized build process for faster compilation
- Improved logging system with more detailed information
- Enhanced configuration validation and error messages

### Fixed
- Resolved potential memory leaks in long-running development sessions
- Fixed edge cases in message extraction for complex nested components
- Improved stability of hot reload functionality

## [1.0.0] - 2024-12-19

### Added
- **MAJOR RELEASE**: First stable release of vite-plugin-formatjs
- Complete TypeScript support with comprehensive type definitions
- Full FormatJS integration for message extraction and compilation
- Hot reload support for development environments
- Multi-framework support (React, Vue, TypeScript, JavaScript)
- Build-time optimization and intelligent caching
- Flexible configuration options for various use cases
- Rich logging and debug information
- Comprehensive test coverage (124 tests)
- Automated CI/CD pipeline with GitHub Actions
- OIDC authentication for secure npm publishing

### Changed
- **BREAKING**: Stable API with semantic versioning
- Enhanced performance and reliability
- Improved error handling and user experience
- Streamlined configuration options

### Fixed
- All test cases now pass consistently
- Resolved JSON formatting issues in test assertions
- Improved build stability and reliability

## [0.0.6] - 2024-01-XX

### Added
- Automatic release notes generation from CHANGELOG.md content
- OIDC authentication support for npm publishing

### Changed
- **BREAKING**: Simplified GitHub Actions workflow structure
- Improved release process with automated changelog extraction
- Enhanced CI/CD pipeline efficiency

### Fixed
- Resolved npm publishing authentication issues
- Streamlined release workflow to reduce complexity

### Removed
- Removed manual RELEASE.md file (replaced by automated workflow)
- Removed complex conditional logic from release process

## [0.0.5] - 2024-01-XX

### Added
- CHANGELOG.md file for better version tracking
- Automatic release notes generation in GitHub Actions
- OIDC authentication for npm publishing (no more NPM_TOKEN required)

### Changed
- **BREAKING**: Merged publish and release workflows into a single unified workflow
- Improved GitHub Actions workflow structure and efficiency
- Enhanced release process with automatic changelog generation
- Updated example project i18n configuration

### Fixed
- Streamlined CI/CD pipeline for better maintainability
- Optimized release workflow to reduce duplication

## [0.0.4] - 2024-01-XX

### Added
- Initial release of vite-plugin-formatjs
- Automatic message extraction from source code
- Hot reload support for development
- Multi-framework support (React, Vue, TypeScript, JavaScript)
- Build-time optimization and caching
- Flexible configuration options
- Rich logging and debug information
- Full TypeScript support with detailed type definitions 