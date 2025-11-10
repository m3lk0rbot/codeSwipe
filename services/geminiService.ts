

import { TestCase, TestResult, ProgrammingLanguage } from '../types';

// Piston API configuration
const PISTON_API_URL = 'https://emkc.org/api/v2/piston';

// Map our language names to Piston's language identifiers
const LANGUAGE_MAP: Record<ProgrammingLanguage, { language: string; version: string }> = {
    'JavaScript': { language: 'javascript', version: '18.15.0' },
    'Python': { language: 'python', version: '3.10.0' },
    'Go': { language: 'go', version: '1.16.2' },
    'Java': { language: 'java', version: '15.0.2' },
    'TypeScript': { language: 'typescript', version: '5.0.3' },
    'C++': { language: 'c++', version: '10.2.0' },
    'C#': { language: 'csharp', version: '6.12.0' },
    'Rust': { language: 'rust', version: '1.68.2' },
};

// Extract function name from code based on language
function extractFunctionName(code: string, language: ProgrammingLanguage): string | null {
    const patterns: Record<ProgrammingLanguage, RegExp> = {
        'JavaScript': /function\s+(\w+)/,
        'TypeScript': /function\s+(\w+)/,
        'Python': /def\s+(\w+)/,
        'Go': /func\s+(\w+)/,
        'Java': /(?:public|private|protected)?\s*(?:static)?\s*[\w<>[\]]+\s+(\w+)\s*\(/,
        'C++': /[\w<>[\]&*\s]+\s+(\w+)\s*\(/,  // Matches C++ return types with templates, pointers, references
        'C#': /(?:public|private|protected)?\s*(?:static)?\s*[\w<>[\]]+\s+(\w+)\s*\(/,
        'Rust': /fn\s+(\w+)/,
    };

    const match = code.match(patterns[language]);
    return match ? match[1] : null;
}

function getJavaParamOrder(code: string, functionName: string): string[] | null {
    const pattern = new RegExp(
      `(?:public|private|protected)?\\s*(?:static)?\\s*[\\w<>\\[\\]]+\\s+${functionName}\\s*\\(([^)]*)\\)`
    );
    const match = code.match(pattern);
    if (match && match[1] !== undefined) {
      if (match[1].trim() === '') {
        return [];
      }
      return match[1].split(',').map(p => {
        const parts = p.trim().split(/\s+/);
        return parts.pop() || '';
      }).filter(p => p);
    }
    return null;
}

// Generate test runner code based on language
function generateTestRunner(
    userCode: string,
    functionName: string,
    testCase: TestCase,
    language: ProgrammingLanguage
): string {
    const inputJson = JSON.stringify(testCase.input);
    const expectedJson = JSON.stringify(testCase.expected);

    switch (language) {
        case 'JavaScript':
        case 'TypeScript':
            return `
${userCode}

const input = ${inputJson};
const expected = ${JSON.stringify(testCase.expected)};
let args;
if (Array.isArray(input)) {
    args = input;
} else if (typeof input === 'object' && input !== null) {
    args = Object.values(input);
} else {
    args = [input];
}
try {
    const result = ${functionName}(...args);
    console.log(JSON.stringify({ result, expected }));
} catch (e) {
    console.log(JSON.stringify({ error: e.message, expected }));
}
`;

        case 'Python': {
            // Escape backslashes and single quotes for Python string
            const escapedInputJson = inputJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const escapedExpectedJson = expectedJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            
            return `
import json
import sys

${userCode}

try:
    input_data = json.loads('${escapedInputJson}')
    expected = json.loads('${escapedExpectedJson}')
    args = list(input_data.values())
    result = ${functionName}(*args)

    # For list of lists, sort for stable comparison
    if isinstance(result, list) and all(isinstance(i, list) for i in result):
        result = sorted([sorted(i) for i in result], key=lambda x: str(x))
    
    if isinstance(expected, list) and all(isinstance(i, list) for i in expected):
        expected = sorted([sorted(i) for i in expected], key=lambda x: str(x))

    print(json.dumps({"result": result, "expected": expected}))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
`;
        }
        case 'Go': {
            const paramDeclarations: string[] = [];
            const paramNames: string[] = [];

            Object.entries(testCase.input).forEach(([key, value]) => {
                paramNames.push(key);
                if (typeof value === 'number' && Number.isInteger(value)) {
                    paramDeclarations.push(`${key} := int(input["${key}"].(float64))`);
                } else if (typeof value === 'number') {
                    paramDeclarations.push(`${key} := input["${key}"].(float64)`);
                } else if (typeof value === 'string') {
                    paramDeclarations.push(`${key} := input["${key}"].(string)`);
                } else if (Array.isArray(value) && value.every(item => typeof item === 'number')) {
                    paramDeclarations.push(`${key} := toIntSlice(input["${key}"].([]interface{}))`);
                } else {
                    paramDeclarations.push(`// Could not infer type for ${key}`);
                }
            });
            
            return `
package main

import (
	"encoding/json"
	"fmt"
)

${userCode}

func toIntSlice(i []interface{}) []int {
	s := make([]int, len(i))
	for k, v := range i {
		s[k] = int(v.(float64))
	}
	return s
}

func main() {
	var input map[string]interface{}
	inputJSON := \`${inputJson}\`
	json.Unmarshal([]byte(inputJSON), &input)

	${paramDeclarations.join('\n\t')}
	
	result := ${functionName}(${paramNames.join(', ')})
    
	var expected interface{}
	expectedJSON := \`${expectedJson}\`
	json.Unmarshal([]byte(expectedJSON), &expected)

	output := map[string]interface{}{
		"result":   result,
		"expected": expected,
	}

	jsonOutput, _ := json.Marshal(output)
	fmt.Println(string(jsonOutput))
}
`;
        }

        case 'Java': {
            let finalUserCode = userCode;
            let className = "Solution";
            let callPrefix: string;

            if (!/class\s+\w+/.test(userCode)) {
                finalUserCode = `class Solution {\n    ${userCode}\n}`;
                callPrefix = 'new Solution().';
            } else {
                const classMatch = userCode.match(/class\s+(\w+)/);
                if (classMatch) {
                    className = classMatch[1];
                }
                const isStatic = new RegExp(`static\\s+\\w+\\s+${functionName}`).test(userCode);
                callPrefix = isStatic ? `${className}.` : `new ${className}().`;
            }

            const paramOrder = getJavaParamOrder(userCode, functionName) || Object.keys(testCase.input);
            
            const declarations: string[] = [];
            paramOrder.forEach(key => {
                 if (testCase.input.hasOwnProperty(key)) {
                    const value = testCase.input[key];
                     if (typeof value === 'string') {
                        declarations.push(`String ${key} = "${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}";`);
                    } else if (typeof value === 'number') {
                        if (Number.isInteger(value)) {
                            declarations.push(`int ${key} = ${value};`);
                        } else {
                            declarations.push(`double ${key} = ${value};`);
                        }
                    } else if (Array.isArray(value)) {
                        if (value.length === 0) {
                            declarations.push(`int[] ${key} = new int[]{};`);
                        } else if (typeof value[0] === 'number') {
                             declarations.push(`int[] ${key} = new int[]{${value.join(', ')}};`);
                        } else if (typeof value[0] === 'string') {
                             declarations.push(`String[] ${key} = new String[]{${value.map(v => `"${v.replace(/"/g, '\\"')}"`).join(', ')}};`);
                        }
                    }
                 }
            });

            const callStatement = `result = ${callPrefix}${functionName}(${paramOrder.join(', ')});`;
            const expectedJsonString = JSON.stringify(testCase.expected);

            return `
import java.util.*;
import java.util.stream.Collectors;

${finalUserCode}

public class Main {
    public static String toJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String) {
            String s = (String) obj;
            s = s.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"");
            return "\\"" + s + "\\"";
        }
        if (obj instanceof Number || obj instanceof Boolean) return obj.toString();
        if (obj instanceof int[]) return Arrays.toString((int[]) obj).replace(" ", "");
        if (obj instanceof long[]) return Arrays.toString((long[]) obj).replace(" ", "");
        if (obj instanceof double[]) return Arrays.toString((double[]) obj).replace(" ", "");
        if (obj instanceof boolean[]) return Arrays.toString((boolean[]) obj).replace(" ", "");
        if (obj instanceof String[]) {
            return "[" + Arrays.stream((String[]) obj).map(Main::toJson).collect(Collectors.joining(",")) + "]";
        }
        if (obj.getClass().isArray()) {
            return "[]"; // Fallback for other array types
        }
        if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            return "[" + list.stream().map(Main::toJson).collect(Collectors.joining(",")) + "]";
        }
        return "\\"" + obj.toString() + "\\"";
    }

    public static void main(String[] args) {
        ${declarations.join('\n        ')}
        
        Object result = null;
        try {
            ${callStatement}
        } catch (Exception e) {
            result = "Error: " + e.toString();
        }
        
        String resultJson = toJson(result);
        String expectedJson = ${JSON.stringify(expectedJsonString)};

        System.out.println("{\\"result\\":" + resultJson + ",\\"expected\\":" + expectedJson + "}");
    }
}
`;
        }
        case 'Rust': {
            const paramDeclarations = Object.keys(testCase.input).map(key => {
                const value = testCase.input[key];
                if (typeof value === 'number' && Number.isInteger(value)) {
                    return `let ${key}: i32 = serde_json::from_value(input["${key}"].clone()).unwrap();`;
                }
                 if (Array.isArray(value) && (value.length === 0 || value.every(item => typeof item === 'number'))) {
                    return `let ${key}: Vec<i32> = serde_json::from_value(input["${key}"].clone()).unwrap();`;
                }
                if (typeof value === 'string') {
                     return `let ${key}: String = serde_json::from_value(input["${key}"].clone()).unwrap();`;
                }
                return `// Could not infer type for ${key}`;
            }).join('\n    ');

            const argList = Object.keys(testCase.input).join(', ');

            return `
use serde_json::{json, Value};
use std::collections::HashMap;

${userCode}

fn main() {
    let input_str = r#"${inputJson}"#;
    let expected_str = r#"${expectedJson}"#;
    
    let input: Value = serde_json::from_str(input_str).unwrap();
    let expected: Value = serde_json::from_str(expected_str).unwrap();

    ${paramDeclarations}
    
    let mut result = ${functionName}(${argList});

    println!("{}", json!({
        "result": result,
        "expected": expected
    }));
}
`;
        }
         case 'C++': {
            const paramKeys = Object.keys(testCase.input);
            const paramDeclarations = paramKeys.map(key => {
                const value = testCase.input[key];
                if (typeof value === 'number' && Number.isInteger(value)) {
                    return `int ${key} = ${value};`;
                }
                if (Array.isArray(value) && (value.length === 0 || value.every(item => typeof item === 'number'))) {
                    return `vector<int> ${key} = {${value.join(', ')}};`;
                }
                if (typeof value === 'string') {
                    return `string ${key} = "${value.replace(/"/g, '\\"').replace(/\\/g, '\\\\')}";`;
                }
                 return `// Type for ${key} not inferred`;
            }).join('\n    ');
            
            // For C++, we need to pass by reference for vectors
            const argList = paramKeys.join(', ');

            return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <unordered_map>

using namespace std;

namespace BasicJson {
    std::string serialize(int val) { return std::to_string(val); }
    std::string serialize(const std::string& val) { 
        std::string s = "\\\"";
        for (char c : val) {
            if (c == '"' || c == '\\\\') s += '\\\\';
            s += c;
        }
        s += "\\\"";
        return s;
    }
    std::string serialize(bool val) { return val ? "true" : "false"; }

    template<typename T>
    std::string serialize(const std::vector<T>& vec) {
        std::string s = "[";
        for (size_t i = 0; i < vec.size(); ++i) {
            s += serialize(vec[i]);
            if (i < vec.size() - 1) s += ",";
        }
        s += "]";
        return s;
    }
}

${userCode}

int main() {
    ${paramDeclarations}
    
    auto result = ${functionName}(${argList});

    std::cout << "{\\"result\\":" << BasicJson::serialize(result) 
              << ",\\"expected\\":" << R"JSON(${expectedJson})JSON" << "}" << std::endl;
              
    return 0;
}
`;
        }
        case 'C#': {
             let classWrapper = userCode;
             if (!userCode.includes("class")) {
                classWrapper = `public class Solution { ${userCode} }`;
             }

            const paramDeclarations = Object.keys(testCase.input).map(key => {
                const value = testCase.input[key];
                 if (typeof value === 'number' && Number.isInteger(value)) {
                    return `int ${key} = ${value};`;
                }
                if (Array.isArray(value) && (value.length === 0 || value.every(item => typeof item === 'number'))) {
                    return `int[] ${key} = new int[]{${value.join(', ')}};`;
                }
                if (typeof value === 'string') {
                    return `string ${key} = "${value.replace(/"/g, '\\"')}";`;
                }
                if (Array.isArray(value) && (value.length === 0 || value.every(item => typeof item === 'string'))) {
                    return `string[] ${key} = new string[]{${value.map(v => `"${v}"`).join(', ')}};`;
                }
                 return `// Type for ${key} not inferred`;
            }).join('\n        ');
             const argList = Object.keys(testCase.input).join(', ');

            return `
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Encodings.Web;

${classWrapper}

public class TestRunner {
    public static void Main() {
        var sol = new Solution();
        ${paramDeclarations}

        var result = sol.${functionName}(${argList});
        
        var expectedJson = @"${expectedJson.replace(/"/g, '""')}";

        var options = new JsonSerializerOptions { 
            WriteIndented = false,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };
        var resultJson = JsonSerializer.Serialize(result, options);
        
        Console.WriteLine($"{{\\"result\\":{resultJson},\\"expected\\":{expectedJson}}}");
    }
}
`;
        }
        default:
            return userCode;
    }
}


