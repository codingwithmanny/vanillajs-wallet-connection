// Constants
// ========================================================
/**
 * To keep track of which wallet is connected throughout our app
 */
let WALLET_CONNECTED = '';

/**
 * localStorage key
 */
let WALLET_CONNECTION_PREF_KEY = 'WC_PREF';

/**
 * Current chain connected with chain id and name as a object { id: 1, name: "Ethereum Mainnet" }
 */
const CHAIN_CONNECTED = {
    id: null,
    name: null
};

/**
 * Chain ids and their names
 */
const CHAIN_DICTIONARY = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    137: 'Polygon Mainnet',
    1337: 'Localhost',
    1402: 'zkEVM Testnet',
    80001: 'Mumbai Testnet',
    11155111: 'Sepolia Testnet'
};

/**
 * Required chain to interact with contract
 */
const CHAIN_ID_REQUIRED = 80001; //Mumbai

/**
 * Same contract deployed to each network
 */
const CONTRACT_ON_CHAINS = {
    1: '0x76460E73eadE1DDe315E07a5eCa092448c193a2F',
    5: '0x3aC587078b344a3d27e56632dFf236F1Aff04D56',
    137: '0x375F01b156D9BdDDd41fd38c5CC74C514CB71f73',
    1337: '',
    1402: '0x76460E73eadE1DDe315E07a5eCa092448c193a2F',
    80001: '0x7Bd54062eFa363A97dC20f404825597455E93582',
    11155111: '0x375f01b156d9bdddd41fd38c5cc74c514cb71f73',
};

/**
 * All blockchain explorers
 */
const BLOCKCHAIN_EXPLORERS = {
    1: 'https://etherscan.io',
    5: 'https://goerli.etherscan.io',
    137: 'https://polygonscan.com',
    1337: null,
    1402: 'https://explorer.public.zkevm-test.net',
    80001: 'https://mumbai.polygonscan.com',
    11155111: 'https://sepolia.etherscan.io',
};

/**
 * ABI needed to interpret how to interact with the contract
 */
const CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_greeting",
                "type": "string"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "message",
                "type": "string"
            }
        ],
        "name": "NewGreeting",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "getGreeting",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_greeting",
                "type": "string"
            }
        ],
        "name": "setGreeting",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Functions
// ========================================================
/**
 * Helper function that converts hex values to strings
 * @param {*} hex 
 * @returns 
 */
const hex2ascii = (hex) => {
    console.group('hex2ascii');
    console.log({ hex });
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        const v = parseInt(hex.substr(i, 2), 16);
        if (v) str += String.fromCharCode(v);
    }
    console.groupEnd();
    return str;
};

/**
 * When the chainId has changed
 * @param {string|null} chainId
 */
const onChainChanged = (chainId) => {
    console.group('onChainChanged');
    console.log({ chainId });

    // Get the UI element that displays the wallet network
    const preWalletNetwork = document.getElementById('pre-wallet-network');

    if (!chainId) {
        CHAIN_CONNECTED.name = null;
        CHAIN_CONNECTED.id = null;

        // Set the network to blank
        preWalletNetwork.innerHTML = ``;
    } else {
        const parsedChainId = parseInt(`${chainId}`, 16);
        CHAIN_CONNECTED.name = CHAIN_DICTIONARY?.[parsedChainId];
        CHAIN_CONNECTED.id = parsedChainId;

        const buttonNetwork = document.getElementById('button-network');
        const divErrorNetwork = document.getElementById('div-error-network');
        const formContractReadButton = document.querySelector('#form-contract-read button');
        const formContractWriteInput = document.querySelector('#form-contract-write input');
        const formContractWriteButton = document.querySelector('#form-contract-write button');

        if (parsedChainId !== CHAIN_ID_REQUIRED) {
            // Show error elements
            buttonNetwork.classList = `${buttonNetwork.classList.value.replaceAll('hidden', '')}`;
            divErrorNetwork.classList = `${divErrorNetwork.classList.value.replaceAll('hidden', '')}`;
            divErrorNetwork.children[1].innerHTML = `${CHAIN_CONNECTED.name}`;

            // Disable forms
            formContractReadButton.setAttribute('disabled', true);
            formContractWriteInput.setAttribute('disabled', true);
            formContractWriteButton.setAttribute('disabled', true);
        } else {
            // Hide error elements
            buttonNetwork.classList = `${buttonNetwork.classList.value} hidden`;
            divErrorNetwork.classList = `${divErrorNetwork.classList.value} hidden`;
            divErrorNetwork.children[1].innerHTML = '';

            // Enable forms
            formContractReadButton.removeAttribute('disabled');
            formContractWriteInput.removeAttribute('disabled');
            formContractWriteButton.removeAttribute('disabled');
        }

        // Set the network to show the current connected network
        preWalletNetwork.innerHTML = `${CHAIN_CONNECTED?.id} / ${CHAIN_CONNECTED?.name}`;
    }

    console.log({ CHAIN_CONNECTED });
    console.groupEnd();
};

