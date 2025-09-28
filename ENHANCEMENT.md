# API Enhancement Documentation

## New Features Added

### User Authentication
- Added JWT token-based authentication
- Middleware for protecting routes
- User profile endpoint

### Security Improvements
- Token validation
- Error handling for unauthorized access

## Usage

```javascript
// Example usage
app.use('/api', authenticateUser);
```

## Testing
- Unit tests added for authentication
- Integration tests for profile endpoint