async function executePiston(
    code: string,
    language: ProgrammingLanguage
): Promise<{ stdout: string; stderr: string; code: number }> {
    const pistonLang = LANGUAGE_MAP[language];

    const files = [{
        content: code,
        name: language === 'Java' ? 'Main.java' : undefined
    }];
    if (files[0].name === undefined) {
        delete files[0].name;
    }

    try {
        const response = await fetch(`${PISTON_API_URL}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: pistonLang.language,
                version: pistonLang.version,
                files: files,
            }),
        });
        if (!response.ok) throw new Error(`Piston API error: ${response.status}`);
        const result = await response.json();
        return {
            stdout: result.run.stdout || '',
            stderr: result.run.stderr || '',
            code: result.run.code || 0,
        };
    } catch (error) {
        console.error('Piston API error:', error);
        throw error;
    }
}

const sandboxedEval = (code: string, context: any) => {
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);
    const func = new Function(...contextKeys, `"use strict"; ${code}`);
    return func(...contextValues);
};

export const runCode = async (
    userCode: string,
    testCases: TestCase[],
    solutionCode: string,
    language: ProgrammingLanguage = 'JavaScript'
): Promise<TestResult[]> => {
    if (language === 'JavaScript') {
        return runCodeClientSide(userCode, testCases, solutionCode);
    }
    return runCodePiston(userCode, testCases, solutionCode, language);
};

export interface CodeReview {
    score: number;
    strength: string;
    improvement: string;
    loading?: boolean;
    error?: string;
}

export const getAICodeReview = async (
    userCode: string,
    solutionCode: string,
    language: ProgrammingLanguage,
    testsPassed: boolean,
    challengeTitle: string
): Promise<CodeReview> => {
    const CURATOR_URL = (import.meta as any).env?.DEV
        ? 'http://localhost:8080'
        : 'https://codeswipe-curator-305149132359.europe-west1.run.app';

    try {
        const response = await fetch(`${CURATOR_URL}/api/reviewCode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userCode, solutionCode, language, testsPassed, challengeTitle }),
        });
        if (!response.ok) throw new Error(`Code review API error: ${response.status}`);
        const data = await response.json();
        return { score: data.score || 0, strength: data.strength || 'Code submitted.', improvement: data.improvement || 'Keep practicing!' };
    } catch (error) {
        console.error('AI Code Review error:', error);
        return {
            score: testsPassed ? 7 : 4,
            strength: testsPassed ? 'Your solution passes all test cases!' : 'Keep trying!',
            improvement: testsPassed ? 'Consider exploring edge cases.' : 'Review test failures and try again.',
            error: 'AI review temporarily unavailable',
        };
    }
};

