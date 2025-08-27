import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '../../app/components/Sidebar'

describe('Sidebar', () => {
  const mockOnCategoryChange = jest.fn()
  
  const defaultProps = {
    activeCategory: 'Key Indicators' as const,
    onCategoryChange: mockOnCategoryChange,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all category options', () => {
    render(<Sidebar {...defaultProps} />)
    
    const expectedCategories = [
      'Key Indicators',
      'Inflation',
      'Employment',
      'Interest Rates',
      'Economic Growth',
      'Exchange Rates',
      'Housing',
      'Consumer Spending',
    ]

    expectedCategories.forEach(category => {
      expect(screen.getByText(category)).toBeInTheDocument()
    })
  })

  it('highlights the active category', () => {
    render(<Sidebar {...defaultProps} />)
    
    const activeButton = screen.getByText('Key Indicators').closest('button')
    expect(activeButton).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600', 'text-white')
  })

  it('calls onCategoryChange when a category is clicked', () => {
    render(<Sidebar {...defaultProps} />)
    
    const inflationButton = screen.getByText('Inflation')
    fireEvent.click(inflationButton)
    
    expect(mockOnCategoryChange).toHaveBeenCalledWith('Inflation')
    expect(mockOnCategoryChange).toHaveBeenCalledTimes(1)
  })

  it('does not highlight inactive categories', () => {
    render(<Sidebar {...defaultProps} />)
    
    const inactiveButton = screen.getByText('Inflation').closest('button')
    expect(inactiveButton).not.toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600')
    expect(inactiveButton).toHaveClass('text-slate-300', 'hover:bg-slate-700/50')
  })

  it('changes active category styling when activeCategory prop changes', () => {
    const { rerender } = render(<Sidebar {...defaultProps} />)
    
    // Initially Key Indicators is active
    expect(screen.getByText('Key Indicators').closest('button')).toHaveClass('from-blue-600')
    expect(screen.getByText('Employment').closest('button')).not.toHaveClass('from-blue-600')
    
    // Change to Employment
    rerender(<Sidebar {...defaultProps} activeCategory="Employment" />)
    
    expect(screen.getByText('Employment').closest('button')).toHaveClass('from-blue-600')
    expect(screen.getByText('Key Indicators').closest('button')).not.toHaveClass('from-blue-600')
  })

  it('has proper accessibility attributes', () => {
    render(<Sidebar {...defaultProps} />)
    
    const sidebar = screen.getByRole('navigation')
    expect(sidebar).toBeInTheDocument()
    
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    
    // Buttons should be clickable and accessible
    buttons.forEach(button => {
      expect(button).toBeInTheDocument()
      expect(button.tagName).toBe('BUTTON')
    })
  })

  it('renders category icons correctly', () => {
    render(<Sidebar {...defaultProps} />)
    
    // Check for some expected emojis/icons in category buttons
    expect(screen.getAllByText('📊')).toHaveLength(2) // Key Indicators (appears in header and button)
    expect(screen.getByText('👥')).toBeInTheDocument() // Employment
    expect(screen.getAllByText('📈')).toHaveLength(2) // Economic Growth and Inflation (both use 📈)
  })

  it('has proper hover effects on buttons', () => {
    render(<Sidebar {...defaultProps} />)
    
    const inactiveButton = screen.getByText('Inflation').closest('button')
    expect(inactiveButton).toHaveClass('hover:bg-slate-700/50')
    
    const activeButton = screen.getByText('Key Indicators').closest('button')
    expect(activeButton).toHaveClass('bg-gradient-to-r')
  })

  it('maintains consistent button layout and spacing', () => {
    render(<Sidebar {...defaultProps} />)
    
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveClass('w-full', 'text-left', 'p-3', 'rounded-xl')
    })
  })

  describe('Category Coverage', () => {
    const allCategories = [
      'Key Indicators',
      'Inflation', 
      'Employment',
      'Interest Rates',
      'Economic Growth',
      'Exchange Rates',
      'Housing',
      'Consumer Spending',
    ] as const

    allCategories.forEach(category => {
      it(`handles ${category} category correctly`, () => {
        render(<Sidebar {...defaultProps} activeCategory={category} />)
        
        const categoryButton = screen.getByText(category).closest('button')
        expect(categoryButton).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600', 'text-white')
        
        // Click the button
        fireEvent.click(categoryButton!)
        expect(mockOnCategoryChange).toHaveBeenCalledWith(category)
      })
    })
  })
})