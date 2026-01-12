# Register.tsx Refactoring Plan

## Current State
- Single file: `app/register.tsx` (1361 lines)
- Contains: schemas, constants, state, forms, rendering, styles

## Target Structure

### Files Created
1. ✅ `lib/validation/registerSchemas.ts` - Validation schemas
2. ✅ `constants/kenyanTowns.ts` - Kenyan towns constant
3. ⏳ `components/register/styles.ts` - Shared styles
4. ⏳ `components/register/PersonalInfoStep.tsx` - Step 1 component
5. ⏳ `components/register/ContactInfoStep.tsx` - Step 2 component
6. ⏳ `components/register/TownPickerModal.tsx` - Town picker modal
7. ⏳ `app/register.tsx` - Refactored main file (orchestrator only)

## Component Responsibilities

### PersonalInfoStep.tsx
- Renders Step 1 form (name, email, password, confirmPassword)
- Accepts form control, showPassword state handlers
- Returns JSX for Step 1

### ContactInfoStep.tsx
- Renders Step 2 form (airtelPhone, safaricomPhone, town, area)
- Accepts form control, town picker modal handlers
- Returns JSX for Step 2

### TownPickerModal.tsx
- Renders town picker modal
- Handles search, selection
- Accepts visible, onClose, selectedTown, onSelectTown

### register.tsx (Main)
- Orchestrates the flow
- Manages state (step, forms, modal visibility)
- Handles form submissions
- Renders header, navigation buttons
- Conditionally renders step components

## Benefits
- ✅ Better code organization
- ✅ Easier to test individual components
- ✅ Easier to maintain
- ✅ Reusable components
- ✅ Smaller, focused files

