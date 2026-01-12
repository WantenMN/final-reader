# AGENTS.md - Development Guidelines for final-reader

This document provides essential development guidelines for agentic coding assistants working on the final-reader project, a multi-platform e-book reader application.

## Project Overview

final-reader is an e-book reader with three main components:
- **Frontend**: Next.js 16 + React 19 + TypeScript web application
- **Backend**: Rust + Axum REST API with SQLite database
- **Android**: Kotlin + Jetpack Compose mobile application

## Build, Lint, and Test Commands

### Frontend (Next.js + TypeScript)
```bash
cd frontend

# Development server
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Run single test file (when tests are added)
pnpm jest path/to/test/file.test.ts
```

### Backend (Rust + Axum)
```bash
cd backend

# Build in debug mode
cargo build

# Build in release mode
cargo build --release

# Run the server
cargo run

# Check for compilation errors
cargo check

# Run tests
cargo test

# Run single test
cargo test test_name

# Run clippy (linting)
cargo clippy

# Format code
cargo fmt
```

### Android (Kotlin + Compose)
```bash
cd android

# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Run tests
./gradlew test

# Run single test
./gradlew test --tests "*.TestClass.testMethod"

# Lint code
./gradlew lint

# Clean build
./gradlew clean build
```

### Cross-Platform Commands
```bash
# Full project setup (run from root)
# Install frontend dependencies
cd frontend && pnpm install

# Install backend dependencies
cd ../backend && cargo build

# Build Android
cd ../android && ./gradlew build
```

## Code Style Guidelines

### TypeScript/React (Frontend)

#### File Structure and Organization
- Use `app/` directory structure for Next.js routing
- Place types in `types.ts` files in the `app/` directory
- Store reusable components in `components/` directory
- Use `lib/` for utilities and store configuration

#### Component Patterns
```typescript
// Use functional components with hooks
'use client';

import { useState, useEffect } from 'react';

export default function ComponentName() {
  // State and effects here
  return (
    // JSX here
  );
}
```

#### TypeScript Conventions
- Enable strict mode in `tsconfig.json`
- Define interfaces for all data structures
- Use proper typing for API responses and component props
```typescript
interface Book {
  id: string;
  title: string;
  author: string | null;
  // ... other properties
}

interface ComponentProps {
  books: Book[];
  onAction: (book: Book) => void;
}
```

#### State Management
- Use Zustand for global state with persistence
- Store in `lib/store.ts`
- Include type definitions for all state properties
```typescript
interface ReadState {
  isTocOpen: boolean;
  toggleToc: () => void;
  // ... other state and actions
}
```

#### Error Handling
```typescript
try {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  const data = await response.json();
} catch (error) {
  console.error(error);
  // Handle error appropriately
}
```

#### Styling
- Use TailwindCSS classes
- Follow responsive design patterns with grid layouts
- Use semantic class names
```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
  {/* Content */}
</div>
```

### Rust (Backend)

#### Project Structure
- Use `src/main.rs` as entry point
- Organize modules in `src/` directory (`api/`, `db/`, `server/`, etc.)
- Place database migrations in `src/db/migrations/`

#### Async Patterns
- Use `tokio::main` for the main function
- Use `async fn` for all async operations
- Handle futures with `.await`
```rust
#[tokio::main]
async fn main() {
    let result = async_operation().await;
}
```

#### Error Handling
- Use `Result<T, E>` for all operations that can fail
- Return appropriate HTTP status codes
- Log errors with `eprintln!`
```rust
pub async fn handler() -> Result<Json<Data>, (StatusCode, Json<Value>)> {
    match operation().await {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            eprintln!("Error: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Something went wrong"}))))
        }
    }
}
```

#### Database Operations
- Use SQLx with compile-time checked queries
- Use `sqlx::query_as` for typed results
- Bind parameters to prevent SQL injection
```rust
let books = sqlx::query_as::<_, Book>("SELECT * FROM books WHERE id = ?")
    .bind(book_id)
    .fetch_all(&pool)
    .await?;
```

#### API Structure
- Use Axum extractors (`State`, `Path`, `Query`, `Json`)
- Return `Json<T>` for successful responses
- Use structured error responses
- Follow RESTful URL patterns (`/api/books`, `/api/books/{id}`)

#### Logging
- Use `println!` for informational logs
- Use `eprintln!` for error logs
- Include relevant context in log messages

### Kotlin (Android)

#### Project Structure
- Use standard Android project layout
- Place composables in appropriate packages
- Follow MVVM or similar architecture patterns

#### Compose Patterns
```kotlin
@Composable
fun BookList(books: List<Book>, modifier: Modifier = Modifier) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 128.dp),
        modifier = modifier
    ) {
        items(books) { book ->
            BookItem(book = book)
        }
    }
}
```

#### Naming Conventions
- Use PascalCase for composable functions
- Use camelCase for parameters and variables
- Follow Android naming conventions for resources

### General Guidelines

#### Import Organization
- Group imports by external libraries, then internal modules
- Use absolute imports with path aliases (`@/` in frontend)
- Sort imports alphabetically within groups

#### Naming Conventions
- **Functions**: camelCase for JavaScript/TypeScript, snake_case for Rust
- **Types/Interfaces**: PascalCase
- **Constants**: SCREAMING_SNAKE_CASE
- **Files**: kebab-case for JavaScript, snake_case for Rust

#### Comments
- Do not add comments to code unless absolutely necessary
- Use descriptive function and variable names instead
- Document complex business logic only when the code intent isn't clear

#### Security
- Never log sensitive information (passwords, tokens, etc.)
- Validate all user inputs on both frontend and backend
- Use HTTPS for all API communications
- Store sensitive data securely (environment variables, secure storage)

#### Testing
- Write unit tests for business logic functions
- Test API endpoints with various inputs
- Include integration tests for critical user flows
- Test error conditions and edge cases

## Existing Rules

### Trae Rules
- After writing code, use the corresponding tools to check for errors, such as syntax errors, logical errors, etc.
- Do not run code

## Commit Guidelines

- Use semantic commit messages following Conventional Commits format
- Keep commits focused on single changes
- Run lint and tests before committing

### Semantic Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Examples

```
feat: add user authentication
fix: resolve memory leak in epub parser
docs: update API documentation
style: format code with prettier
refactor: simplify book loading logic
test: add unit tests for chapter parsing
build: update Rust dependencies
ci: add GitHub Actions workflow
chore: remove unused dependencies
```

### Commit Message Guidelines

- Use present tense ("add" not "added")
- Start with lowercase
- Keep the subject line under 50 characters
- Use the body to explain what and why (not how)

## Code Review Checklist

- [ ] Code compiles without errors
- [ ] Tests pass
- [ ] Linting passes
- [ ] No sensitive data logged
- [ ] Error handling is appropriate
- [ ] Types are properly defined
- [ ] Naming conventions followed
- [ ] Security best practices followed