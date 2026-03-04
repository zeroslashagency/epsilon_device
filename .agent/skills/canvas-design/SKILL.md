---
name: canvas-design
description: Guide for creating visual designs using HTML5 Canvas or design tools. Use when building interactive graphics, data visualizations, charts, diagrams, animations, or any canvas-based drawing operations.
---

# Canvas Design

Create interactive graphics, visualizations, and canvas-based designs.

## Canvas Fundamentals

### Basic Setup

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size (account for DPI)
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;
canvas.height = height * dpr;
ctx.scale(dpr, dpr);
```

## Drawing Primitives

### Shapes

```javascript
// Rectangle
ctx.fillStyle = '#3b82f6';
ctx.fillRect(x, y, width, height);

// Circle
ctx.beginPath();
ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
ctx.fill();

// Line
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.strokeStyle = '#000';
ctx.lineWidth = 2;
ctx.stroke();
```

### Text

```javascript
ctx.font = '16px Inter, sans-serif';
ctx.fillStyle = '#1f2937';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Label', x, y);
```

## Data Visualization Patterns

### Bar Chart

```javascript
function drawBarChart(data, colors) {
  const barWidth = width / data.length - gap;
  data.forEach((value, i) => {
    const barHeight = (value / maxValue) * chartHeight;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(
      i * (barWidth + gap),
      chartHeight - barHeight,
      barWidth,
      barHeight
    );
  });
}
```

### Line Chart

```javascript
function drawLineChart(points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.stroke();
}
```

## Animation

```javascript
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Update state
  // Draw frame
  requestAnimationFrame(animate);
}
animate();
```

## Best Practices

- Always clear canvas before redrawing
- Use `requestAnimationFrame` for smooth animations
- Account for device pixel ratio for sharp rendering
- Cache complex drawings with offscreen canvas
- Use transforms (`translate`, `rotate`, `scale`) for positioning