/**
 * When wallet connects or disconnects with accountsChanged event
 * @param {*} accounts Array of accounts that have changed - typicall array of one
 */
const onAccountsChanged = async (accounts) => {
    console.group('onAccountsChanged');
    console.log({ accounts });

    // No accounts found - use onWalletDisconnect to update UI
    if (accounts.length === 0) {
        onChainChanged(null);
        onWalletDisconnect();
    } else {
        // Accounts found - use callback for onWalletConnection to update UI
        WALLET_CONNECTED = accounts?.[0];

        // Update chain connected
        const chainId = await ethereum.request({ method: 'eth_chainId' });

        onChainChanged(chainId);
        onWalletConnection();
    }

    console.groupEnd();
};

/**
 * When wallet disconnect occurs
 */
const onWalletDisconnect = () => {
    console.group('onWalletDisconnect');

    // Hide connected section
    const sectionConnected = document.getElementById('section-connected');
    sectionConnected.classList = 'hidden';

    // Enabled connect button
    const buttonConnect = document.getElementById('button-connect');
    buttonConnect.removeAttribute('disabled');
    buttonConnect.innerHTML = 'Connect Wallet';

    console.groupEnd();
};

/**
 * When a wallet connection occurs
 */
const onWalletConnection = () => {
    console.group('onWalletConnection');

    // Disable connect button
    const buttonConnect = document.getElementById('button-connect');
    buttonConnect.setAttribute('disabled', true);
    buttonConnect.innerHTML = 'Connected';

    // Show connected section
    const sectionConnected = document.getElementById('section-connected');
    sectionConnected.classList = '';

    // Set the wallet address to show the user
    const preWalletAddress = document.getElementById('pre-wallet-address');
    preWalletAddress.innerHTML = WALLET_CONNECTED;

    console.groupEnd();
};

/**
 * When Connect Button is clicked
 */
const connect = async () => {
    console.group('connect');

    // Reset our error element each time the button is clicked
    const devErrorConnect = document.getElementById('div-error-connect');
    devErrorConnect.innerHTML = '';
    devErrorConnect.classList = devErrorConnect.classList.value.includes('hidden')
        ? devErrorConnect.classList.value
        : `${devErrorConnect.classList.value} hidden`;

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        WALLET_CONNECTED = accounts[0];

        // Update chain connected
        const chainId = await ethereum.request({ method: 'eth_chainId' });
        onChainChanged(chainId);

        // Update wallet connection preference to true
        localStorage.setItem(WALLET_CONNECTION_PREF_KEY, true);

        onWalletConnection();
    } catch (error) {
        console.log({ error });
        // If error connecting, display the error message
        devErrorConnect.innerHTML = error?.message ?? 'Unknown wallet connection error.'
        devErrorConnect.classList = devErrorConnect.classList.value.replaceAll('hidden', '');
    }

    console.groupEnd();
};

/**
 * When Disconnect button is clicked
 */
const disconnect = () => {
    console.group('disconnect');

    WALLET_CONNECTED = false;

    onChainChanged(null);

    // Remove wallet connection preference
    localStorage.removeItem(WALLET_CONNECTION_PREF_KEY);

    onWalletDisconnect();

    console.groupEnd();
};

/**
 * Switches network to Mumbai Testnet or CHAIN_ID_REQUIRED
 */
const switchNetwork = async () => {
    console.group('switchNetwork');
    console.log({ CHAIN_ID_REQUIRED: CHAIN_ID_REQUIRED.toString(16) });
    try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${CHAIN_ID_REQUIRED.toString(16)}` }], })
    } catch (error) {
        console.log({ error });
    }
    console.groupEnd();
};

/**
 * When the getGreeting form is submitted
 * @param {*} event 
 */
const onSubmitContractRead = async (event) => {
    console.group('onSubmitContractRead');
    event.preventDefault();

    // Reset & Set Loading State
    const preContractRead = document.getElementById('pre-contract-read');
    preContractRead.innerHTML = '(Loading...)';
    const button = document.querySelector(`#${event.currentTarget.id} button`);
    button.setAttribute('disabled', true);

    // Setup Interface + Encode Function
    const GetGreeting = CONTRACT_ABI.find(i => i.name === 'getGreeting');
    const interface = new ethers.utils.Interface([GetGreeting]);
    const encodedFunction = interface.encodeFunctionData(`${GetGreeting.name}`);
    console.log({ encodedFunction });

    // Request getGreeting
    try {
        const result = await window.ethereum.request({
            method: 'eth_call', params: [{
                to: CONTRACT_ON_CHAINS[CHAIN_CONNECTED.id],
                data: encodedFunction
            }]
        });
        preContractRead.innerHTML = `${result}\n\n// ${hex2ascii(result)}`;
    } catch (error) {
        console.log({ error });
        preContractRead.innerHTML = error?.message ?? 'Unknown contract read error.';
    }

    button.removeAttribute('disabled');
    console.groupEnd();
};

