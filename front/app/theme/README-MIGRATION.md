# Theme System Migration Guide

## 🎯 **Goal: Consolidate to Single Theme System**

### **Current State (❌ Problematic)**
- ❌ **Two theme systems**: `/theme/constants.js` AND `/theme/chakra-theme.js`
- ❌ **Duplicated colors** across multiple components 
- ❌ **Inconsistent usage**: Some components use old system, others use new
- ❌ **Performance impact**: Multiple `useColorModeValue` calls in components

### **Target State (✅ Clean)**
- ✅ **Single source of truth**: Consolidated theme system
- ✅ **DRY principle**: No color duplication across components
- ✅ **Consistent API**: All components use `useGhibliTheme` hook
- ✅ **Performance optimized**: Centralized theme calculations

## 🔄 **Migration Steps**

### **Phase 1: Consolidate Theme (Priority: High)**
1. ✅ Create `useGhibliTheme` hook (DONE)
2. 🔄 Update `chakra-theme.js` to import from consolidated constants
3. 🔄 Deprecate old `/theme/constants.js` gradually
4. 🔄 Create migration utility for automated refactoring

### **Phase 2: Component Refactoring (Priority: Medium)**
1. 🔄 Replace `useColorModeValue` calls with `useGhibliTheme`
2. 🔄 Extract reusable patterns to theme hook
3. 🔄 Update existing components one by one
4. 🔄 Add TypeScript interfaces for better DX

### **Phase 3: Optimization (Priority: Low)**
1. 🔄 Add theme performance monitoring
2. 🔄 Implement theme preloading
3. 🔄 Add theme testing utilities

## 📝 **Component Migration Examples**

### **Before (❌ Repetitive)**
```tsx
// In every component file...
const cardBg = useColorModeValue('white', 'ghibliGray.800');
const borderColor = useColorModeValue('gray.200', 'ghibliGray.600');
const textSecondary = useColorModeValue('gray.500', 'ghibliGray.300');
```

### **After (✅ Clean)**
```tsx
// Single import, consistent usage
const { colors, patterns } = useGhibliTheme();

// Use semantic names
<Box {...patterns.card} color={colors.text.secondary} />
```

## 🧪 **Testing Strategy**
- Visual regression tests for theme consistency
- Performance benchmarks for theme rendering
- Accessibility audits for color contrast ratios

## 📊 **Success Metrics**
- **Code reduction**: 50% less theme-related code duplication
- **Performance**: 20% faster theme switching
- **Consistency**: 100% of components use unified theme system
- **DX**: Single API for all theme operations

## 🚀 **Implementation Priority**

1. **Critical Components** (Phase 1)
   - Navigation
   - Pricing components
   - Payment selectors

2. **Secondary Components** (Phase 2)  
   - Modal dialogs
   - Form components
   - Card layouts

3. **Minor Components** (Phase 3)
   - Icons
   - Badges
   - Utility components
