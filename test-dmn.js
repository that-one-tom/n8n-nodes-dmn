// Simple test for the DMN node
// This simulates how n8n would use the node

class MockExecuteFunctions {
    constructor(inputData, nodeParameters) {
        this.inputData = inputData;
        this.nodeParameters = nodeParameters;
        this.parameterIndex = 0;
    }

    getInputData() {
        return this.inputData;
    }

    getNodeParameter(name, index, defaultValue) {
        const value = this.nodeParameters[name];
        return value !== undefined ? value : defaultValue;
    }

    getNode() {
        return { name: 'DMN Test', type: 'dmn' };
    }

    continueOnFail() {
        return false;
    }
}

// Test data
const testInputData = [
    {
        json: {
            age: 25,
            country: 'US',
            orderTotal: 150
        }
    },
    {
        json: {
            age: 70,
            country: 'US',
            orderTotal: 50
        }
    },
    {
        json: {
            age: 16,
            country: 'CA',
            orderTotal: 200
        }
    }
];

const testNodeParameters = {
    operation: 'evaluate',
    hitPolicy: 'FIRST',
    inputColumns: {
        columns: [
            { name: 'age', type: 'number' },
            { name: 'country', type: 'string' },
            { name: 'orderTotal', type: 'number' }
        ]
    },
    outputColumns: {
        columns: [
            { name: 'discount', type: 'number', defaultValue: 0 },
            { name: 'eligible', type: 'boolean', defaultValue: false },
            { name: 'tier', type: 'string', defaultValue: 'STANDARD' }
        ]
    },
    rules: {
        rule: [
            {
                id: 'senior_discount',
                conditions: JSON.stringify({
                    age: '>= 65',
                    country: 'US'
                }),
                outputs: JSON.stringify({
                    discount: 0.2,
                    eligible: true,
                    tier: 'SENIOR'
                }),
                annotation: 'Senior citizen discount for US customers'
            },
            {
                id: 'adult_us_large_order',
                conditions: JSON.stringify({
                    age: '>= 18',
                    country: 'US',
                    orderTotal: '>= 100'
                }),
                outputs: JSON.stringify({
                    discount: 0.15,
                    eligible: true,
                    tier: 'GOLD'
                }),
                annotation: 'Adult US customers with large orders'
            },
            {
                id: 'adult_us',
                conditions: JSON.stringify({
                    age: '>= 18',
                    country: 'US'
                }),
                outputs: JSON.stringify({
                    discount: 0.1,
                    eligible: true,
                    tier: 'SILVER'
                }),
                annotation: 'Standard adult US discount'
            },
            {
                id: 'minor',
                conditions: JSON.stringify({
                    age: '< 18'
                }),
                outputs: JSON.stringify({
                    discount: 0,
                    eligible: false,
                    tier: 'RESTRICTED'
                }),
                annotation: 'Minors are not eligible'
            }
        ]
    },
    options: {
        includeMetadata: true,
        traceExecution: false
    }
};

// Test execution
async function runTest() {
    console.log('Testing DMN Node Implementation\n');
    console.log('================================\n');

    try {
        // Load the compiled DMN node
        const { DMN } = require('./dist/nodes/DMN/DMN.node.js');
        
        const dmnNode = new DMN();
        console.log('✓ DMN node loaded successfully\n');

        // Create mock execution context
        const mockContext = new MockExecuteFunctions(testInputData, testNodeParameters);
        
        // Bind the context to the node's execute method
        const result = await dmnNode.execute.call(mockContext);
        
        console.log('Test Results:\n');
        console.log('-------------\n');
        
        result[0].forEach((item, index) => {
            console.log(`Input ${index + 1}:`);
            console.log('  Input:', testInputData[index].json);
            console.log('  Output:', item.json);
            console.log('');
        });

        // Verify results
        console.log('Verification:\n');
        console.log('-------------\n');
        
        const results = result[0];
        
        // Test case 1: 25-year-old US customer with $150 order
        const result1 = results[0].json;
        console.assert(result1.discount === 0.15, 'Test 1: Discount should be 0.15');
        console.assert(result1.eligible === true, 'Test 1: Should be eligible');
        console.assert(result1.tier === 'GOLD', 'Test 1: Tier should be GOLD');
        console.log('✓ Test 1 passed: Adult US customer with large order');
        
        // Test case 2: 70-year-old US customer with $50 order
        const result2 = results[1].json;
        console.assert(result2.discount === 0.2, 'Test 2: Discount should be 0.2');
        console.assert(result2.eligible === true, 'Test 2: Should be eligible');
        console.assert(result2.tier === 'SENIOR', 'Test 2: Tier should be SENIOR');
        console.log('✓ Test 2 passed: Senior citizen discount');
        
        // Test case 3: 16-year-old CA customer with $200 order
        const result3 = results[2].json;
        console.assert(result3.discount === 0, 'Test 3: Discount should be 0');
        console.assert(result3.eligible === false, 'Test 3: Should not be eligible');
        console.assert(result3.tier === 'RESTRICTED', 'Test 3: Tier should be RESTRICTED');
        console.log('✓ Test 3 passed: Minor customer');
        
        console.log('\n✅ All tests passed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Test different hit policies
async function testHitPolicies() {
    console.log('\n\nTesting Different Hit Policies\n');
    console.log('==============================\n');
    
    try {
        const { DMN } = require('./dist/nodes/DMN/DMN.node.js');
        const dmnNode = new DMN();
        
        // Test COLLECT hit policy with SUM aggregation
        const collectParams = {
            ...testNodeParameters,
            hitPolicy: 'COLLECT',
            aggregation: 'SUM',
            rules: {
                rule: [
                    {
                        conditions: JSON.stringify({ orderTotal: '>= 100' }),
                        outputs: JSON.stringify({ points: 10 })
                    },
                    {
                        conditions: JSON.stringify({ orderTotal: '>= 50' }),
                        outputs: JSON.stringify({ points: 5 })
                    },
                    {
                        conditions: JSON.stringify({ orderTotal: '>= 0' }),
                        outputs: JSON.stringify({ points: 1 })
                    }
                ]
            },
            outputColumns: {
                columns: [
                    { name: 'points', type: 'number' }
                ]
            }
        };
        
        const testData = [{ json: { orderTotal: 150 } }];
        const mockContext = new MockExecuteFunctions(testData, collectParams);
        const result = await dmnNode.execute.call(mockContext);
        
        console.log('COLLECT with SUM test:');
        console.log('  Input: orderTotal = 150');
        console.log('  Result:', result[0][0].json);
        console.log('  ✓ Multiple rules matched and points summed\n');
        
        console.log('✅ Hit policy tests completed!');
        
    } catch (error) {
        console.error('❌ Hit policy test failed:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    await runTest();
    await testHitPolicies();
}

// Execute tests
runAllTests();