function extractFunctionParams(code: string, functionName: string): string[] | null {
    const patterns = [
        new RegExp(`function\\s+${functionName}\\s*\\(([^)]*)\\)`),
        new RegExp(`const\\s+${functionName}\\s*=\\s*\\(([^)]*)\\)\\s*=>`),
        new RegExp(`let\\s+${functionName}\\s*=\\s*\\(([^)]*)\\)\\s*=>`),
        new RegExp(`var\\s+${functionName}\\s*=\\s*\\(([^)]*)\\)\\s*=>`),
    ];
    for (const pattern of patterns) {
        const match = code.match(pattern);
        if (match && match[1]) {
            return match[1].split(',').map(p => p.trim().split('=')[0].trim()).filter(p => p.length > 0);
        }
    }
    return null;
}

function runCodeClientSide(userCode: string, testCases: TestCase[], solutionCode: string): Promise<TestResult[]> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const results: TestResult[] = testCases.map(testCase => {
                    let actualOutput: any;
                    let passed = false;
                    let error: string | undefined;

                    try {
                        let functionNameMatch = userCode.match(/function\s+(\w+)/);
                        let codeToUse = userCode;
                        if (!functionNameMatch) {
                            functionNameMatch = solutionCode.match(/function\s+(\w+)/);
                            codeToUse = solutionCode;
                        }
                        if (!functionNameMatch) throw new Error("Could not determine function name.");
                        const functionName = functionNameMatch[1];
                        
                        let argsArray;
                        if (Array.isArray(testCase.input)) {
                            argsArray = testCase.input;
                        } else if (typeof testCase.input === 'object' && testCase.input !== null) {
                            const params = extractFunctionParams(codeToUse, functionName);
                            if (params && params.length > 0) {
                                argsArray = params.map(paramName => testCase.input[paramName]);
                            } else {
                                argsArray = Object.values(testCase.input);
                            }
                        } else {
                            argsArray = [testCase.input];
                        }
                        
                        const fullCode = `${userCode}\nreturn ${functionName}(...args);`;
                        actualOutput = sandboxedEval(fullCode, { args: argsArray });
                        passed = JSON.stringify(actualOutput) === JSON.stringify(testCase.expected);
                    } catch (e: any) {
                        actualOutput = e.message;
                        error = e.message;
                        passed = false;
                    }

                    return {
                        input: JSON.stringify(testCase.input),
                        expected: JSON.stringify(testCase.expected),
                        actual: JSON.stringify(actualOutput),
                        passed,
                        error,
                    };
                });
                resolve(results);
            } catch (e) {
                console.error("Evaluation error:", e);
                reject(new Error("Failed to execute code. Check for syntax errors."));
            }
        }, 1000);
    });
}

