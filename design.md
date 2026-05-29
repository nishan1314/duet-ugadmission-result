# DUET Check Result Page - Design Summary

## Overview
A clean, professional result-checking page for Dhaka University of Engineering & Technology (DUET), Gazipur, featuring an interactive animated student illustration that responds to user actions.

## Layout
- **Split-screen design**: Form on left, animated illustration on right
- **Responsive**: Right panel hidden on mobile (lg breakpoint)
- **Centered form**: Maximum width of 448px for optimal readability

## Color Theme
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#006a4e` | Buttons, accents, links (Bangladesh green) |
| Accent | `#c53030` | Secondary highlights (Bangladesh red) |
| Background | `#f0f4f8` | Page background |
| Foreground | `#1a365d` | Primary text |
| Muted | `#4a5568` | Secondary text |
| Card | `#ffffff` | Card backgrounds |
| Border | `#cbd5e0` | Input borders |

## Typography
- **Font Family**: Nunito (Google Fonts)
- **Heading**: 2xl (24px), bold
- **Body**: base (16px)
- **Small text**: sm (14px), xs (12px)

## Components

### Left Side - Form Panel
1. **Logo Section**
   - DUET official logo (56x56px)
   - University name and subtitle
   - Fallback: Circular badge with "D" if image fails

2. **Check Result Card**
   - Subtle green shadow for brand consistency
   - Single input field: Applicant ID
   - Search icon prefix
   - Full-width "Check" button with loading state

3. **Footer**
   - Copyright text, muted styling

### Right Side - Animated Student Illustration
Interactive SVG animation of a student at a computer desk with 4 states:

| State | Trigger | Animation |
|-------|---------|-----------|
| **Idle** | No input | Student sitting, neutral expression, screen shows "Enter your ID" |
| **Typing** | User types in input | Student typing, fingers animate, screen shows blinking cursor with dots |
| **Loading** | Click "Check" button | Student anxious (worried eyes/eyebrows), screen shows circular progress |
| **Success** | Result found | Student happy with closed eyes, tears of joy dropping, screen shows checkmark |

#### Animation Details
- **Typing state**: Fingers bounce on keyboard, dots appear sequentially, cursor blinks
- **Loading state**: Eyes animate up/down (anxious), progress circle fills, percentage shown
- **Success state**: Happy curved eyes, animated tear drops falling from both eyes
- **Smooth transitions**: React state-driven animation updates

## Assets
| File | Location | Description |
|------|----------|-------------|
| duet-logo.png | `/public/images/` | Official DUET logo |
| animated-student.tsx | `/components/` | Interactive SVG student animation |

## Accessibility
- Proper form labels
- Focus-visible ring states
- ARIA labels on SVG for animation state description
- Semantic HTML structure
- Loading state feedback
- Screen reader announces animation state changes

## Interactions
1. **Idle**: Page loads with student in neutral pose
2. **User types ID**: Animation switches to typing state with finger movements
3. **User clears input**: Animation returns to idle state
4. **User clicks "Check"**: 
   - Button shows spinner
   - Animation switches to loading with anxious expression
   - Progress circle animates
5. **Result found (after 2.5s)**:
   - Animation switches to success
   - Student shows happy tears
   - Screen displays checkmark

## Technical Implementation
- Pure SVG animations (no external libraries)
- React state-driven animation switching
- CSS keyframe animations via SVG animate elements
- Efficient re-renders using useCallback
- TypeScript type safety for animation states
