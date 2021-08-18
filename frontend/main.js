Moralis.initialize("UVqjBTfQSRy0TkqXylWBD7EqDGNECAg0S3kDWdeR");
Moralis.serverURL = "https://qjynwohlpcsh.moralis.io:2053/server"
const TOKEN_CONTRACT_ADDRESS = "0xCeC8430EA9BE7816Ad0EF651f88430AC6E6E6472";
const MARKETPLACE_CONTRACT_ADDRESS = "0x8A5A83F1533E8B0697AAf44734e6C11b35Ad2923";

/* Moralis.initialize("YtabraJIWgTdmW25DEGmDc96Un61MPJpH3fMjGVp");
Moralis.serverURL = 'https://xuaf5rhqfcoy.moralisweb3.com:2053/server';
const TOKEN_CONTRACT_ADDRESS = "0x4C69E2A3b64cF64621Ae4b3faF0b8dE694B317C1";
const MARKETPLACE_CONTRACT_ADDRESS = "0x6B2FFE29B18A4a797B40Eab5E53D5a62588FbF5E"; */

init = async () => {
    hideElement(userItemsSection);
    // hideElement(userInfo);
    // hideElement(createItemForm);
    window.web3 = await Moralis.Web3.enable();
    // allow access to contract in the window
    window.tokenContract = new web3.eth.Contract(tokenContractAbi, TOKEN_CONTRACT_ADDRESS);
    window.marketplaceContract = new web3.eth.Contract(marketplaceContractAbi, MARKETPLACE_CONTRACT_ADDRESS);
    initUser();
    loadItems();

    const soldItemsQuery = new Moralis.Query('SoldItems');
    const soldItemsSubscription = await soldItemsQuery.subscribe();
    // link onItemSold to subscription event
    // whenever a new item is inserted into SoldItems, trigger onItemSold
    soldItemsSubscription.on("create", onItemSold);

    const itemsAddedQuery = new Moralis.Query('ItemsForSale');
    const itemsAddedSubscription = await itemsAddedQuery.subscribe();
    itemsAddedSubscription.on("create", onItemAdded);
}

onItemSold = async (item) => {
    // if the item is listed in the items for sale, remove it as it has been sold
    const listing = document.getElementById(`item-${item.attributes.uid}`);
    if (listing) {
        listing.parentNode.removeChild(listing);
    }
    user = await Moralis.User.current();
    if (user) {
        const params = {uid: `${item.attributes.uid}`};
        const soldItem = await Moralis.Cloud.run('getItem', params);
        if (soldItem) {
            // if the buyer is any of the addresses contained in the accounts linked to the current user
            if (user.get('accounts').includes(item.attributes.buyer)) {
            // place new item in the list of the items owned by the current user
                getAndRenderItemData(soldItem, renderUserItem);
            }

            const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
            // if got userItemListing back, then remove it
            if (userItemListing) userItemListing.parentNode.removeChild(userItemListing);
        }
    }
}

onItemAdded = async (item) => {
    const params = {uid: `${item.attributes.uid}`};
    const addedItem = await Moralis.Cloud.run('getItem', params);
    if (addedItem) {
        user = await Moralis.User.current();
        if (user) {
            // if it is the user who added the item
            if (user.get('accounts').includes(addedItem.ownerOf)) {
                // ensure not to get duplicates
                const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
                if (userItemListing) userItemListing.parentNode.removeChild(userItemListing);
                
                getAndRenderItemData(addedItem, renderUserItem);
                return;
            }
        }
        getAndRenderItemData(addedItem, renderItem);
    }
}

initUser = async () => {
    if (await Moralis.User.current()) {
        hideElement(userConnectButton);
        showElement(userProfileButton);
        showElement(openCreateItemButton);
        showElement(openUserItemsButton);
        showElement(openExploreButton);
        loadUserItems();
    } else {
        showElement(userConnectButton);
        hideElement(userProfileButton);
        hideElement(openCreateItemButton);
        hideElement(openUserItemsButton);
        showElement(openExploreButton);
    }
}

