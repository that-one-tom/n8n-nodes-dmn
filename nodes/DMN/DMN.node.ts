import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
	ApplicationError,
} from 'n8n-workflow';

interface DecisionRule {
	id: string;
	input: Array<{
		column: string;
		operator: string;
		value: any;
	}>;
	output: Array<{
		column: string;
		value: any;
	}>;
	priority?: number;
	annotation?: string;
}

interface DecisionTable {
	hitPolicy: string;
	aggregation?: string;
	rules: DecisionRule[];
	inputColumns: Array<{
		name: string;
		type: string;
		expression?: string;
	}>;
	outputColumns: Array<{
		name: string;
		type: string;
		defaultValue?: any;
	}>;
}

export class DMN implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DMN Decision Table',
		name: 'dmn',
		icon: 'file:dmn.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Evaluate data using DMN decision tables',
		defaults: {
			name: 'DMN Decision Table',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Evaluate',
						value: 'evaluate',
						description: 'Evaluate items against a decision table',
						action: 'Evaluate decision table',
					},
					{
						name: 'Build Table',
						value: 'buildTable',
						description: 'Build a decision table from configuration',
						action: 'Build decision table',
					},
				],
				default: 'evaluate',
			},
			{
				displayName: 'Hit Policy',
				name: 'hitPolicy',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['evaluate', 'buildTable'],
					},
				},
				options: [
					{
						name: 'Any',
						value: 'ANY',
						description: 'Multiple rules can match, but they all have the same output',
					},
					{
						name: 'Collect',
						value: 'COLLECT',
						description: 'Return all matching rules',
					},
					{
						name: 'First',
						value: 'FIRST',
						description: 'Return the first matching rule in the order of the decision table',
					},
					{
						name: 'Output Order',
						value: 'OUTPUT_ORDER',
						description: 'Return all matching rules sorted by their output values',
					},
					{
						name: 'Priority',
						value: 'PRIORITY',
						description: 'Return the matching rule with the highest priority',
					},
					{
						name: 'Rule Order',
						value: 'RULE_ORDER',
						description: 'Return all matching rules in the order they appear',
					},
					{
						name: 'Unique',
						value: 'UNIQUE',
						description: 'No overlap is possible and rules are disjoint. Only one rule can match.',
					},
				],
				default: 'UNIQUE',
				description: 'How to handle multiple matching rules (DMN 1.3 hit policy)',
			},
			{
				displayName: 'Aggregation',
				name: 'aggregation',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['evaluate', 'buildTable'],
						hitPolicy: ['COLLECT'],
					},
				},
				options: [
					{
						name: 'Count',
						value: 'COUNT',
						description: 'Count of matching rules',
					},
					{
						name: 'Max',
						value: 'MAX',
						description: 'Maximum value',
					},
					{
						name: 'Min',
						value: 'MIN',
						description: 'Minimum value',
					},
					{
						name: 'None',
						value: 'NONE',
						description: 'Return all results',
					},
					{
						name: 'Sum',
						value: 'SUM',
						description: 'Sum of all outputs',
					},
				],
				default: 'NONE',
				description: 'Aggregation function for COLLECT hit policy',
			},
			{
				displayName: 'Input Columns',
				name: 'inputColumns',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['evaluate', 'buildTable'],
					},
				},
				default: {},
				placeholder: 'Add Input Column',
				options: [
					{
						name: 'columns',
						displayName: 'Input Column',
						values: [
							{
								displayName: 'Column Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the input column',
								required: true,
							},
							{
								displayName: 'Data Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'String',
										value: 'string',
									},
									{
										name: 'Number',
										value: 'number',
									},
									{
										name: 'Boolean',
										value: 'boolean',
									},
									{
										name: 'Date',
										value: 'date',
									},
								],
								default: 'string',
								description: 'Data type of the input column',
							},
							{
								displayName: 'Expression',
								name: 'expression',
								type: 'string',
								default: '',
								description: 'Optional FEEL expression for input transformation',
								placeholder: 'e.g., item.price * 1.1',
							},
						],
					},
				],
			},
			{
				displayName: 'Output Columns',
				name: 'outputColumns',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['evaluate', 'buildTable'],
					},
				},
				default: {},
				placeholder: 'Add Output Column',
				options: [
					{
						name: 'columns',
						displayName: 'Output Column',
						values: [
							{
								displayName: 'Column Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the output column',
								required: true,
							},
							{
								displayName: 'Data Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'String',
										value: 'string',
									},
									{
										name: 'Number',
										value: 'number',
									},
									{
										name: 'Boolean',
										value: 'boolean',
									},
									{
										name: 'Date',
										value: 'date',
									},
								],
								default: 'string',
								description: 'Data type of the output column',
							},
							{
								displayName: 'Default Value',
								name: 'defaultValue',
								type: 'string',
								default: '',
								description: 'Default value if no rule matches',
							},
						],
					},
				],
			},
			{
				displayName: 'Decision Rules',
				name: 'rules',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['evaluate', 'buildTable'],
					},
				},
				default: {},
				placeholder: 'Add Rule',
				options: [
					{
						name: 'rule',
						displayName: 'Rule',
						values: [
							{
						displayName: 'Annotation',
						name: 'annotation',
						type: 'string',
						default: '',
						description: 'Optional description or comment for the rule',
							},
							{
						displayName: 'Input Conditions',
						name: 'conditions',
						type: 'string',
						default: '{}',
						description: 'JSON object defining input conditions',
						placeholder: '{\'age\': ">=	18\', \'country\': \'US\'}',
							},
							{
						displayName: 'Output Values',
						name: 'outputs',
						type: 'string',
						default: '{}',
						description: 'JSON object defining output values',
						placeholder: '{\'discount\':	0.1, \'eligible\':	true}',
							},
							{
						displayName: 'Priority',
						name: 'priority',
						type: 'number',
						default: 0,
						description: 'Priority for PRIORITY hit policy (higher number	=	higher priority)',
							},
							{
						displayName: 'Rule ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'Unique identifier for the rule',
						placeholder: 'rule_1',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['evaluate'],
					},
				},
				options: [
					{
						displayName: 'Strict Mode',
						name: 'strictMode',
						type: 'boolean',
						default: false,
						description: 'Whether to fail if no rules match (otherwise returns defaults)',
					},
					{
						displayName: 'Include Metadata',
						name: 'includeMetadata',
						type: 'boolean',
						default: false,
						description: 'Whether to include rule metadata in output',
					},
					{
						displayName: 'Trace Execution',
						name: 'traceExecution',
						type: 'boolean',
						default: false,
						description: 'Whether to include execution trace for debugging',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'evaluate') {
			const hitPolicy = this.getNodeParameter('hitPolicy', 0) as string;
			const aggregation = this.getNodeParameter('aggregation', 0, 'NONE') as string;
			const options = this.getNodeParameter('options', 0, {}) as any;

			// Build decision table from parameters
			const decisionTable = buildDecisionTable.call(this);

			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const item = items[itemIndex];
					const evaluationResult = evaluateDecisionTable.call(
						this,
						item.json,
						decisionTable,
						hitPolicy,
						aggregation,
						options
					);

					returnData.push({
						json: evaluationResult,
						pairedItem: { item: itemIndex },
					});
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error instanceof Error ? error.message : String(error),
							},
							pairedItem: { item: itemIndex },
						});
						continue;
					}
					throw new NodeOperationError(this.getNode(), error instanceof Error ? error.message : String(error), { itemIndex });
				}
			}
		} else if (operation === 'buildTable') {
			// Return the decision table configuration as output
			const decisionTable = buildDecisionTable.call(this);
			returnData.push({
				json: decisionTable as any,
			});
		}

		return [returnData];
	}
}

