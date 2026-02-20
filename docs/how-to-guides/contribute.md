# Contributing Guide

## Overview

This guide explains how to contribute to the MCP ADR Analysis Server project. We welcome contributions from the community and appreciate your interest in improving this tool.

## Getting Started

### Prerequisites

- Node.js 20.0.0 or higher
- npm 9.0.0 or higher
- Git
- Basic understanding of TypeScript and MCP

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/mcp-adr-analysis-server.git
   cd mcp-adr-analysis-server
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Project**

   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## Contribution Types

### Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node.js version, etc.)

### Feature Requests

For new features, please:

- Describe the use case
- Explain the expected behavior
- Consider backward compatibility
- Discuss implementation approach

### Code Contributions

1. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**

   ```bash
   npm run test
   npm run lint
   npm run typecheck
   ```

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Testing

- Write unit tests for new functionality
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Aim for high test coverage

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update API reference for new tools
- Follow Diataxis framework for documentation

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

### Pull Request Process

1. **Create Pull Request**
   - Use descriptive title
   - Link related issues
   - Add detailed description

2. **Review Process**
   - Address reviewer feedback
   - Update PR as needed
   - Ensure all checks pass

3. **Merge**
   - Squash commits if requested
   - Delete feature branch after merge
   - Update version if needed

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
```

### Test Structure

- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `tests/fixtures/` - Test data and fixtures

## Documentation

### Documentation Structure

- `docs/` - Main documentation
- `docs/tutorials/` - Step-by-step guides
- `docs/how-to-guides/` - Task-oriented guides
- `docs/reference/` - API and technical reference
- `docs/explanation/` - Conceptual explanations

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add screenshots when helpful
- Keep documentation up to date

## Release Process

### Version Management

- Follow semantic versioning (semver)
- Update `package.json` version
- Update `CHANGELOG.md`
- Tag releases in Git

### Release Steps

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release PR
4. Tag release in Git
5. Publish to npm

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect different perspectives

### Communication

- Use GitHub Issues for discussions
- Be clear and concise
- Provide context for questions
- Help others when possible

## Getting Help

### Resources

- [README.md](https://github.com/tosin2013/mcp-adr-analysis-server/blob/main/README.md) - Project overview
- [API Reference](../../reference/api-reference.md) - Technical documentation
- [Troubleshooting Guide](./troubleshooting.md) - Common issues
- [Developer Guidance](../notes/DEVELOPER_GUIDANCE.md) - Development details

### Support

- GitHub Issues for bug reports and feature requests
- GitHub Discussions for questions and ideas
- Pull Requests for code contributions

## Recognition

Contributors are recognized in:

- `CONTRIBUTORS.md` file
- Release notes
- Project documentation
- GitHub contributors page

Thank you for contributing to the MCP ADR Analysis Server project!

## Related Documentation

- [README.md](https://github.com/tosin2013/mcp-adr-analysis-server/blob/main/README.md)
- [API Reference](../../reference/api-reference.md)
- [Developer Guidance](../notes/DEVELOPER_GUIDANCE.md)
- [Testing Guide](../TESTING_GUIDE.md)
- [Troubleshooting Guide](./troubleshooting.md)
