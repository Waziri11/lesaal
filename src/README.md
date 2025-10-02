# Lesaal Marketing - Project Structure

This document outlines the refactored project structure following React and JavaScript best practices.

## 📁 Folder Structure

```
src/
├── components/           # Reusable UI components
│   ├── index.js         # Component exports
│   ├── ServiceCard.js   # Service card component
│   ├── ServiceModal.js  # Full-screen modal component
│   └── TestimonialCard.js # Testimonial display component
├── data/                # Static data and constants
│   └── servicesData.js  # Service information and testimonials
├── hooks/               # Custom React hooks
│   ├── index.js         # Hook exports
│   └── useModal.js      # Modal state management hook
├── styles/              # CSS and styling files
│   ├── App.css          # Main application styles
│   └── ServicesPage.css # Services page specific styles
├── App.js               # Main application component
├── ServicesPage.js      # Services page component
├── ThemeContext.js      # Theme management context
└── index.js             # Application entry point
```

## 🧩 Components

### ServiceCard
- **Purpose**: Displays service information in grid layout
- **Props**: `service` (object), `onClick` (function)
- **Features**: Clickable card with service details

### ServiceModal
- **Purpose**: Full-screen modal for detailed service view
- **Props**: `service` (object), `isOpen` (boolean), `onClose` (function)
- **Features**: Image display, features list, testimonials

### TestimonialCard
- **Purpose**: Displays individual client testimonials
- **Props**: `name`, `company`, `role`, `image`, `quote`
- **Features**: Client info with profile image and quote

## 🎣 Custom Hooks

### useModal
- **Purpose**: Manages modal state and selected items
- **Returns**: `{ isOpen, selectedItem, openModal, closeModal }`
- **Features**: Centralized modal state management

## 📊 Data Management

### servicesData.js
- **Purpose**: Centralized service information
- **Content**: 18 services with pricing, features, and testimonials
- **Format**: Array of service objects with consistent structure

## 🎨 Styling

### App.css
- **Purpose**: Global styles and theme variables
- **Features**: CSS custom properties for light/dark themes

### ServicesPage.css
- **Purpose**: Services page specific styling
- **Features**: Grid layouts, modal styles, responsive design

## 🔧 Best Practices Applied

### Code Organization
- ✅ Separated concerns into logical folders
- ✅ Extracted reusable components
- ✅ Created custom hooks for state management
- ✅ Centralized data in dedicated files

### React Patterns
- ✅ Functional components with hooks
- ✅ Props destructuring
- ✅ Consistent naming conventions
- ✅ JSDoc documentation

### JavaScript Features
- ✅ ES6+ arrow functions
- ✅ Template literals
- ✅ Destructuring assignment
- ✅ Consistent formatting and indentation

### Maintainability
- ✅ Single responsibility principle
- ✅ DRY (Don't Repeat Yourself)
- ✅ Clean import/export structure
- ✅ Descriptive variable and function names

## 🚀 Benefits of Refactoring

1. **Modularity**: Components can be easily reused and tested
2. **Maintainability**: Changes to one component don't affect others
3. **Scalability**: Easy to add new services or modify existing ones
4. **Readability**: Clear separation of concerns and consistent structure
5. **Performance**: Optimized re-rendering with proper component structure
