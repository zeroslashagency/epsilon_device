---
name: code-review
description: Comprehensive code review workflow for quality assurance. Use when reviewing pull requests, auditing code quality, checking for security issues, ensuring best practices, or validating implementation correctness.
---

# Code Review

Systematic code review for quality, security, and maintainability.

## Review Checklist

### 1. Correctness
- [ ] Logic implements requirements correctly
- [ ] Edge cases handled
- [ ] Error handling present
- [ ] No obvious bugs

### 2. Security
- [ ] Input validation
- [ ] No hardcoded secrets
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Auth/authz checks

### 3. Performance
- [ ] No N+1 queries
- [ ] Efficient algorithms
- [ ] Appropriate caching
- [ ] No memory leaks

### 4. Maintainability
- [ ] Clear naming
- [ ] Single responsibility
- [ ] DRY (no duplication)
- [ ] Comments for complex logic

### 5. Testing
- [ ] Unit tests present
- [ ] Edge cases tested
- [ ] Tests are meaningful

## Review Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| 🔴 **Critical** | Security vulnerability, data loss | Must fix before merge |
| 🟠 **Major** | Bug, poor performance | Should fix before merge |
| 🟡 **Minor** | Code style, naming | Fix if time permits |
| 🔵 **Suggestion** | Alternative approach | Consider for future |

## Feedback Format

```markdown
### [file.ts:42] 🔴 Critical: SQL Injection

**Issue**: User input directly interpolated into query
**Current**:
```sql
SELECT * FROM users WHERE id = ${userId}
```
**Suggested**:
```sql
SELECT * FROM users WHERE id = $1  -- parameterized
```
**Why**: Prevents SQL injection attacks
```

## Anti-Patterns to Flag

- **God classes**: Classes doing too much
- **Long methods**: Functions > 50 lines
- **Deep nesting**: >3 levels of indentation
- **Magic numbers**: Unexplained numeric literals
- **Dead code**: Unreachable or unused code
- **Copy-paste**: Duplicated logic

## Positive Feedback

Also note well-written code:
- ✅ Excellent error handling
- ✅ Clear documentation
- ✅ Good test coverage
- ✅ Elegant solution

## Review Summary Template

```markdown
## Review Summary

**Files Reviewed**: X
**Issues Found**: X critical, X major, X minor

### Critical Issues
- [file:line] Description

### Major Issues
- [file:line] Description

### Highlights
- Good patterns observed

### Recommendation
[ ] Approve
[ ] Request Changes
[ ] Needs Discussion
```
