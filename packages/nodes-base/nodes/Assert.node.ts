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
						value: 'compareJSON',
						description: 'Compare JSON to input item.',
					},
					{
						name: 'Compare Binary',
						value: 'compareBinary',
						description: 'Compare binary data to input binary item.',
					},
				],
				default: 'compareJSON',
				description: 'Operation to perform.',
			},

			// ----------------------------------
			//         compare JSON
			// ----------------------------------
			{
				displayName: 'JSON',
				displayOptions: {
					show: {
						operation: [
							'compareJSON',
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
							'compareJSON',
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
							'compareJSON',
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
							'compareJSON',
						],
					},
				},
				name: 'compareValues',
				type: 'boolean',
				default: true,
				description: 'Ignore JSON values.',
				required: true,
			},
			// ----------------------------------
			//         compare Binary
			// ----------------------------------
			{
				displayName: 'File Data',
				displayOptions: {
					show: {
						operation: [
							'compareBinary',
						],
					},
				},
				name: 'data',
				type: 'string',
				default: '',
				placeholder: 'iVBORw0KGgoAAAANSUhEUgAAAdAAAABqCAMAAAA7p....',
				description: 'The file base64 encoded data',
				required: true,
			},
			{
				displayName: 'Property Name',
				displayOptions: {
					show: {
						operation: [
							'compareBinary',
						],
					},
				},
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				description: 'Name of the binary property containing the data.',
				required: true,
			},
			// ----------------------------------
			//         Options : compare Binary
			// ----------------------------------
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: [
							'compareBinary',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						default: '',
						placeholder: 'filename.extension',
						description: 'The file name.',
					},
					{
						displayName: 'File Extension',
						name: 'fileExtension',
						type: 'string',
						default: '',
						placeholder:'png',
						description: 'the file extension.',
					},
					{
						displayName: 'Mime Type',
						name: 'mimeType',
						type: 'string',
						default: '',
						placeholder:'image/png',
						description: 'The file mimetype.',
					},
				],
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
			const operation = this.getNodeParameter('operation', itemIndex) as string;
			const newItem:INodeExecutionData={json:{}};

			if (operation === 'compareJSON') {
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
			if (operation === 'compareBinary') {
				const data = this.getNodeParameter('data', itemIndex) as string;
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as string;				
				const options = this.getNodeParameter('options', itemIndex) as IDataObject;
				if (item.binary === undefined) {
					throw new Error('Item does not contain any binary data.');
				}
	
				if (item.binary[dataPropertyName as string] === undefined) {
					throw new Error(`Item does not contain any binary data with the name "${dataPropertyName}".`);
				}

				// comparing base64 data
				if(item.binary[dataPropertyName as string].data !== data){
					throw new Error(`Item binary data unmatched with the provided binary data.`);
				}

				// comparing the options
				Object.keys(options).forEach(key=> {					
					if(options[key as string] !== undefined && options[key as string] !== item.binary![dataPropertyName as string][key as string] ){
						throw new Error(`Item ${key as string} doesn't match`);
					}
				});
				
				newItem.json = {
					success: true,
				};
			}
			returnData.push(newItem);
		}
		return this.prepareOutputData(returnData);
	}
}