async function runCodePiston(
    userCode: string,
    testCases: TestCase[],
    solutionCode: string,
    language: ProgrammingLanguage
): Promise<TestResult[]> {
    let functionName = extractFunctionName(userCode, language);
    if (!functionName) functionName = extractFunctionName(solutionCode, language);
    if (!functionName) throw new Error(`Could not determine function name for ${language}`);

    const results: TestResult[] = [];

    for (const testCase of testCases) {
        try {
            const testRunner = generateTestRunner(userCode, functionName, testCase, language);
            const execution = await executePiston(testRunner, language);
            
            let actualOutput: any;
            let passed = false;

            if (execution.code === 0 && execution.stdout) {
                try {
                    const output = JSON.parse(execution.stdout.trim());
                    actualOutput = output.result;

                    const sortListOfLists = (list: any): any => {
                        if (!Array.isArray(list) || list.length === 0 || !Array.isArray(list[0])) {
                            return list;
                        }
                        try {
                             // Deep copy to avoid modifying original, then sort
                            const listCopy = JSON.parse(JSON.stringify(list));
                            listCopy.forEach((inner: any) => {
                                if (Array.isArray(inner)) {
                                    inner.sort((a,b) => String(a).localeCompare(String(b)));
                                }
                            });
                            listCopy.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
                            return listCopy;
                        } catch {
                            return list; // Return original list if sorting fails
                        }
                    };

                    let resultString = JSON.stringify(output.result);
                    let expectedString = JSON.stringify(output.expected);
                    
                    if (
                        Array.isArray(output.result) && (output.result.length === 0 || Array.isArray(output.result[0])) &&
                        Array.isArray(output.expected) && (output.expected.length === 0 || Array.isArray(output.expected[0]))
                    ) {
                        resultString = JSON.stringify(sortListOfLists(output.result));
                        expectedString = JSON.stringify(sortListOfLists(output.expected));
                    }


                    passed = resultString === expectedString;
                } catch(e) {
                    actualOutput = `Failed to parse output: ${execution.stdout.trim()}`;
                    passed = false;
                }
            } else {
                actualOutput = execution.stderr || 'Execution failed with no output.';
                passed = false;
            }

            results.push({
                input: JSON.stringify(testCase.input),
                expected: JSON.stringify(testCase.expected),
                actual: typeof actualOutput === 'string' ? actualOutput : JSON.stringify(actualOutput),
                passed,
            });
        } catch (error: any) {
            results.push({
                input: JSON.stringify(testCase.input),
                expected: JSON.stringify(testCase.expected),
                actual: `Error: ${error.message}`,
                passed: false,
            });
        }
    }

    return results;
}