// login feature
login = async () => {
    try {
        // bring up metamask, ask them to sign in
        await Moralis.Web3.authenticate();
        initUser();
    } catch (error) {
        alert(error)
    }
}

logout = async () => {
    await Moralis.User.logOut();
    hideElement(userInfo);
    // call initUser() because it takes care of displaying the correct buttons
    initUser();
}

// function
openUserInfo = async () => {
    user = await Moralis.User.current();
    if (user) {
        const email = user.get('email');
        if (email) {
            userEmailField.value = email;
        } else {
            userEmailField.value = "";
        }

        userUsernameField.value = user.get('username');

        const userAvatar = user.get('avatar');
        if (userAvatar) {
            userAvatarImg.src = userAvatar.url();
            showElement(userAvatarImg);
        } else {
            hideElement(userAvatarImg);
        }

        //showElement(userInfo);
        $('#userInfo').modal('show');
    } else {
        login();
    }
}

saveUserInfo = async () => {
    user.set('email', userEmailField.value);
    user.set('username', userUsernameField.value);

    if (userAvatarFile.files.length > 0) {
        const avatar = new Moralis.File("avatar.jpg", userAvatarFile.files[0]);
        user.set('avatar', avatar);
    }

    // save changes made 
    await user.save();
    alert("User info saved successfully");
    // gets the user and fills out the fields automatically
    openUserInfo();
}

createItem = async () => {
    if (createItemFile.files.length == 0) {
        alert("Please select a file");
        return;
    } else if (createItemNameField.value.length == 0) {
        alert("Please give the item a name");
        return;
    }

    const nftFile = new Moralis.File("nftFile.jpg",createItemFile.files[0]);
    await nftFile.saveIPFS();

    // save the file on ipfs
    const nftFilePath = nftFile.ipfs();

    // create metadata to store on ipfs
    const metadata = {
        name: createItemNameField.value,
        description: createItemDescriptionField.value,
        image: nftFilePath,
    };

    const nftFileMetadataFile = new Moralis.File("metadata.json", {base64 : btoa(JSON.stringify(metadata))});
    await nftFileMetadataFile.saveIPFS();

    const nftFileMetadataFilePath = nftFileMetadataFile.ipfs();

    const nftId = await mintNft(nftFileMetadataFilePath);

    // show how to put stuff into database
/*     let Item = Moralis.Object.extend("Item");

    // Create a new instance of that class.
    let item = new Item();
    item.set('name', createItemNameField.value);
    item.set('description', createItemDescriptionField.value);
    item.set('nftFilePath', nftFilePath);
    item.set('nftFileHash', nftFileHash);
    item.set('metadataFilePath', nftFileMetadataFilePath);
    item.set('metadataFileHash', nftFileMetadataFileHash);
    item.set('nftId', nftId);
    // TOKEN_CONTRACT_ADDRESS since all tokens that are created on our clone will be using our Morarible token
    item.set('nftContractAddress', TOKEN_CONTRACT_ADDRESS);
    await item.save();
    console.log(item); */

    user = await Moralis.User.current();
    const userAddress = user.get('ethAddress');

    switch(createItemStatusField.value){
        case "0":
            return;
        case "1":
            await ensureMarketplaceIsApproved(nftId, TOKEN_CONTRACT_ADDRESS);
            await marketplaceContract.methods.addItemToMarket(nftId, TOKEN_CONTRACT_ADDRESS, createItemPriceField.value).send({from: userAddress});
            await marketplaceContract.methods.addItemToMarket(nftId, TOKEN_CONTRACT_ADDRESS, web3.utils.toWei(createItemPriceField.value, "ether")).send({from: userAddress});
            // above is in wei. if want it in eth, check moralis -> web3 -> enable
            // const amountInEth = web3.utils.fromWei(amountInWei, 'ether');
            break;
        case "2":
            // item will still get minted, same functionality as case 0
            alert("Not yet supported");
            return;

    }
}

