---
name: react-best-practices
description: React development patterns and best practices. Use when building React components, optimizing performance, structuring applications, managing state, or ensuring React code quality.
---

# React Best Practices

Modern React patterns for maintainable, performant applications.

## Component Patterns

### Functional Components

```tsx
// ✅ Prefer functional components with hooks
interface Props {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: Props) {
  const [state, setState] = useState(initialValue);
  
  return <div onClick={onAction}>{title}</div>;
}
```

### Component Organization

```
components/
├── ui/              # Reusable UI primitives
│   ├── Button.tsx
│   └── Card.tsx
├── features/        # Feature-specific
│   └── Dashboard/
│       ├── index.tsx
│       ├── DashboardHeader.tsx
│       └── DashboardStats.tsx
└── layouts/         # Page layouts
    └── MainLayout.tsx
```

## Hooks Best Practices

### useState

```tsx
// ✅ Prefer separate states for unrelated values
const [name, setName] = useState('');
const [age, setAge] = useState(0);

// ❌ Avoid single object for unrelated state
const [state, setState] = useState({ name: '', age: 0 });
```

### useEffect

```tsx
// ✅ Single responsibility effects
useEffect(() => {
  // Only fetch data
  fetchData();
}, [id]);

useEffect(() => {
  // Only setup subscription
  const sub = subscribe();
  return () => sub.unsubscribe();
}, []);
```

### useMemo/useCallback

```tsx
// ✅ Memoize expensive computations
const sorted = useMemo(
  () => items.sort((a, b) => a.value - b.value),
  [items]
);

// ✅ Stable callback for child components
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

## Performance

### Avoid Unnecessary Rerenders

```tsx
// ✅ Split components to isolate rerenders
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <Counter count={count} setCount={setCount} />
      <ExpensiveList /> {/* Won't rerender on count change */}
    </>
  );
}
```

### Lazy Loading

```tsx
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

## State Management

| Scope | Solution |
|-------|----------|
| Local | `useState`, `useReducer` |
| Shared nearby | Lift state up |
| Cross-tree | Context API |
| Complex/Global | Zustand, Redux |
| Server state | React Query, SWR |

## Common Mistakes

- ❌ Mutating state directly
- ❌ Missing dependency array in useEffect
- ❌ Inline object/array props causing rerenders
- ❌ fetch in useEffect without cleanup
- ❌ Key prop using array index for dynamic lists
