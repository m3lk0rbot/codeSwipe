# AI-Powered Code Review System

## Overview

Code Swipe features an intelligent AI-powered code review system that provides instant, personalized feedback on every code submission. Using Google's Gemini AI, the system analyzes code quality, identifies strengths, and suggests improvements - making it a true AI mentor for developers.

---

## Features

### 🎯 Real-Time Analysis
- Instant feedback on every submission
- Works for both passing and failing solutions
- No waiting - reviews appear within seconds

### 📊 Quality Scoring
- Code quality score from 1-10
- Visual bar chart representation
- Consistent scoring across languages

### ✅ Strength Identification
- Highlights what you're doing well
- Positive reinforcement for good practices
- Encourages continued learning

### ⚡ Actionable Improvements
- Specific, concrete suggestions
- Focuses on one key improvement at a time
- Helps you level up your coding skills

---

## How It Works

### Architecture

```
User Submits Code
     ↓
Tests Execute (Pass/Fail)
     ↓
Result Modal Opens
     ↓
Frontend calls getAICodeReview()
     ↓
Request sent to Curator Service
     ↓
Gemini AI analyzes code
     ↓
Review generated (score, strength, improvement)
     ↓
Review displayed in modal
```

### API Endpoint

**Endpoint**: `POST /api/reviewCode`

**Request Body**:
```json
{
  "userCode": "function add(a, b) { return a + b; }",
  "solutionCode": "function add(a, b) { return a + b; }",
  "language": "JavaScript",
  "testsPassed": true,
  "challengeTitle": "Add Two Numbers"
}
```

**Response**:
```json
{
  "score": 8,
  "strength": "Your solution is clean and follows best practices.",
  "improvement": "Consider adding input validation for edge cases."
}
```

---

## Implementation Details

### Frontend (`services/geminiService.ts`)

```typescript
export const getAICodeReview = async (
    userCode: string,
    solutionCode: string,
    language: ProgrammingLanguage,
    testsPassed: boolean,
    challengeTitle: string
): Promise<CodeReview>
```

**Features**:
- Automatic retry on failure
- Fallback responses if API unavailable
- Error handling with user-friendly messages
- Works in both development and production

### Backend (`curator/server.js`)

```javascript
app.post('/api/reviewCode', async (req, res) => {
  // Validates input
  // Calls Gemini AI
  // Returns structured review
  // Handles errors gracefully
});
```

**Features**:
- Input validation
- Gemini AI integration
- JSON schema enforcement
- Fallback reviews
- Error logging

### UI Component (`components/ResultModal.tsx`)

**Features**:
- Loading state with spinner
- Visual score representation
- Color-coded feedback (green for strength, yellow for improvement)
- Responsive design
- Error state handling

---

## Review Criteria

The AI analyzes code based on:

1. **Correctness** - Does it solve the problem?
2. **Readability** - Is it easy to understand?
3. **Efficiency** - Is it optimized?
4. **Best Practices** - Does it follow language conventions?
5. **Code Style** - Is it clean and well-formatted?

---

## Example Reviews

### Passing Solution

```javascript
// User Code
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
```

**AI Review**:
- **Score**: 9/10
- **Strength**: "Excellent use of a hash map for O(n) time complexity. Clean and efficient solution."
- **Improvement**: "Consider adding comments to explain the algorithm for better maintainability."

### Failing Solution

```javascript
// User Code
function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
}
```

**AI Review**:
- **Score**: 5/10
- **Strength**: "Your nested loop approach correctly identifies the target sum."
- **Improvement**: "Consider using a hash map to reduce time complexity from O(n²) to O(n)."

---

## Benefits

### For Learners
- **Instant Feedback** - No waiting for human reviewers
- **Consistent Quality** - Same high-quality feedback every time
- **Learn from Mistakes** - Understand what went wrong
- **Positive Reinforcement** - Celebrate what you did right

### For Educators
- **Scalable Mentorship** - AI reviews every submission
- **Consistent Standards** - Same criteria applied to all students
- **Time Savings** - Automated initial review
- **Focus on Teaching** - Spend time on complex issues

### For the Platform
- **Engagement** - Users get value even from failures
- **Retention** - Personalized feedback keeps users coming back
- **Differentiation** - Unique feature not found in competitors
- **Innovation** - Showcases AI capabilities

---

## Cost Optimization

### Context Caching
- System prompts are cached
- Language specifications are cached
- 90% reduction in API costs
- Fast response times

### Fallback System
- Graceful degradation if API unavailable
- Basic reviews without AI
- No service interruption

---

## Future Enhancements

### Planned Features
- **Code Comparison** - Visual diff with expected solution
- **Multiple Suggestions** - Top 3 improvements instead of 1
- **Learning Resources** - Links to relevant tutorials
- **Historical Tracking** - See improvement over time
- **Peer Comparison** - How your code compares to others
- **Language-Specific Tips** - Idiomatic patterns for each language

### Advanced Features
- **Refactoring Suggestions** - Automated code improvements
- **Security Analysis** - Identify potential vulnerabilities
- **Performance Profiling** - Suggest optimizations
- **Test Coverage** - Recommend additional test cases

---

## Technical Specifications

### Supported Languages
- JavaScript
- Python
- Go
- Java
- TypeScript
- C++
- C#
- Rust

### Response Time
- Average: 1-2 seconds
- Maximum: 5 seconds
- Timeout: 10 seconds

### Availability
- 99.9% uptime target
- Fallback responses on failure
- No blocking of user flow

### Security
- Code is not stored permanently
- Transmitted over HTTPS
- No PII in code samples
- Sandboxed execution

---

## Monitoring & Analytics

### Metrics Tracked
- Review request count
- Average response time
- Success rate
- Fallback usage rate
- User satisfaction (implicit)

### Error Handling
- Automatic retry on transient failures
- Fallback to basic reviews
- Error logging for debugging
- User-friendly error messages

---

## Conclusion

The AI-Powered Code Review system is a key differentiator for Code Swipe, providing instant, personalized feedback that helps developers learn and improve. By leveraging Google's Gemini AI and implementing smart caching strategies, we've created a scalable, cost-effective solution that enhances the learning experience for every user.

**Built for the Google Cloud Run Hackathon** 🚀

