# Gemini AI Prompt for Generating Coding Questions

Copy and paste this prompt into Gemini AI to generate coding questions in the correct JSON format.

---

## PROMPT:

```
You are a coding challenge generator for a TikTok-style coding education app. Generate coding questions in JSON format that are engaging, educational, and suitable for developers.

**REQUIREMENTS:**

1. **Output Format:** Return ONLY valid JSON array, no markdown, no explanations
2. **Language:** JavaScript only (for now)
3. **Difficulty Levels:** Beginner, Intermediate, Advanced, Expert
4. **Topics:** Include diverse topics like Arrays, Strings, Hash Tables, Algorithms, Data Structures, etc.

**JSON STRUCTURE:**

Each question must follow this exact structure:

```json
[
  {
    "title": "Short, catchy title (3-5 words)",
    "language": "JavaScript",
    "difficulty": "Beginner|Intermediate|Advanced|Expert",
    "description": "Clear, concise problem description (1-3 sentences). Explain what the function should do and any constraints.",
    "starterCode": "function functionName(params) {\n  // Your code here\n}",
    "solution": "function functionName(params) {\n  // Complete working solution\n  return result;\n}",
    "testCases": [
      {
        "input": { "param1": value1, "param2": value2 },
        "expected": expectedOutput
      }
    ]
  }
]
```

**RULES:**

1. **Title:** Must be unique, descriptive, and engaging
2. **Description:** 
   - Be clear and concise
   - Include constraints (e.g., "array length 1-1000")
   - Mention edge cases if relevant
3. **Starter Code:**
   - Must have the same function name as solution
   - Include helpful comment
   - Use clear parameter names
4. **Solution:**
   - Must be a complete, working solution
   - Use efficient algorithms
   - Include comments for complex logic
5. **Test Cases:**
   - Minimum 3 test cases per question
   - Cover: normal case, edge case, boundary case
   - Input must be an object with parameter names matching function parameters
   - Expected output must be JSON-serializable (arrays, objects, primitives)

**EXAMPLE OUTPUT:**

```json
[
  {
    "title": "Find Missing Number",
    "language": "JavaScript",
    "difficulty": "Beginner",
    "description": "Given an array containing n distinct numbers from 0 to n, find the one number that is missing from the array.",
    "starterCode": "function findMissingNumber(nums) {\n  // Your code here\n}",
    "solution": "function findMissingNumber(nums) {\n  const n = nums.length;\n  const expectedSum = (n * (n + 1)) / 2;\n  const actualSum = nums.reduce((sum, num) => sum + num, 0);\n  return expectedSum - actualSum;\n}",
    "testCases": [
      {
        "input": { "nums": [3, 0, 1] },
        "expected": 2
      },
      {
        "input": { "nums": [0, 1] },
        "expected": 2
      },
      {
        "input": { "nums": [9, 6, 4, 2, 3, 5, 7, 0, 1] },
        "expected": 8
      }
    ]
  },
  {
    "title": "Merge Sorted Arrays",
    "language": "JavaScript",
    "difficulty": "Intermediate",
    "description": "Merge two sorted arrays into one sorted array. The arrays may have different lengths.",
    "starterCode": "function mergeSortedArrays(arr1, arr2) {\n  // Your code here\n}",
    "solution": "function mergeSortedArrays(arr1, arr2) {\n  const result = [];\n  let i = 0, j = 0;\n  \n  while (i < arr1.length && j < arr2.length) {\n    if (arr1[i] < arr2[j]) {\n      result.push(arr1[i++]);\n    } else {\n      result.push(arr2[j++]);\n    }\n  }\n  \n  return result.concat(arr1.slice(i)).concat(arr2.slice(j));\n}",
    "testCases": [
      {
        "input": { "arr1": [1, 3, 5], "arr2": [2, 4, 6] },
        "expected": [1, 2, 3, 4, 5, 6]
      },
      {
        "input": { "arr1": [1, 2, 3], "arr2": [4, 5, 6] },
        "expected": [1, 2, 3, 4, 5, 6]
      },
      {
        "input": { "arr1": [], "arr2": [1, 2, 3] },
        "expected": [1, 2, 3]
      }
    ]
  }
]
```

**NOW GENERATE:**

Generate [NUMBER] coding questions following the above format. Focus on:
- [DIFFICULTY LEVEL] difficulty
- [TOPICS] topics (e.g., Arrays, Strings, Hash Tables, Recursion, etc.)
- Make them practical and interview-relevant
- Ensure solutions are optimal and well-commented

Return ONLY the JSON array, nothing else.
```

