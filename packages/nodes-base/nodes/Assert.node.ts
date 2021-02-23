import {
	IExecuteFunctions
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import { isEqual } from 'lodash';

export class Assert implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Assert',
		name: 'assert',
		icon: 'fa:check',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Assert node execution',
		defaults: {
			name: 'Assert',
			color: '#303050',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Compare JSON',
						value: 'compare',
						description: 'Compare JSON to input item.',
					},
				],
				default: 'compare',
				description: 'Operation to perform.',
			},

			// ----------------------------------
			//         compare
			// ----------------------------------
			{
				displayName: 'JSON',
				displayOptions: {
					show: {
						operation: [
							'compare',
						],
					},
				},
				name: 'json',
				type: 'json',
				default: '',
				description: 'The JSON data to be compared to.',
				required: true,
			},
			{
				displayName: 'Ignore Extra Keys',
				displayOptions: {
					show: {
						operation: [
							'compare',
						],
					},
				},
				name: 'extraKeys',
				type: 'boolean',
				default: true,
				description: 'Ignore extra JSON keys.',
				required: true,
			},
			{
				displayName: 'Ignore Missing Keys',
				displayOptions: {
					show: {
						operation: [
							'compare',
						],
					},
				},
				name: 'missingKeys',
				type: 'boolean',
				default: false,
				description: 'Ignore missing JSON keys.',
				required: true,
			},
			{
				displayName: 'Ignore Values',
				displayOptions: {
					show: {
						operation: [
							'compare',
						],
					},
				},
				name: 'compareValues',
				type: 'boolean',
				default: true,
				description: 'Ignore JSON values.',
				required: true,
			},

			
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length as unknown as number;
		
		let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < length; itemIndex++) {
			item = items[itemIndex];
			const action = this.getNodeParameter('operation', itemIndex) as string;
			const newItem:INodeExecutionData={json:{}};

			if (action === 'compare') {
				const json = JSON.parse(this.getNodeParameter('json', itemIndex) as string) as IDataObject;
				const isExtraIgnored = this.getNodeParameter('extraKeys', itemIndex) as boolean;
				const isMissingIgnored = this.getNodeParameter('missingKeys', itemIndex) as boolean;
				const isValueIgnored = this.getNodeParameter('compareValues', itemIndex) as boolean;
				
				// Compare the keys 
				const inputKeys = Object.keys(json);
				const itemKeys = Object.keys(item.json);

				const missingKeys = inputKeys.filter(key => itemKeys.indexOf(key)===-1);
				
				if(!isMissingIgnored && missingKeys.length !==0 ){
					throw new Error(`Item misses keys [${missingKeys}]`);
				}
				const extraKeys = itemKeys.filter(key => inputKeys.indexOf(key)===-1);

				if(!isExtraIgnored && extraKeys.length !==0 ){
					throw new Error(`Item contains extra keys [${extraKeys}]`);
				}
				
				// Compare the values
				const missmatchedValuesKeys = inputKeys.filter(key => {
					return extraKeys.indexOf(key)===-1 &&
						missingKeys.indexOf(key)===-1 &&
						!isEqual(json[key],item.json[key]); 
				});

				if(!isValueIgnored && missmatchedValuesKeys.length !== 0){
					throw new Error(`Item contains wrong values for those keys [${missmatchedValuesKeys}]`);
				}
				
				newItem.json = {
					missingKeys,
					extraKeys,
					missmatchedValuesKeys,
				};
			}
			returnData.push(newItem);
		}
		return this.prepareOutputData(returnData);
	}
}