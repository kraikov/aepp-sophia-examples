const fs = require('fs');
const path = require('path');
const Crypto = require('@aeternity/aepp-sdk').Crypto;
const toBytes = require('@aeternity/aepp-sdk/es/utils/bytes').toBytes;

const NETWORK_ID = 'ae_devnet';
const ABI = 'sophia';
const COMPILER_HTTP_ADDRESS = 'https://compiler.aepps.com';

const DEFAULT_MAX_GAS = 900000000000001;

const readFile = (path, encoding = null, errTitle = 'READ FILE ERR') => {
	try {
		return fs.readFileSync(
			path,
			encoding
		)
	} catch (e) {
		console.log(e);
		switch (e.code) {
			case 'ENOENT':
				throw new Error('File not found', e)
				break
			default:
				throw e
		}
	}
}

const writeFile = (path, content) => {
	fs.writeFileSync(path, content);
}

const writeFileRelative = async (relativePath, content = null) => {
	return writeFile(path.resolve(process.cwd(), relativePath), content);
}

const readFileRelative = (relativePath, encoding = null, errTitle = 'READ FILE ERR') => {
	return readFile(path.resolve(process.cwd(), relativePath), encoding, errTitle);
}

const fileExists = (relativePath) => {
	return fs.existsSync(path.resolve(process.cwd(), relativePath));
}

const trimAddresses = (addressToTrim) => {
	return addressToTrim.substring(3)
}

const getDeployedContractInstance = async function (Universal, clientConfig, contractSource, initState = []) {

	client = await getAEClient(Universal, clientConfig, clientConfig.ownerKeyPair);

	let compiledContract = await client.contractCompile(contractSource);


	let contractObject = await client.getContractInstance(contractSource);
	await contractObject.compile();
	deployedContract = await contractObject.deploy(initState);

	let result = {
		deployedContract,
		compiledContract
	}

	return result;
};

// args that you pass, should be something like this => `("${INIT_CONTRACT_NAME}", ${INIT_AGE})`
const executeSmartContractFunction = async function (deployedContract, functionName, args = [], options = {}) {

	let result = await deployedContract.call(functionName, args, options);
	return result;
}

const executeSmartContractFunctionFromAnotherClient = async function (clientConfiguration, functionName, args, amount = 0, ttl = 345345, gas = DEFAULT_MAX_GAS) {

	let configuration = {
		options: {
			ttl: ttl,
			amount: amount
		},
		abi: ABI,
	};

	if (args) {
		configuration.args = args
	}

	let result = await clientConfiguration.client.contractCall(clientConfiguration.byteCode, 'sophia', clientConfiguration.contractAddress, functionName, configuration);

	return result;
}

const getClient = async function (Universal, clientConfig, keyPair) {
	let client = await Universal({
		url: clientConfig.host,
		internalUrl: clientConfig.internalHost,
		keypair: keyPair,
		nativeMode: true,
		networkId: NETWORK_ID,
		compilerUrl: COMPILER_HTTP_ADDRESS
	});

	return client;
}

function publicKeyToHex(publicKey) {
	let byteArray = Crypto.decodeBase58Check(publicKey.split('_')[1]);
	let asHex = '#' + byteArray.toString('hex');
	return asHex;
}

module.exports = {
	readFile,
	readFileRelative,
	writeFileRelative,
	fileExists,
	trimAddresses,
	getDeployedContractInstance,
	executeSmartContractFunction,
	publicKeyToHex,
	getClient,
	executeSmartContractFunctionFromAnotherClient
}