---

## HOW TO USE:

### Basic Usage:
```
[Paste the prompt above]

NOW GENERATE:
Generate 5 coding questions following the above format. Focus on:
- Beginner difficulty
- Arrays and Strings topics
- Make them practical and interview-relevant
- Ensure solutions are optimal and well-commented

Return ONLY the JSON array, nothing else.
```

### For Specific Topics:
```
NOW GENERATE:
Generate 10 coding questions following the above format. Focus on:
- Intermediate difficulty
- Hash Tables, Two Pointers, and Sliding Window topics
- Make them practical and interview-relevant
- Ensure solutions are optimal and well-commented

Return ONLY the JSON array, nothing else.
```

### For Mixed Difficulties:
```
NOW GENERATE:
Generate 15 coding questions following the above format. Focus on:
- Mixed difficulty (5 Beginner, 5 Intermediate, 5 Advanced)
- Diverse topics: Arrays, Strings, Trees, Graphs, Dynamic Programming
- Make them practical and interview-relevant
- Ensure solutions are optimal and well-commented

Return ONLY the JSON array, nothing else.
```

---

## AFTER GENERATION:

1. **Copy the JSON output** from Gemini
2. **Validate the JSON** (use a JSON validator online)
3. **Save to a file:** `questions-generated.json`
4. **Update the upload script:**
   ```javascript
   // In uploadTestQuestions.js, replace testQuestions with:
   const testQuestions = require('./questions-generated.json');
   ```
5. **Run the upload script:**
   ```bash
   node scripts/uploadTestQuestions.js
   ```

---

## TIPS:

- **Start small:** Generate 5 questions first to test
- **Validate solutions:** Test the solution code manually before uploading
- **Check test cases:** Ensure expected outputs are correct
- **Diverse topics:** Mix different algorithm types for variety
- **Progressive difficulty:** Start with easier questions, gradually increase complexity

---

## COMMON ISSUES & FIXES:

**Issue:** Gemini adds markdown code blocks
```
❌ ```json
   [...]
   ```
```
**Fix:** Ask Gemini to "Return ONLY the JSON array without markdown formatting"

**Issue:** Function names don't match
```
❌ starterCode: "function solve(x) {}"
   solution: "function solution(x) {}"
```
**Fix:** Ensure both use the same function name

**Issue:** Test case format wrong
```
❌ "input": [1, 2, 3]  // Should be object
✅ "input": { "nums": [1, 2, 3] }
```
**Fix:** Input must always be an object with parameter names

**Issue:** Expected output not JSON-serializable
```
❌ "expected": undefined
✅ "expected": null
```
**Fix:** Use null, not undefined; use arrays/objects, not functions

---

## EXAMPLE CONVERSATION WITH GEMINI:

**You:**
```
[Paste the full prompt]

NOW GENERATE:
Generate 5 coding questions following the above format. Focus on:
- Beginner difficulty
- Arrays and Strings topics
- Make them practical and interview-relevant
- Ensure solutions are optimal and well-commented

Return ONLY the JSON array, nothing else.
```

**Gemini:** (Returns JSON)

**You (if needed):**
```
Great! Now generate 5 more questions with:
- Intermediate difficulty
- Hash Tables and Two Pointers topics
```

---

## QUALITY CHECKLIST:

Before uploading, verify each question has:
- ✅ Unique, descriptive title
- ✅ Clear problem description
- ✅ Matching function names in starter and solution
- ✅ Working solution code
- ✅ At least 3 test cases
- ✅ Test cases cover edge cases
- ✅ Correct expected outputs
- ✅ Valid JSON format