// Helper functions outside the class
function buildDecisionTable(this: IExecuteFunctions): DecisionTable {
		// Get input columns
		const inputColumnsData = this.getNodeParameter('inputColumns', 0) as any;
		const inputColumns = inputColumnsData.columns || [];

		// Get output columns
		const outputColumnsData = this.getNodeParameter('outputColumns', 0) as any;
		const outputColumns = outputColumnsData.columns || [];

		// Get rules
		const rulesData = this.getNodeParameter('rules', 0) as any;
		const rulesConfig = rulesData.rule || [];

		// Parse and build rules
		const rules: DecisionRule[] = rulesConfig.map((ruleConfig: any, index: number) => {
			let conditions = {};
			let outputs = {};

			try {
				conditions = typeof ruleConfig.conditions === 'string' 
					? JSON.parse(ruleConfig.conditions)
					: ruleConfig.conditions;
			} catch (e) {
				throw new ApplicationError(`Invalid JSON in rule ${index + 1} conditions: ${e instanceof Error ? e.message : String(e)}`);
			}

			try {
				outputs = typeof ruleConfig.outputs === 'string'
					? JSON.parse(ruleConfig.outputs)
					: ruleConfig.outputs;
			} catch (e) {
				throw new ApplicationError(`Invalid JSON in rule ${index + 1} outputs: ${e instanceof Error ? e.message : String(e)}`);
			}

			// Convert conditions to input array format
			const input = Object.entries(conditions).map(([column, value]) => {
				const { operator, operand } = parseCondition.call(this, value);
				return { column, operator, value: operand };
			});

			// Convert outputs to output array format
			const output = Object.entries(outputs).map(([column, value]) => ({
				column,
				value,
			}));

			return {
				id: ruleConfig.id || `rule_${index + 1}`,
				input,
				output,
				priority: ruleConfig.priority,
				annotation: ruleConfig.annotation,
			};
		});

	return {
		hitPolicy: this.getNodeParameter('hitPolicy', 0) as string,
		aggregation: this.getNodeParameter('aggregation', 0, 'NONE') as string,
		rules,
		inputColumns,
		outputColumns,
	};
}