// function to mint item
mintNft = async (metadataUrl) => {
    // createItem function declared in MoraribleToken.sol
    const receipt = await tokenContract.methods.createItem(metadataUrl).send({from: ethereum.selectedAddress});
    console.log(receipt);
    // transfer fired from _safeMint in MoraribleToken.sol which is fired from _mint in ERC721.sol
    // want to get tokenId returned
    return receipt.events.Transfer.returnValues.tokenId;
}

openUserItems = async () => {
    user = await Moralis.User.current();
    if (user) {
        $('#userItems').modal('show');
    } else {
        login();
    }
}

//openExplore

loadUserItems = async () => {
    // results array in cloud functions will be ownedItems
    const ownedItems = await Moralis.Cloud.run("getUserItems");
    ownedItems.forEach(item => {
        const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
        if (userItemListing) return;
        getAndRenderItemData(item, renderUserItem);
    });
}

loadItems = async () => {
    // results array in cloud functions will be ownedItems
    const items = await Moralis.Cloud.run("getItems");
    user = await Moralis.User.current();
    items.forEach(item => {
        // if the user is logged in
        if (user) {
            if (user.attributes.accounts.includes(item.ownerOf)) {
                const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
                if (userItemListing) userItemListing.parentNode.removeChild(userItemListing);
                getAndRenderItemData(item, renderUserItem);
                return;
            }
        }
        getAndRenderItemData(item, renderItem);
    });
}

initTemplate = (id) => {
    const template = document.getElementById(id);
    // remove id of node
    template.id = "";
    // remove from document
    template.parentNode.removeChild(template);
    return template;
}

renderUserItem = async (item) => {
    // true so it is a deep clone/whole structure, otherwise we'd only get the outer element
    const userItemListing = document.getElementById(`user-item-${item.tokenObjectId}`);
    // we try to render, if it already exists, then skip
    if (userItemListing) return;

    const userItem = userItemTemplate.cloneNode(true);
    userItem.getElementsByTagName("img")[0].src = item.image;
    userItem.getElementsByTagName("img")[0].alt = item.name;
    userItem.getElementsByTagName("h5")[0].innerText = item.name;
    userItem.getElementsByTagName("p")[0].innerText = item.description;
    // if askingPrice undefined, default to 1
    userItem.getElementsByTagName("input")[0].value = item.askingPrice ?? 1;
    // if there is askingPrice, then the item is already for sale, and don't want the user to be able to change the value
    userItem.getElementsByTagName("input")[0].disabled = item.askingPrice > 0;
    userItem.getElementsByTagName("button")[0].disabled = item.askingPrice > 0;
    userItem.getElementsByTagName("button")[0].onclick = async () => {
        user = await Moralis.User.current();
        if (!user) {
            login();
            return;
        }
        await ensureMarketplaceIsApproved(item.tokenId, item.tokenAddress);
        await marketplaceContract.methods.addItemToMarket(item.tokenId, item.tokenAddress, userItem.getElementsByTagName("input")[0].value).send({from: user.get('ethAddress')});
    };
    
    userItem.id = `user-item-${item.tokenObjectId}`;
    userItems.appendChild(userItem);
}

renderItem = (item) => {
    const itemForSale = marketplaceItemTemplate.cloneNode(true);
    // check if item's avatar exists 
    if (item.sellerAvatar) {
        // <h6> in id="marketplaceItemTemplate" of index.html
        // invoke () because avatar is a file type
        // referencing "getItems" of cloud function
        itemForSale.getElementsByTagName("img")[0].src = item.sellerAvatar.url();
        itemForSale.getElementsByTagName("img")[0].alt = item.sellerUsername;
        // itemForSale.getElementsByTagName("span")[0].innerText = item.sellerUsername;
    }
    // <h5> in id="marketplaceItemTemplate" of index.html
    itemForSale.getElementsByTagName("img")[1].src = item.image;
    itemForSale.getElementsByTagName("img")[1].alt = item.name;
    itemForSale.getElementsByTagName("h5")[0].innerText = item.name;
    itemForSale.getElementsByTagName("p")[0].innerText = item.description;

    // price in wei
    itemForSale.getElementsByTagName("button")[0].innerText = `Buy for ${item.askingPrice}`;
    itemForSale.getElementsByTagName("button")[0].onclick = () => buyItem(item);
    itemForSale.id = `item-${item.uid}`;
    itemsForSale.appendChild(itemForSale);
}