/**
 * When the setGreeting form is submitted
 * @param {*} event 
 */
const onSubmitContractWrite = async (event) => {
    event.preventDefault();
    console.group('onSubmitContractWrite');

    const greeting = event.currentTarget.greeting.value;
    console.log({ greeting });

    // Reset & Set Loading State
    const preContractWrite = document.getElementById('pre-contract-write');
    preContractWrite.innerHTML = '(Loading...)';
    const input = document.querySelector(`#${event.currentTarget.id} input`);
    const button = document.querySelector(`#${event.currentTarget.id} button`);
    button.setAttribute('disabled', true);

    // Setup Interface + Encode Function
    const SetGreeting = CONTRACT_ABI.find(i => i.name === 'setGreeting');
    const interface = new ethers.utils.Interface([SetGreeting]);
    const encodedFunction = interface.encodeFunctionData(`${SetGreeting.name}`, [greeting]);
    console.log({ encodedFunction });

    // Request setGreeting
    try {
        const result = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: WALLET_CONNECTED,
                to: CONTRACT_ON_CHAINS[CHAIN_CONNECTED.id],
                data: encodedFunction
            }]
        });
        preContractWrite.innerHTML = `${result}\n\n// ${BLOCKCHAIN_EXPLORERS?.[CHAIN_CONNECTED?.id] ?? ''}/tx/${result}`;
    } catch (error) {
        console.log({ error });
        preContractWrite.innerHTML = error?.message ?? 'Unknown contract write error.';
    }

    input.removeAttribute('disabled');
    button.removeAttribute('disabled');
    console.groupEnd();
};

// Initial Script Loaded On Window Loaded
// ========================================================
/**
 * Init
 */
window.onload = async () => {
    console.group('window.onload');

    // Replace elements with required chain name
    const chainNameReplace = document.querySelectorAll('.chain-name');
    chainNameReplace.forEach(el => {
        el.innerHTML = `${CHAIN_DICTIONARY[CHAIN_ID_REQUIRED]}`
    });

    // Replace elements with required chain name and link
    const chainLinkReplace = document.querySelectorAll('.chain-link');
    chainLinkReplace.forEach(el => {
        el.innerHTML = `${CHAIN_DICTIONARY[CHAIN_ID_REQUIRED]}`
        el.setAttribute('href', `${BLOCKCHAIN_EXPLORERS[CHAIN_ID_REQUIRED]}/address/${CONTRACT_ON_CHAINS[CHAIN_ID_REQUIRED]}`)
    });

    // All HTML Elements
    const buttonConnect = document.getElementById('button-connect');
    const buttonDisconnect = document.getElementById('button-disconnect');
    const buttonNetwork = document.getElementById('button-network');
    const formContractRead = document.getElementById('form-contract-read');
    const formContractWrite = document.getElementById('form-contract-write');

    // Event Interactions
    buttonConnect.addEventListener('click', connect);
    buttonDisconnect.addEventListener('click', disconnect);
    buttonNetwork.addEventListener('click', switchNetwork);
    formContractRead.addEventListener('submit', onSubmitContractRead);
    formContractWrite.addEventListener('submit', onSubmitContractWrite);

    // Check if browser has wallet integration
    if (typeof window?.ethereum !== "undefined") {
        // Enable Button
        buttonConnect.removeAttribute('disabled');
        buttonConnect.innerHTML = "Connect Wallet";

        // Events
        window.ethereum.on('accountsChanged', onAccountsChanged);
        window.ethereum.on('chainChanged', onChainChanged);

        // Check if already connected with the number of permissions we have
        const hasWalletPermissions = await window.ethereum.request({ method: 'wallet_getPermissions' });
        console.log({ hasWalletPermissions });

        // Retrieve wallet connection preference from localStorage
        const shouldBeConnected = JSON.parse(localStorage.getItem(WALLET_CONNECTION_PREF_KEY)) || false;
        console.log({ shouldBeConnected });

        // If wallet has permissions update the site UI
        if (hasWalletPermissions.length > 0 && shouldBeConnected) {
            // Retrieve chain
            const chainId = await ethereum.request({ method: 'eth_chainId' });
            onChainChanged(chainId);
            connect();
        }
    }

    console.groupEnd();
};