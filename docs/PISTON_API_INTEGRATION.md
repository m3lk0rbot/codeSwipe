# Piston API Integration

## Overview

The app now uses **Piston API** for multi-language code execution, supporting:
- ✅ JavaScript
- ✅ Python
- ✅ Go
- ✅ Java
- ✅ TypeScript
- ✅ C++
- ✅ C#
- ✅ Rust

## How It Works

### 1. Code Submission Flow

```
User writes code → Click "Run Tests" → geminiService.ts
                                              ↓
                                    Check language
                                              ↓
                        ┌─────────────────────┴─────────────────────┐
                        ↓                                           ↓
                JavaScript                                  Other Languages
                        ↓                                           ↓
            Client-side execution                         Piston API
            (sandboxed eval)                              (secure containers)
                        ↓                                           ↓
                        └─────────────────────┬─────────────────────┘
                                              ↓
                                      Test Results
```

### 2. Test Runner Generation

For each language, the service generates appropriate test runner code:

**Python Example:**
```python
import json

def longest_palindrome(s):
    # user code here
    pass

input_data = {"s": "babad"}
expected = "bab"
args = list(input_data.values())
result = longest_palindrome(*args)
print(json.dumps({"result": result, "expected": expected}))
```

**JavaScript Example:**
```javascript
function twoSum(nums, target) {
    // user code here
}

const input = {"nums": [2,7,11,15], "target": 9};
const expected = [0,1];
const args = Object.values(input);
const result = twoSum(...args);
console.log(JSON.stringify({ result, expected }));
```

### 3. Execution & Validation

1. **Send to Piston API** with language and version
2. **Execute in secure container** (isolated, sandboxed)
3. **Parse output** (JSON with result and expected)
4. **Compare** result vs expected
5. **Return test results** to frontend

## API Details

### Endpoint
```
POST https://emkc.org/api/v2/piston/execute
```

### Request Format
```json
{
  "language": "python",
  "version": "3.10.0",
  "files": [
    {
      "content": "print('Hello World')"
    }
  ]
}
```

### Response Format
```json
{
  "run": {
    "stdout": "Hello World\n",
    "stderr": "",
    "code": 0,
    "output": "Hello World\n"
  }
}
```

## Language Versions

| Language | Version | Piston ID |
|----------|---------|-----------|
| JavaScript | 18.15.0 | javascript |
| Python | 3.10.0 | python |
| Go | 1.16.2 | go |
| Java | 15.0.2 | java |
| TypeScript | 5.0.3 | typescript |
| C++ | 10.2.0 | c++ |
| C# | 6.12.0 | csharp |
| Rust | 1.68.2 | rust |

## Rate Limits

- **Free tier:** 5 requests/second
- **No authentication required**
- **No usage limits**

For production with higher traffic, consider self-hosting Piston.

## Error Handling

### Network Errors
- Falls back to error message in test results
- User sees "Error: [message]" instead of crash

### Compilation Errors
- Captured in stderr
- Displayed in test results
- User can fix and retry

### Runtime Errors
- Caught and displayed
- Test marked as failed
- Clear error messages

## Fallback Strategy

**JavaScript:** Uses client-side execution as fallback
- Faster (no API call)
- Works offline
- Same behavior as before

**Other Languages:** Require Piston API
- No client-side execution possible
- Clear error if API unavailable

## Testing

### Test a Python Question:
1. Switch to DB mode
2. Find a Python question
3. Write solution
4. Click "Run Tests"
5. See results from Piston API

### Test All Languages:
```bash
# In browser console
const languages = ['JavaScript', 'Python', 'Go', 'Java', 'TypeScript', 'C++', 'C#', 'Rust'];
languages.forEach(lang => console.log(`${lang}: Ready`));
```

## Monitoring

### Check API Status:
```bash
curl https://emkc.org/api/v2/piston/runtimes
```

### View Supported Languages:
```javascript
fetch('https://emkc.org/api/v2/piston/runtimes')
  .then(r => r.json())
  .then(data => console.table(data));
```

## Future Improvements

### Phase 1 (Current)
- ✅ Basic multi-language support
- ✅ Simple test runner generation
- ✅ Error handling

### Phase 2 (Next)
- [ ] Better test runner templates
- [ ] Support for complex input types
- [ ] Caching for repeated executions
- [ ] Rate limit handling

### Phase 3 (Future)
- [ ] Self-host Piston on Cloud Run
- [ ] Custom language configurations
- [ ] Advanced test case formats
- [ ] Performance optimizations

## Troubleshooting

### "Could not determine function name"
- Check solution code has proper function definition
- Verify function name matches language syntax

### "Piston API error: 429"
- Rate limit exceeded (5 req/sec)
- Wait a moment and retry
- Consider self-hosting for production

### "Execution failed"
- Check code syntax
- Verify test case format
- Look at stderr in browser console

### Tests pass locally but fail in app
- Check function name matches
- Verify input/output format
- Test with simple cases first

## Resources

- **Piston API Docs:** https://github.com/engineer-man/piston
- **Public API:** https://emkc.org/api/v2/piston
- **Self-hosting Guide:** https://github.com/engineer-man/piston#installation

## Security

- ✅ **Sandboxed execution** - Code runs in isolated containers
- ✅ **No file system access** - Cannot read/write files
- ✅ **No network access** - Cannot make external requests
- ✅ **Time limits** - Execution timeout prevents infinite loops
- ✅ **Memory limits** - Prevents memory exhaustion

Piston is production-ready and used by many coding platforms.