function parseCondition(this: IExecuteFunctions, condition: any): { operator: string; operand: any } {
	if (typeof condition === 'string') {
		// Trim the condition first
		condition = condition.trim();
		
		// Parse FEEL-like expressions
		// IMPORTANT: Check longer patterns first to avoid partial matches
		const patterns = [
			{ regex: /^not\s*in\s*\((.+)\)$/, operator: 'not in' },
			{ regex: /^in\s*\((.+)\)$/, operator: 'in' },
			{ regex: /^\[(.+)\.\.(.+)\]$/, operator: 'between' },
			{ regex: /^<=\s*(.+)$/, operator: '<=' },
			{ regex: /^>=\s*(.+)$/, operator: '>=' },
			{ regex: /^!=\s*(.+)$/, operator: '!=' },
			{ regex: /^<\s*(.+)$/, operator: '<' },
			{ regex: /^>\s*(.+)$/, operator: '>' },
			{ regex: /^=\s*(.+)$/, operator: '=' },
			{ regex: /^-$/, operator: 'any' },
		];

		for (const pattern of patterns) {
			const match = condition.match(pattern.regex);
			if (match) {
				if (pattern.operator === 'between') {
					const start = parseValue.call(this, match[1].trim());
					const end = parseValue.call(this, match[2].trim());
					return { operator: 'between', operand: [start, end] };
				} else if (pattern.operator === 'in' || pattern.operator === 'not in') {
					const values = match[1].split(',').map((v: string) => {
						const trimmed = v.trim();
						return parseValue.call(this, trimmed);
					});
					return { operator: pattern.operator, operand: values };
				} else if (pattern.operator === 'any') {
					return { operator: 'any', operand: null };
				} else {
					const value = match[1].trim();
					return { operator: pattern.operator, operand: parseValue.call(this, value) };
				}
			}
		}

		// Default: exact match
		return { operator: '=', operand: parseValue.call(this, condition) };
		}

	// If not a string, treat as exact match
	return { operator: '=', operand: condition };
}

