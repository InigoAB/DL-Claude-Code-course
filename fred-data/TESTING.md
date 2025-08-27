# Testing Documentation

This document outlines the testing setup and strategy for the FRED Economic Indicators Dashboard.

## Testing Framework

- **Jest**: Test runner and testing framework
- **React Testing Library**: Component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing
- **@testing-library/user-event**: User interaction testing

## Test Structure

```
__tests__/
├── api/                    # API route tests
│   └── fred-simple.test.ts # FRED API validation logic tests
├── components/             # React component tests
│   ├── Dashboard.test.tsx  # Main dashboard functionality
│   ├── Sidebar.test.tsx    # Navigation sidebar tests
│   └── ManufacturingBusinessChart.test.tsx # Chart component tests
├── services/               # Service layer tests
│   └── fredApi.test.ts     # FRED API service tests
└── utils/                  # Test utilities
    └── test-utils.tsx      # Custom render functions and helpers
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Coverage

Current test coverage focuses on:

- **API Route Logic**: Validation of FRED series IDs, data processing, parameter handling
- **Service Layer**: FRED API service methods and error handling
- **Components**: Dashboard navigation, chart rendering, user interactions
- **Data Processing**: Invalid data filtering, date formatting, API response handling

### Coverage Summary

- **Dashboard.tsx**: 87% - Tests category switching, chart rendering, descriptions
- **Sidebar.tsx**: 100% - Complete coverage of navigation functionality
- **ManufacturingBusinessChart.tsx**: 84% - Chart loading, data processing, error states
- **fredApi.ts**: 69% - Core API methods and error handling

## Test Categories

### 1. Unit Tests
- Individual component functionality
- Service method behavior
- Data processing logic
- Error handling scenarios

### 2. Integration Tests
- API route validation
- Service-to-API integration
- Component-to-service integration

### 3. Component Tests
- User interaction flows
- State management
- Props handling
- Accessibility features

## Key Test Features

### API Testing
- Validates working FRED series (MANEMP, UMCSENT, INDPRO, BOPGSTB)
- Rejects non-working series (NAPM, BSCICP02USM665S)
- Tests data filtering and formatting
- Parameter validation (frequency, date ranges)

### Component Testing
- Dashboard category switching
- Chart loading and error states
- Sidebar navigation and styling
- Accessibility compliance

### Service Testing
- HTTP request mocking
- Error response handling
- Data transformation
- API endpoint construction

## Mocking Strategy

### External Dependencies
- **fetch**: Mocked globally for API testing
- **recharts**: Components mocked to avoid canvas rendering issues
- **Next.js routes**: Mocked to avoid environment dependencies

### Chart Components
- Charts are mocked to focus on data flow rather than rendering
- Loading and error states are tested with real component logic
- Data processing and transformation is tested with actual implementations

## Test Configuration

### Jest Setup
- **Environment**: jsdom for DOM testing
- **Setup Files**: jest.setup.js for global mocks and utilities
- **Module Mapping**: Support for absolute imports
- **Coverage**: Excludes type definitions and CSS files

### Mock Utilities
- **ResizeObserver**: Mocked for chart components
- **IntersectionObserver**: Mocked for intersection detection
- **Console methods**: Mocked to reduce test noise

## Best Practices

1. **Focused Testing**: Each test focuses on a single behavior
2. **Descriptive Names**: Test names clearly describe expected behavior
3. **Arrange-Act-Assert**: Clear test structure for readability
4. **Mock Isolation**: External dependencies are properly mocked
5. **Error Testing**: Both success and failure scenarios are covered

## Known Limitations

1. **Next.js API Routes**: Complex integration testing requires running development server
2. **Chart Rendering**: Visual chart testing is limited due to canvas complexity
3. **Real API Calls**: Integration tests use mocked responses for reliability

## Future Improvements

1. **End-to-End Tests**: Add Playwright/Cypress for full user flows
2. **Visual Regression**: Screenshot testing for chart components
3. **Performance Testing**: Load testing for API endpoints
4. **Accessibility Testing**: Automated a11y testing with jest-axe