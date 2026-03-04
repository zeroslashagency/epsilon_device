---
name: find-bugs
description: Systematic bug detection and debugging workflow. Use when investigating errors, crashes, unexpected behavior, performance issues, or when the user reports something is "not working."
---

# Find Bugs

Systematic approach to discovering and diagnosing bugs in code.

## Debugging Workflow

### 1. Gather Information

- **Error message**: Exact text, stack trace
- **Reproduction steps**: How to trigger the bug
- **Expected vs actual**: What should happen vs what happens
- **Environment**: Browser, OS, device, versions

### 2. Reproduce the Bug

Before fixing, reliably reproduce:
```
1. Start from known state
2. Follow exact steps
3. Observe behavior
4. Document conditions that trigger it
```

### 3. Isolate the Cause

**Binary search debugging**:
- Comment out half the code
- Does bug persist? Bug is in active half
- Repeat until isolated

**Trace data flow**:
```
Input → Function → Output
       ↓
     Where does it diverge?
```

### 4. Root Cause Analysis

Ask "Why?" 5 times:
1. Why did it crash? → Null reference
2. Why was it null? → Data not loaded
3. Why wasn't data loaded? → API call failed
4. Why did API fail? → Invalid token
5. Why invalid token? → **Token refresh bug** ← Root cause

## Common Bug Patterns

| Pattern | Symptoms | Fix |
|---------|----------|-----|
| Race condition | Intermittent failures | Add synchronization |
| Null reference | Crashes on access | Add null checks |
| Off-by-one | Wrong count/index | Check loop bounds |
| Memory leak | Slow degradation | Clean up references |
| Infinite loop | Hang/freeze | Check exit conditions |
| Type coercion | Wrong comparisons | Use strict equality |

## Debugging Tools

### Console Methods
```javascript
console.log(value);           // Basic output
console.table(array);         // Tabular data
console.trace();              // Stack trace
console.time('label');        // Performance timing
console.group('name');        // Group logs
```

### Breakpoint Strategy
1. Set breakpoint before error
2. Step through execution
3. Inspect variable states
4. Identify where values diverge

## Bug Report Template

```markdown
## Bug: [Title]

**Environment**: [Browser/OS/Version]
**Steps to Reproduce**:
1. ...
2. ...

**Expected**: [What should happen]
**Actual**: [What happens]
**Error Message**: [If any]
**Root Cause**: [Analysis]
**Fix**: [Solution]
```