function parseValue(this: IExecuteFunctions, value: string): any {
	// Remove surrounding quotes first if present
	if ((value.startsWith('"') && value.endsWith('"')) || 
		(value.startsWith("'") && value.endsWith("'"))) {
		return value.slice(1, -1);
	}
	
	// Try to parse as number
	if (/^-?\d+(\.\d+)?$/.test(value)) {
		return parseFloat(value);
	}
	
	// Try to parse as boolean
	if (value === 'true') return true;
	if (value === 'false') return false;
	
	// Return as string
	return value;
}

function evaluateDecisionTable(
		this: IExecuteFunctions,
		inputData: any,
		decisionTable: DecisionTable,
		hitPolicy: string,
		aggregation: string,
		options: any
	): any {
		const matchingRules: Array<{ rule: DecisionRule; outputs: any }> = [];

	// Evaluate each rule
	for (const rule of decisionTable.rules) {
		if (evaluateRule.call(this, inputData, rule, decisionTable.inputColumns)) {
			const outputs = generateOutputs.call(this, rule, decisionTable.outputColumns);
				matchingRules.push({ rule, outputs });
			}
		}

		// Apply hit policy
		let result: any = {};
		const includeMetadata = options.includeMetadata || false;
		const traceExecution = options.traceExecution || false;

		switch (hitPolicy) {
			case 'UNIQUE':
				if (matchingRules.length > 1) {
					throw new ApplicationError(`UNIQUE hit policy violated: ${matchingRules.length} rules matched`);
				}
			result = matchingRules.length === 1 ? matchingRules[0].outputs : getDefaultOutputs.call(this, decisionTable.outputColumns);
				break;

		case 'FIRST':
			result = matchingRules.length > 0 ? matchingRules[0].outputs : getDefaultOutputs.call(this, decisionTable.outputColumns);
				break;

			case 'PRIORITY':
				if (matchingRules.length > 0) {
					const sorted = matchingRules.sort((a, b) => (b.rule.priority || 0) - (a.rule.priority || 0));
					result = sorted[0].outputs;
			} else {
				result = getDefaultOutputs.call(this, decisionTable.outputColumns);
			}
				break;

			case 'ANY':
				if (matchingRules.length > 0) {
					// Verify all matching rules have the same output
					const firstOutput = JSON.stringify(matchingRules[0].outputs);
					const allSame = matchingRules.every(m => JSON.stringify(m.outputs) === firstOutput);
					if (!allSame) {
						throw new ApplicationError('ANY hit policy violated: matching rules have different outputs');
					}
					result = matchingRules[0].outputs;
			} else {
				result = getDefaultOutputs.call(this, decisionTable.outputColumns);
			}
			break;

			case 'COLLECT':
			case 'RULE_ORDER':
			case 'OUTPUT_ORDER': {
				if (hitPolicy === 'OUTPUT_ORDER') {
					// Sort by output values
					matchingRules.sort((a, b) => {
						const aStr = JSON.stringify(a.outputs);
						const bStr = JSON.stringify(b.outputs);
						return aStr.localeCompare(bStr);
					});
				}

				const allOutputs = matchingRules.map(m => m.outputs);

				// Apply aggregation if COLLECT
				if (hitPolicy === 'COLLECT' && aggregation !== 'NONE') {
					result = applyAggregation.call(this, allOutputs, aggregation, decisionTable.outputColumns);
				} else {
					result = { results: allOutputs };
				}
				break;
			}

			default:
				throw new ApplicationError(`Unknown hit policy: ${hitPolicy}`);
		}

		// Add metadata if requested
		if (includeMetadata) {
			result._metadata = {
				hitPolicy,
				aggregation,
				matchedRules: matchingRules.map(m => ({
					id: m.rule.id,
					annotation: m.rule.annotation,
				})),
				matchCount: matchingRules.length,
			};
		}

		// Add trace if requested
		if (traceExecution) {
			result._trace = {
				evaluatedRules: decisionTable.rules.length,
				matchingRules: matchingRules.map(m => m.rule.id),
				inputData,
			};
		}

		// Handle strict mode
		if (options.strictMode && matchingRules.length === 0) {
			throw new ApplicationError('No rules matched in strict mode');
		}

	return result;
}

