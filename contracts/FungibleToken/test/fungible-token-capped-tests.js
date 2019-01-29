const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const utils = require('./../../Utils/utils');
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const config = require("./constants/config.json");
const contractFilePath = "./../contracts/fungible-token-capped.aes";

const path = require('path');
const errorMessages = require('./constants/error-messages.json');

describe('Fungible Capped Token', () => {

	let firstClient;
	let contentOfContract;

	before(async () => {
		firstClient = await Universal({
			url: config.host,
			internalUrl: config.internalHost,
			keypair: config.ownerKeyPair,
			nativeMode: true,
			networkId: 'ae_devnet'
		});

		firstClient.setKeypair(config.ownerKeyPair)
		await firstClient.spend(1, config.notOwnerKeyPair.publicKey)

		contentOfContract = utils.readFileRelative(path.resolve(__dirname, contractFilePath), config.filesEncoding); 
	})

	describe('Deploy contract', () => {

		it('deploying successfully', async () => {
			//Arrange
			const cap = 100;
			const compiledContract = await firstClient.contractCompile(contentOfContract, {})

			//Act
			const deployPromise = compiledContract.deploy({
				initState: `(${cap})`,
				options: {
					ttl: config.ttl,
				},
				abi: "sophia"
			});
			
			const deployedContract = await deployPromise;

			const capPromise = deployedContract.call('cap', {
				options: {
					ttl: config.ttl,
				}
			});
			
			const capPromiseResult = await capPromise;

			//Assert
			const decodedCapPromiseResult = await capPromiseResult.decode("int");

			assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner);
			assert.equal(decodedCapPromiseResult.value, cap);
		})
	})

	describe('Contract functionality', () => {

		it('shoulnd`t mint over cap limit', async () => {
			//Arrange
			const cap = 100;
			const compiledContract = await firstClient.contractCompile(contentOfContract, {})

			//Act
			const deployPromise = compiledContract.deploy({
				initState: `(${cap})`,
				options: {
					ttl: config.ttl,
				},
				abi: "sophia"
			});

			const deployedContract = await deployPromise;

			const mintPromise = deployedContract.call('mint', {
				args: `(${config.pubKeyHex}, 1000)`,
				options: {
					ttl: config.ttl,
				},
				abi: "sophia"
			})

			//Assert
			await assert.isRejected(mintPromise, errorMessages.EXCEEDS_CAP);
		})
	})
})