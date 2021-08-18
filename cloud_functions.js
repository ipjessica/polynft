Moralis.Cloud.define("getUserItems", async (request) => {

  const query = new Moralis.Query("EthNFTOwners");
  // const query = new Moralis.Query("PolygonNFTOwners");
  query.equalTo("contract_type", "ERC721");
  query.containedIn("owner_of", request.user.attributes.accounts);
  const queryResults = await query.find();
  const results = [];
  
  for (let i = 0; i < queryResults.length; ++i) {
    results.push({
      // referencing objectId (top level of the object, not inside attributes) 
      "tokenObjectId": queryResults[i].id,
      "tokenId": queryResults[i].attributes.token_id,
      "tokenAddress": queryResults[i].attributes.token_address,
      "symbol": queryResults[i].attributes.symbol,
      "tokenUri": queryResults[i].attributes.token_uri,
    });
  }
  return results;
});

  Moralis.Cloud.beforeSave("ItemsForSale", async (request) => {

    const query = new Moralis.Query("EthNFTOwners");
    // const query = new Moralis.Query("PolygonNFTOwners");
    // there should only be one result as there is only one tokenId for each tokenAddress
    query.equalTo("token_address", request.object.get('tokenAddress'));
    query.equalTo("token_id", request.object.get('tokenId'));
    const object = await query.first();
    if (object) {
        const owner = object.attributes.owner_of;
      const userQuery = new Moralis.Query(Moralis.User);
      // check user/owner of token
        userQuery.equalTo("accounts", owner);
      const userObject = await userQuery.first({useMasterKey:true});
      if (userObject) {
          request.object.set('user', userObject);
      }
      request.object.set('token', object);
    }
  });

  Moralis.Cloud.beforeSave("SoldItems", async (request) => {

    const query = new Moralis.Query("ItemsForSale");
    // uid because id is already taken in moralis
    query.equalTo("uid", request.object.get('uid'));
    const item = await query.first();
    if (item) {
      // link item being sold to the item that was for sale
      request.object.set('item', item);
      item.set('isSold', true);
      await item.save();

      const userQuery = new Moralis.Query(Moralis.User);
      // get the account of the first user who just bought the item
        userQuery.equalTo("accounts", request.object.get('buyer'));
      const userObject = await userQuery.first({useMasterKey:true});
      if (userObject) {
          request.object.set('user', userObject);
      }
    }
  });

  // opposite of getUserItems - get items for sale not owned by current user
  // should be called if the user is logged in or if the user is not
  Moralis.Cloud.define("getItems", async (request) => {

    const query = new Moralis.Query("ItemsForSale");
    query.notEqualTo("isSold", true);
    query.select("uid", "askingPrice", "tokenAddress", "tokenId", "token.token_uri", "token.symbol", "token.owner_of", "token.id", "user.avatar", "user.username");
    // whenever accessing user table, need to access masterkey
    const queryResults = await query.find({useMasterKey:true});
    const results = [];
    
    for (let i = 0; i < queryResults.length; ++i) {

      if (!queryResults[i].attributes.token || !queryResults[i].attributes.user) continue;

      results.push({
        "uid": queryResults[i].attributes.uid,
        "tokenId": queryResults[i].attributes.tokenId,
        "tokenAddress": queryResults[i].attributes.tokenAddress,
        "askingPrice": queryResults[i].attributes.askingPrice,

        "symbol": queryResults[i].attributes.token.attributes.symbol,
        "tokenUri": queryResults[i].attributes.token.attributes.token_uri,
        "ownerOf": queryResults[i].attributes.token.attributes.owner_of,
        "tokenObjectId": queryResults[i].attributes.token.id,

        "sellerUsername": queryResults[i].attributes.user.attributes.username,
        "sellerAvatar": queryResults[i].attributes.user.attributes.avatar,
      });
    }
    return results;
  });

  Moralis.Cloud.define("getItem", async (request) => {

    const query = new Moralis.Query("ItemsForSale");
    query.equalTo("uid", request.params.uid);
    query.select("uid", "askingPrice", "tokenAddress", "tokenId", "token.token_uri", "token.symbol", "token.owner_of", "token.id", "user.avatar", "user.username");
    // first because there is only one option, as the uid is unique
    const queryResult = await query.first({useMasterKey:true});
    if (!queryResult) return;
    return {
        "uid": queryResult.attributes.uid,
        "tokenId": queryResult.attributes.tokenId,
        "tokenAddress": queryResult.attributes.tokenAddress,
        "askingPrice": queryResult.attributes.askingPrice,

        "symbol": queryResult.attributes.token.attributes.symbol,
        "tokenUri": queryResult.attributes.token.attributes.token_uri,
        "ownerOf": queryResult.attributes.token.attributes.owner_of,
        "tokenObjectId": queryResult.attributes.token.id,

        "sellerUsername": queryResult.attributes.user.attributes.username,
        "sellerAvatar": queryResult.attributes.user.attributes.avatar,
      };
  });