function evaluateRule(this: IExecuteFunctions, inputData: any, rule: DecisionRule, inputColumns: any[]): boolean {
	for (const condition of rule.input) {
		const inputValue = getInputValue.call(this, inputData, condition.column, inputColumns);
		
		if (!evaluateCondition.call(this, inputValue, condition.operator, condition.value)) {
			return false;
		}
	}
	return true;
}

function getInputValue(this: IExecuteFunctions, inputData: any, columnName: string, inputColumns: any[]): any {
	const column = inputColumns.find(c => c.name === columnName);
	
	if (column && column.expression) {
		// Evaluate FEEL expression (simplified)
		return evaluateExpression.call(this, column.expression, inputData);
		}
		
	return inputData[columnName];
}

function evaluateExpression(this: IExecuteFunctions, expression: string, context: any): any {
		// Simplified FEEL expression evaluation
		// In a production system, you'd want a proper FEEL parser
		try {
			// Replace context references
			let evaluableExpression = expression;
			Object.keys(context).forEach(key => {
				const regex = new RegExp(`\\b${key}\\b`, 'g');
				evaluableExpression = evaluableExpression.replace(regex, JSON.stringify(context[key]));
			});
			
			// Basic math operations (be careful with eval in production!)
			// This is simplified - a real implementation would use a proper expression parser
			return Function('"use strict"; return (' + evaluableExpression + ')')();
		} catch (e) {
		return null;
	}
}

function evaluateCondition(this: IExecuteFunctions, inputValue: any, operator: string, operand: any): boolean {
		switch (operator) {
			case '=':
				return inputValue == operand;
			case '!=':
				return inputValue != operand;
			case '<':
				return inputValue < operand;
			case '<=':
				return inputValue <= operand;
			case '>':
				return inputValue > operand;
			case '>=':
				return inputValue >= operand;
			case 'between':
				return inputValue >= operand[0] && inputValue <= operand[1];
			case 'in':
				return Array.isArray(operand) && operand.includes(inputValue);
			case 'not in':
				return Array.isArray(operand) && !operand.includes(inputValue);
			case 'any':
				return true;
		default:
			return false;
	}
}

function generateOutputs(this: IExecuteFunctions, rule: DecisionRule, outputColumns: any[]): any {
		const outputs: any = {};
		
		for (const output of rule.output) {
			const column = outputColumns.find(c => c.name === output.column);
			let value = output.value;
			
			// Type conversion based on column type
			if (column) {
				switch (column.type) {
					case 'number':
						value = Number(value);
						break;
					case 'boolean':
						value = Boolean(value);
						break;
					case 'date':
						value = new Date(value);
						break;
				}
			}
			
			outputs[output.column] = value;
		}
		
		// Add default values for missing outputs
		for (const column of outputColumns) {
			if (!(column.name in outputs) && column.defaultValue !== undefined) {
				outputs[column.name] = column.defaultValue;
			}
		}
		
	return outputs;
}

function getDefaultOutputs(this: IExecuteFunctions, outputColumns: any[]): any {
		const outputs: any = {};
		
		for (const column of outputColumns) {
			if (column.defaultValue !== undefined) {
				outputs[column.name] = column.defaultValue;
			}
		}
		
	return outputs;
}

function applyAggregation(this: IExecuteFunctions, outputs: any[], aggregation: string, outputColumns: any[]): any {
		if (outputs.length === 0) {
			return {};
		}

		switch (aggregation) {
			case 'COUNT':
				return { count: outputs.length };
				
			case 'SUM':
			case 'MIN':
			case 'MAX': {
				const result: any = {};
				
				for (const column of outputColumns) {
					if (column.type === 'number') {
						const values = outputs.map(o => o[column.name]).filter(v => v !== undefined);
						
						if (values.length > 0) {
							switch (aggregation) {
								case 'SUM':
									result[column.name] = values.reduce((a, b) => a + b, 0);
									break;
								case 'MIN':
									result[column.name] = Math.min(...values);
									break;
								case 'MAX':
									result[column.name] = Math.max(...values);
									break;
							}
						}
					}
				}
				
				return result;
			}
				
			default:
				return { results: outputs };
		}
}
