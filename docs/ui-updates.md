# ZapZing UI Styling Guide with DaisyUI

## Core Principles

1. Theme Adaptability
   - Use DaisyUI's semantic color names (`primary`, `secondary`, `accent`, etc.) instead of hard-coded colors
   - Avoid custom color values unless absolutely necessary
   - Test all components with light and dark themes

2. Component Consistency
   - Use standard DaisyUI component classes for common elements:
     - Buttons: `btn btn-primary`, `btn btn-ghost`, etc.
     - Cards: `card`, `card-body`
     - Inputs: `input input-bordered`
   - Maintain consistent spacing using DaisyUI's utility classes
   - Use `join` classes for grouped elements

3. Layout & Spacing
   - Use DaisyUI's responsive classes (`lg:`, `md:`, `sm:`)
   - Maintain consistent padding/margin using utility classes:
     - Container padding: `p-4` or `p-6`
     - Component spacing: `gap-4`
     - Section margins: `my-8`

4. Typography
   - Use DaisyUI's typography classes:
     - Headings: `text-2xl font-bold`
     - Body: `text-base`
     - Small text: `text-sm`
   - Maintain consistent font weights across similar elements

5. Interactive Elements
   - Always provide visual feedback:
     - Hover states: `hover:` classes
     - Active states: `active` class
     - Loading states: `loading` class
   - Use appropriate cursor styles
   - Include focus states for accessibility

6. Form Elements
   - Use consistent input sizes: `input-md` (default)
   - Always include proper form validation styles
   - Group related inputs with `form-control`
   - Use `label` class for form labels

7. Responsive Design
   - Mobile-first approach
   - Use `navbar` for desktop, `btm-nav` for mobile
   - Implement responsive layouts with `grid` or `flex`
   - Test all breakpoints

8. Accessibility
   - Maintain sufficient color contrast
   - Use semantic HTML elements
   - Include proper ARIA labels
   - Ensure keyboard navigation works

9. Error & Success States
   - Use semantic colors:
     - Success: `success`
     - Error: `error`
     - Warning: `warning`
     - Info: `info`
   - Include proper icons with states

10. Animation & Transitions
    - Use DaisyUI's built-in transitions
    - Keep animations subtle and purposeful
    - Ensure animations can be disabled for reduced motion preferences

## Implementation Examples

```jsx
// Good - Theme adaptable button
<button className="btn btn-primary">Submit</button>

// Bad - Hard-coded colors
<button className="btn" style={{backgroundColor: '#1234'}}>Submit</button>

// Good - Proper form control
<div className="form-control w-full max-w-xs">
  <label className="label">
    <span className="label-text">Email</span>
  </label>
  <input type="email" className="input input-bordered" />
</div>

// Good - Responsive card
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Title</h2>
    <p>Content</p>
  </div>
</div>
```
