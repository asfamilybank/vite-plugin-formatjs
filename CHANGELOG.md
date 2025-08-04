# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.5]

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

## [0.0.4]

### Added
- Initial release of vite-plugin-formatjs
- Automatic message extraction from source code
- Hot reload support for development
- Multi-framework support (React, Vue, TypeScript, JavaScript)
- Build-time optimization and caching
- Flexible configuration options
- Rich logging and debug information
- Full TypeScript support with detailed type definitions 