getAndRenderItemData = (item, renderFunction) => {
    // fetch token object
    fetch(item.tokenUri)
    // convert it into json
    .then(response => response.json())
    .then(data => {
        item.name = data.name;
        item.description = data.description;
        item.image = data.image;
        renderFunction(item);
    })
}

ensureMarketplaceIsApproved = async (tokenId, tokenAddress) => {
    user = await Moralis.User.current();
    // get metamask address of the user
    const userAddress = user.get('ethAddress');
    const contract = new web3.eth.Contract(tokenContractAbi, tokenAddress);
    const approvedAddress = await contract.methods.getApproved(tokenId).call({from: userAddress});
    if (approvedAddress != MARKETPLACE_CONTRACT_ADDRESS) {
        // bring up metamask window  
        await contract.methods.approve(MARKETPLACE_CONTRACT_ADDRESS, tokenId).send({from: userAddress});
    }
}

buyItem = async (item) => {
    user = await Moralis.User.current();
    if (!user) { 
        login();
        return;
    }
    await marketplaceContract.methods.buyItem(item.uid).send({from: user.get('ethAddress'), value: item.askingPrice});
}

// helper methods
// hide element to control what is displayed onscreen
hideElement = (element) => element.style.display = "none";
showElement = (element) => element.style.display = "block";

// NavBar
// connect buttons from index.html
const userConnectButton = document.getElementById("btnConnect");
// log in the user
userConnectButton.onclick = login;

const userProfileButton = document.getElementById("btnUserInfo");
userProfileButton.onclick = openUserInfo;

const openCreateItemButton = document.getElementById("btnOpenCreateItem");
openCreateItemButton.onclick = () => $('#createItem').modal('show');

// User Profile
// want to reference to work with them more easily
const userInfo = document.getElementById("userInfo");
const userUsernameField = document.getElementById("txtUsername");
const userEmailField = document.getElementById("txtEmail");
const userAvatarImg = document.getElementById("imgAvatar");
const userAvatarFile = document.getElementById("fileAvatar");

document.getElementById("btnCloseUserInfo").onclick = () => hideElement(userInfo);
//document.getElementById("btnCloseUserInfo").onclick = () => $('#userInfo').modal('show');
document.getElementById("btnLogout").onclick = logout;
document.getElementById("btnSaveUserInfo").onclick = saveUserInfo;

// Item creation
const createItemForm = document.getElementById("createItem");

const createItemNameField = document.getElementById("txtCreateItemName");
const createItemDescriptionField = document.getElementById("txtCreateItemDescription");
const createItemPriceField = document.getElementById("numCreateItemPrice");
const createItemStatusField = document.getElementById("selectCreateItemStatus");
const createItemFile = document.getElementById("fileCreateItemFile");
document.getElementById("btnCloseCreateItem").onclick = () => hideElement(createItemForm);
document.getElementById("btnCreateItem").onclick = createItem;

// User items
const userItemsSection = document.getElementById("userItems");
const userItems = document.getElementById("userItemsList");
document.getElementById("btnCloseUserItems").onclick = () => hideElement(userItemsSection);
const openExploreButton = document.getElementById("btnExplore");
//TODO     openExploreButton.onclick = openExplore;
const openUserItemsButton = document.getElementById("btnMyItems");
openUserItemsButton.onclick = openUserItems;

// this removes itemTemplate from the document, but will store structure in userItemTemplate
const userItemTemplate = initTemplate("itemTemplate");
const marketplaceItemTemplate = initTemplate("marketplaceItemTemplate");

// Items for sale
const itemsForSale = document.getElementById("itemsForSale");

// initialize automatically when page loads 
init();