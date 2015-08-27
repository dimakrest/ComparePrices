/**
 * Created by dimakrest on 6/17/15.
 */

angular.module('ComparePrices.services', ['ngResource'])

    .factory('ReadJson', ['$resource',
        function($resource){
            return $resource('resources/:jsonName.json', {}, {});
        }])

    .factory('ComparePricesStorage', ['ReadJson', 'MiscFunctions', '$q', '$resource',
        function (ReadJson, MiscFunctions, $q, $resource) {

        var createUserCartsTbQuery  = 'CREATE TABLE IF NOT EXISTS tbUserCarts (CartID INTEGER, ItemCode TEXT, Amount INTEGER)';
        var createCartsTbQuery      = 'CREATE TABLE IF NOT EXISTS tbCarts (CartID INTEGER PRIMARY KEY, CartName TEXT, ImageUrl TEXT, CheckboxColor TEXT, IsPredefined INTEGER)';

        // TODO: database size + don't want to call init every time
        var db = openDatabase("ComparePricesDB", "1.0", "Global storage", 4 * 1024 * 1024); // TODO: check what happens when we exceed this limit
        db.transaction(initDB, errorCB, successCB); // creates tables for the first time if required

        var initProductList = localStorage.getItem('initProductList') || 1;
        if (initProductList == 1) {
            CreateTbProducts();
            CreateStoresLocationTable();

            // For now do this only once
            localStorage.setItem('initProductList', 0);
        }

        function CreateTbProducts()
        {
            ReadJson.query({jsonName:'all_products'}, function (products) {
                db.transaction(function (tx) {
                    tx.executeSql('DROP TABLE IF EXISTS tbProducts');
                    tx.executeSql('CREATE TABLE IF NOT EXISTS tbProducts (ItemCode TEXT PRIMARY KEY, ItemName TEXT, ImagePath TEXT)');
                    var numOfProducts = products.length;
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfProducts; i++) {
                        var singleProduct = products[i];
                        var sqlQuery = 'INSERT INTO tbProducts VALUES ("' +
                            singleProduct['IC'] + '", "' +
                            singleProduct['IN'].replace(/\"/g, "\'\'") + '", "' +
                            singleProduct['ImagePath'] + '")';
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, successCB)
            });
        }

        function CreateStoresLocationTable()
        {
            ReadJson.query({jsonName:'stores'}, function (storesInfo) {
                db.transaction(function (tx) {
                    tx.executeSql('DROP TABLE IF EXISTS tbStoresLocation');
                    tx.executeSql('CREATE TABLE IF NOT EXISTS tbStoresLocation (ChainID TEXT, BrandName TEXT, BrandNameHeb TEXT, StoreID TEXT, Lat REAL, Lon REAL, ' +
                                  'City TEXT, Address TEXT, Distance INTEGER, ProductListExists INTEGER, PRIMARY KEY (ChainID, StoreID))');
                    var numOfBrands = storesInfo.length;
                    for (var brandIndex=0; brandIndex < numOfBrands; brandIndex++) {
                        var brandInfo = storesInfo[brandIndex];
                        var brandName       = brandInfo['brand'];
                        var brandNameHeb    = brandInfo['heb'];
                        var chainID         = brandInfo['ChainId'];

                        if (typeof (chainID) == "undefined" || chainID == "undefined") {
                            continue;
                        }
                        var numOfBranches = brandInfo['branches'].length;
                        // TODO: how better mask ' and "
                        for (var branchIndex = 0; branchIndex < numOfBranches; branchIndex++) {
                            var singleBranch = brandInfo['branches'][branchIndex];
                            // TODO: Kirill has to remove undefined
                            if ((typeof (singleBranch['Lat']) == "undefined") || (typeof (singleBranch['Lng']) == "undefined") ||
                                (singleBranch['Lat'] == "unknown") || (singleBranch['Lng'] == "unknown")) {
                                continue;
                            }
                            var sqlQuery = 'INSERT INTO tbStoresLocation VALUES ("' +
                                chainID + '", "' +
                                brandName + '", "' +
                                brandNameHeb + '", "' +
                                singleBranch['StoreId'] + '", ' +
                                singleBranch['Lat'] + ', ' +
                                singleBranch['Lng'] + ', "' +
                                singleBranch['City'].replace(/\"/g, "\'\'") + '", "' +
                                singleBranch['Address'].replace(/\"/g, "\'\'") + '", 0, 0)';
                            tx.executeSql(sqlQuery)
                        }
                    }
                }, errorCB, successCB);
            });
        }

        // Function to mark that for this store products json exists
        function SuccessTableCreation(chainID, storeID, defer) {
            db.transaction(function (tx) {
                var sqlQuery = 'UPDATE tbStoresLocation SET ProductListExists=1 WHERE ChainID="' + chainID + '" AND StoreID="' + storeID + '";';
                tx.executeSql(sqlQuery);
            }, errorCB, function() {
                defer.resolve();
            });
        }

        function CreateProductTableForSingleShop($scope, numOfShops, tableName, fileName, chainID, storeID)
        {
            var defer = $q.defer();

            var storeJson = $resource('https://s3.amazonaws.com/compare.prices/' + fileName,  {});
            // TODO: change back to query after prices update
            storeJson.get(function(response) {
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS ' + tableName + ' (ItemCode TEXT PRIMARY KEY, ItemPrice TEXT)'); // TODO: change item price to be double
                    var products = response['items'];
                    var numOfProducts = products.length;
                    for (var i = 0; i < numOfProducts; i++) {
                        var singleProduct = products[i];
                        var sqlQuery = 'INSERT INTO ' + tableName + ' VALUES ("' +
                            singleProduct['IC'] + '", "' +
                            singleProduct['IP'] + '")';
                        tx.executeSql(sqlQuery)
                    }
                }, function() {
                    $scope.c.currentlyShopsDownloaded++;
                    $scope.c.currentlyShopsDownloadedPercentage = Math.round($scope.c.currentlyShopsDownloaded / numOfShops * 100);
                    $scope.c.globalProgressLoadingPointer.update($scope.c.currentlyShopsDownloadedPercentage);

                    //var loadingPointer = document.getElementsByClassName("loading-container")[0].getElementsByClassName("loading")[0].firstChild;
                    //loadingPointer.innerHTML = " " + $scope.c.currentlyShopsDownloadedPercentage + "% " + $scope.c.localize.strings['UpdatingListOfStores'];

                    defer.resolve();
                }, SuccessTableCreation(chainID, storeID, defer));
            }, function() {
                defer.resolve();
            });
            return defer.promise;
        }

        function CreateProductTablesForShops($scope, radius)
        {
            var defer = $q.defer();
            $scope.c.currentlyShopsDownloaded = 0;
            $scope.c.currentlyShopsDownloadedPercentage = 0;

            // TODO: how this can be done without timeout? the problem is that when we come to rhis function there is no yet loading element
            setTimeout(function()
            {
                // this makes text and circle in two lines
                document.getElementsByClassName("loading-container")[0].getElementsByClassName("loading")[0].firstChild.style.display='block';
                // create progress with circle
                $scope.c.globalProgressLoadingPointer = new CircularProgress({
                    radius: 30,
                    lineWidth: 3,
                    font: "15px Arial",
                    strokeStyle: 'white'
                });

                document.getElementsByClassName("loading-container")[0].getElementsByClassName("loading")[0].appendChild($scope.c.globalProgressLoadingPointer.el);
                $scope.c.globalProgressLoadingPointer.update(1);
            },700);

            // get all shops in defined radius
            // read json and create table
            IssueShopsInRadiusQuery(radius, false).then(function(shopsInfo) {
                var numOfShops = shopsInfo.rows.length;
                var promises = [];

                for (var i=0; i < numOfShops; i++) {
                    // need to pad store id with zeroes to get the right name
                    var singleShop  = shopsInfo.rows[i];
                    var storeID = ("000" + singleShop['StoreID']);
                    storeID  = storeID.substr(storeID.length - 3);

                    var tableName   = 'tb_' + singleShop['BrandName'] + '_' + singleShop['StoreID'];
                    var fileName    =  'stores\/' + singleShop['BrandName'] + '\/price-' + singleShop['BrandName'] + '-' + storeID + '.json';
                    var chainID     = singleShop['ChainID'];
                    var storeID     = singleShop['StoreID'];
                    promises.push(CreateProductTableForSingleShop($scope, numOfShops, tableName, fileName, chainID, storeID));
                }
                $q.all(promises).then(function() {
                    defer.resolve();
                });
            });

            return defer.promise;
        }

        function logError(errorCallBack) {
            return function (err) {
                console.log("DB error: " + err.code);
                if (errorCallBack)
                    errorCallBack(err)
            }

        }

        function initDB(tx) {
            tx.executeSql(createUserCartsTbQuery);
            tx.executeSql(createCartsTbQuery);
        }

        // TODO: add flag to mask all prints
        function errorCB(err) {
            console.log("Error processing SQL: " + err.code);
            console.log("Error processing SQL: " + err.message);
        }

        function successCB() {
            console.log("Db connection success!");
        }

        function IssueProductsSelectQuery(productCodes, tableName, shopInfo) {
            var d = $q.defer();

            var response        = {};
            response.shopInfo   = shopInfo;
            response.rows       = [];
            var selectQuery = 'SELECT * FROM ' + tableName + ' WHERE ItemCode IN ("' + productCodes.join("\",\"") + '")';

            db.transaction(function (tx) {
                tx.executeSql(selectQuery, [], function (tx, rawresults) {
                    var len = rawresults.rows.length;
                    for (var i = 0; i < len; i++) {
                        response.rows.push(rawresults.rows.item(i));
                    }
                    d.resolve(response);
                });
            });

            return d.promise;
        }

            // TODO: check if I need all the fields
        // onlyWithLocation fag says if return all fields or only then ones that have products json
        function IssueShopsInRadiusQuery(radius, showOnlyWithProductLists) {
            var d = $q.defer();

            var response = {};
            response.rows = [];
            // TODO: do I need all the elements?
            var selectQuery = "SELECT * FROM tbStoresLocation WHERE Distance < " + radius;
            if (showOnlyWithProductLists) {
                selectQuery +=  ' AND ProductListExists = 1';
            }
            db.transaction(function (tx) {
                tx.executeSql(selectQuery, [], function (tx, rawresults) {
                    var len = rawresults.rows.length;
                    for (var i = 0; i < len; i++) {
                        response.rows.push(rawresults.rows.item(i));
                    }
                    d.resolve(response);
                });
            });

            return d.promise;
        }

        function UpdateStoreRadiusFromLocations(myLat, myLon) {
            var defer = $q.defer();

            var sqlQuery = "SELECT ChainID, StoreID, Lat, Lon FROM tbStoresLocation;";
            db.transaction(function (tx) {
                tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                    // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                    var len = rawresults.rows.length;
                    for (var i = 0; i < len; i++) {
                        var singleStore = rawresults.rows.item(i);
                        var storeLat = singleStore['Lat'];
                        var storeLon = singleStore['Lon'];

                        var distance = MiscFunctions.CalculateDistance(myLat, myLon, storeLat, storeLon);
                        var sqlQuery = 'UPDATE tbStoresLocation SET Distance=' + distance + ' WHERE ChainID="' + singleStore['ChainID'] + '" AND StoreID="' +
                                        singleStore['StoreID'] + '";';
                        tx.executeSql(sqlQuery);
                    }
                })
            }, errorCB, function(){
                defer.resolve();
            });
            return defer.promise;
        }

        return {

            CreatePredefinedCarts: function ()
            {
                var lastCartID = 1;
                var defer = $q.defer();

                ReadJson.query({jsonName:'user_defined_carts'}, function (userCarts) {
                    var carts = userCarts;
                    var products;

                    db.transaction(function (tx) {
                        carts.forEach(function(singleCart) {
                            tx.executeSql('INSERT INTO tbCarts (CartID, CartName, ImageUrl, CheckboxColor, IsPredefined)' +
                            'VALUES (' + lastCartID + ', "' + singleCart['CartName'] + '", "' + singleCart['ImageUrl'] + '", "' + singleCart['CheckboxColor'] + '",1)');

                            products = singleCart['Products'];

                            for (var productId in products)
                            {
                                tx.executeSql('INSERT INTO tbUserCarts (CartID, ItemCode, Amount)' +
                                'VALUES (' + lastCartID + ', "' + productId + '", ' + parseInt(products[productId]) + ')');
                            }
                            lastCartID++;
                        });

                    }, errorCB, function(){
                        defer.resolve();
                    });
                });

                localStorage.setItem('initPredefinedCarts', 0);
                return defer.promise;
            },

            // success is a function that is passed here
            GetAllProducts: function (success) {
                var response = {};
                response.rows = [];
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM tbProducts;', [], function (tx, rawresults) {
                        var len = rawresults.rows.length;
                        console.log("GetAllProducts: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            response.rows.push(rawresults.rows.item(i));
                        }
                        // check that success function exists
                        if (success) {
                            success(response);
                        }
                    });
                });
                return response;
            },

            UpdateCart: function (cartID, newCart) {
                db.transaction(function (tx) {
                    tx.executeSql('DELETE FROM tbUserCarts WHERE CartID = ' + cartID);
                    newCart.forEach(function (singleProduct) {
                        tx.executeSql('INSERT INTO tbUserCarts (CartID, ItemCode, Amount)' +
                            'VALUES (' + singleProduct['CartID'] + ', "' + singleProduct['ItemCode'] + '", ' + singleProduct['Amount'] + ')')
                    });
                });
            },

            GetProductsInfo: function (itemCodes) {
                var d = $q.defer();

                var response = {};
                response.rows = [];

                db.transaction(function (tx) {
                    tx.executeSql('SELECT ItemCode, ItemName, ImagePath FROM tbProducts WHERE ItemCode IN (' + itemCodes.join() + ')', [], function (tx, rawresults) {
                        var len = rawresults.rows.length;
                        for (var i = 0; i < len; i++) {
                            // Amount is changed in the cart, so I have to make a copy,
                            // otherwise it doesn't work in Safari. The properties are immutable.
                            response.rows.push(rawresults.rows.item(i));
                        }
                        d.resolve(response);
                    });
                }, errorCB, successCB);

                return d.promise;
            },

            GetMyCarts: function (cartIDs, success, error) {
                console.log("GetMyCarts: Init " + cartIDs.join("\",\"") );
                var response = {};
                response.rows = [];
                db.transaction(function (tx) {
                    tx.executeSql('SELECT tbProducts.ItemCode AS ItemCode, ' +
                        'tbProducts.ItemName AS ItemName,' +
                        'tbProducts.ImagePath AS ImagePath,' +
                        'tbUserCarts.Amount AS Amount, ' +
                        'tbUserCarts.CartID AS CartID ' +
                        'FROM tbProducts JOIN tbUserCarts ON tbProducts.ItemCode=tbUserCarts.ItemCode ' +
                        'WHERE tbUserCarts.CartID IN (' + cartIDs.join() + ')', [], function (tx, rawresults) {
                        // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                        var len = rawresults.rows.length;
                        for (var i = 0; i < len; i++) {
                            // Amount is changed in the cart, so I have to make a copy,
                            // otherwise it doesn't work in Safari. The properties are immutable.
                            response.rows.push(angular.copy(rawresults.rows.item(i)));
                        }
                        if (success) {
                            success(response);
                        }
                    });
                }, errorCB, successCB);
                return response;
            },

            // 1) get all shops in radius
            // 2) for these shops get prices for products in cart
            GetProductsPerShopAndShops : function (productCodes, radius) {
                var defer = $q.defer();

                IssueShopsInRadiusQuery(radius, true).then(function(response) {
                    var shopsInfo = response.rows;
                    var numOfShops = shopsInfo.length;
                    var promises = [];
                    for (var i=0; i < numOfShops; i++) {
                        var tableName   = 'tb_' + shopsInfo[i]['BrandName'] + '_' + shopsInfo[i]['StoreID'];
                        promises.push(IssueProductsSelectQuery(productCodes, tableName, shopsInfo[i]));
                    }

                    $q.all(promises).then(function(data) {
                        defer.resolve(data);
                    });
                });

                return defer.promise;
            },

            GetAllCarts: function (success) {
                var sqlQuery = 'SELECT * FROM tbCarts;';
                var response = {};
                var singleItem;
                response.rows = [];
                db.transaction(function (tx) {
                    tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                        // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                        var len = rawresults.rows.length;
                        console.log("GetAllCarts: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            singleItem = rawresults.rows.item(i);
                            singleItem['IsChecked'] = false;
                            response.rows.push(singleItem)
                        }
                        if (success) {
                            success(response)
                        }
                    });
                });
                return response
            },

            UpdateCartsList: function (newCart) {
                var sqlQuery = 'INSERT INTO tbCarts VALUES (' +
                    newCart['CartID'] + ', "' +
                    newCart['CartName'] + '", "' +
                    newCart['ImageUrl'] + '", "' +
                    newCart['CheckboxColor'] + '",' +
                    '0)';

                db.transaction(function (tx) {
                    tx.executeSql(sqlQuery)
                });
            },

            DeleteCart: function (cartID) {
                db.transaction(function (tx) {
                    var sqlQuery = 'DELETE FROM tbCarts WHERE CartID = ' + cartID;
                    tx.executeSql(sqlQuery)
                });
                db.transaction(function (tx) {
                    var sqlQuery = 'DELETE FROM tbUserCarts WHERE CartID = ' + cartID;
                    tx.executeSql(sqlQuery)
                });
            },

            UpdateStoresInfo : function($scope, myLat, myLon, radius) {
                var defer = $q.defer();

                // Each time we update user location we have to recalculate distance to
                // each shop and if needed download/create missing jsons/tables.
                $q.all([UpdateStoreRadiusFromLocations(myLat, myLon),
                        CreateProductTablesForShops($scope, radius)]).then(defer.resolve);

                return defer.promise;
            },

            UpdateImageUrl: function(productCode, targetPath) {
                db.transaction(function (tx) {
                    var sqlQuery = 'UPDATE tbProducts SET ImagePath="' + targetPath + '" WHERE ItemCode="' + productCode +'";';
                    tx.executeSql(sqlQuery, successCB, errorCB);
                })
            }
        }
    }])

    .factory('PopUpFactory', ['$ionicLoading', '$ionicPopup', function($ionicLoading, $ionicPopup) {
        return {

            ErrorPopUp: function($scope, popUpText, callback) {
                var alertPopup = $ionicPopup.alert({
                                        template: '<div style="text-align:right">' + popUpText + '</div>',
                                        cssClass: 'non-transparent-pop-up'
                });
                if (callback) {
                    alertPopup.then(callback);
                }
            },

            ConfirmationPopUp: function($scope, popUpTitle, popUpText) {
                return $ionicPopup.confirm({
                    title: popUpTitle,
                    template: '<div style="text-align:right">' + popUpText + '</div>',
                    cssClass: 'non-transparent-pop-up',
                    buttons: [
                        { text: $scope.c.localize.strings['NoButton'],
                            onTap: function(e) {
                                return false;
                            }
                        },
                        { text: '<b>' + $scope.c.localize.strings['YesButton'] + '</b>',
                            type: 'button-positive',
                            onTap: function(e) {
                                return true
                            }
                        }
                    ]
                });
            },

            PopUpWithDuration: function (duration, message)
            {
                var template = "<h2><i class='ion-checkmark-circled'></i></h2><br><small>"+message+"</small>";
                $ionicLoading.show({
                    template:'<span style="color:white;">'+template+"</span>",
                    noBackdrop:false,
                    duration:duration
                });
            }
        }
    }])

    .factory('ShowModal', ['$ionicModal', function($ionicModal) {
        return function($scope, templateURL) {
            $ionicModal.fromTemplateUrl(templateURL, {
                scope: $scope,
                animation: 'slide-in-up',
                backdropClickToClose: true,
                hardwareBackButtonClose: true
            }).then(function (modal) {
                $scope.modal = modal;
                $scope.modal.show();

                $scope.modal.close = function () {
                    $scope.modal.remove()
                };
            });
        }
    }])

    .factory('FindBestShops', ['ComparePricesStorage', 'ComparePricesConstants', '$q', function(ComparePricesStorage, ComparePricesConstants, $q) {

        function CalculatePriceForShop(productCart, productPriceInStore) {
            var totalPrice = 0.0;
            productPriceInStore.forEach(function(product) {
                var numOfProductsInCart = productCart.length;
                var amount = 0;
                for (var i=0; i < numOfProductsInCart; i++) {
                    if (productCart[i]['ItemCode'] == product['ItemCode']) {
                        amount += productCart[i]['Amount'];
                    }
                }
                totalPrice += parseFloat(product['ItemPrice']) * amount
            });
            return Math.round(totalPrice);
        }

        function TwoArraysAreIdentical(Array1, Array2) {
            // below filter find common items in unsorted arrays
            var tmpArray1 = Array1.filter(function(n) {
                return (Array2.indexOf(n) != -1);
            });

            // if lengths of tmpArray1 still the same, two arrays are identical
            if (tmpArray1.length == Array1.length)
            {
                return true;
            }
            return false;
        }

        function FindMaxShopsWithMaxCommonProducts(cart, shops) {
            var maxNumOfProducts = 1; // we don't want to end with shops that have 0 products
            var optionalCartsWithMaxNumOfProducts = [];

            // find max number of products in any carts and optional carts with maximum products
            // For example found that 3 items is max, but 3 optional carts with 3 items: [1,2,3],[1,2,3],[1,2,4]
            for (var i=0; i < shops.length; i++) {
                var productCodesInShop = [];
                shops[i].rows.forEach(function(singleItem) {
                    productCodesInShop.push(singleItem['ItemCode']);
                });
                shops[i].shopInfo['NumOfProducts'] = shops[i].rows.length;
                shops[i].shopInfo['Products'] = shops[i].rows;

                if (shops[i].shopInfo['NumOfProducts'] != 0)
                {
                    // found new max amount of products
                    if (shops[i].shopInfo['NumOfProducts'] > maxNumOfProducts)
                    {
                        maxNumOfProducts = shops[i].shopInfo['NumOfProducts'];
                        // start filling optional carts from beginning
                        optionalCartsWithMaxNumOfProducts = [];
                        optionalCartsWithMaxNumOfProducts.push({"shopsWithThisCart":1,"productsInCart":productCodesInShop});
                    }
                    else
                    {
                        // we already have this amount, now need to understand if we already have the same cart or it is new
                        if (shops[i].shopInfo['NumOfProducts'] == maxNumOfProducts) {
                            var cartAlreadyPresent = 0;
                            for (var j = 0; j < optionalCartsWithMaxNumOfProducts.length; j++) {
                                if (TwoArraysAreIdentical(optionalCartsWithMaxNumOfProducts[j].productsInCart, productCodesInShop)) {
                                    optionalCartsWithMaxNumOfProducts[j].shopsWithThisCart++;
                                    cartAlreadyPresent = 1
                                    break;
                                }
                            }
                            // new cart type
                            if (cartAlreadyPresent == 0) {
                                // add optional cart
                                optionalCartsWithMaxNumOfProducts.push({ "shopsWithThisCart": 1,"productsInCart": productCodesInShop});
                            }
                        }
                    }
                }
            }

            console.log("All possible shops");
            console.log(shops);
            console.log("All optional carts with max amount of products");
            console.log(optionalCartsWithMaxNumOfProducts);

            // go over optional carts, and find max carts for the max amount of products.
            // For example above ([1,2,3],[1,2,3],[1,2,4]), we have 2 carts of [1,2,3] and 1 cart [1,2,4]
            var maxCartsWithMaxAmountOfProducts = 0;
            var productsInCartWithMaxAmount = [];
            for (var i=0; i < optionalCartsWithMaxNumOfProducts.length; i++) {
                if (optionalCartsWithMaxNumOfProducts[i].shopsWithThisCart > maxCartsWithMaxAmountOfProducts) {
                    maxCartsWithMaxAmountOfProducts = optionalCartsWithMaxNumOfProducts[i].shopsWithThisCart;
                    productsInCartWithMaxAmount = optionalCartsWithMaxNumOfProducts[i].productsInCart;
                }
            }

            // take only shops that have needed cart of products
            var suitableShops = [];
            for (var i=0; i < shops.length; i++)
            {
                var productCodesInShop = [];
                shops[i].rows.forEach(function(singleItem) {
                    productCodesInShop.push(singleItem['ItemCode']);
                });
                if (TwoArraysAreIdentical(productsInCartWithMaxAmount,productCodesInShop))
                {
                    shops[i].shopInfo['CartPrice'] = CalculatePriceForShop(cart, shops[i].rows);
                    shops[i].shopInfo['BrandImage'] = 'img/markets/' + shops[i].shopInfo['BrandName'] + '.jpg';

                    suitableShops.push(shops[i].shopInfo);
                }
            }

            console.log("Suitable Shops with max amount of products");
            console.log(suitableShops);

            // calculate missing items
            var productCodesInMyCart = [];
            cart.forEach(function(singleItem) {
                productCodesInMyCart.push(singleItem['ItemCode']);
            });

            var missingProducts = productCodesInMyCart.filter(function(n) {
                return (productsInCartWithMaxAmount.indexOf(n) == -1);
            });
            console.log("Missing products");
            console.log(missingProducts);

            return {"suitableShops":suitableShops,"missingProducts":missingProducts};
        }

        function dynamicSort(property) {
            var sortOrder = 1;
            if(property[0] === "-") {
                sortOrder = -1;
                property = property.substr(1);
            }
            return function (a,b) {
                var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
                return result * sortOrder;
            }
        }

        function dynamicSortMultiple() {
            /*
             * save the arguments object as it will be overwritten
             * note that arguments object is an array-like object
             * consisting of the names of the properties to sort by
             */
            var props = arguments;
            return function (obj1, obj2) {
                var i = 0, result = 0, numberOfProperties = props.length;
                /* try getting a different result from 0 (equal)
                 * as long as we have extra properties to compare
                 */
                while(result === 0 && i < numberOfProperties) {
                    result = dynamicSort(props[i])(obj1, obj2);
                    i++;
                }
                return result;
            }
        }

        return function($scope, cart, radius) {
            var d = $q.defer();

            // At first get from myCart only ItemCodes
            var productCodesInMyCart = [];
            cart.forEach(function(singleItem) {
                productCodesInMyCart.push(singleItem['ItemCode']);
            });

            ComparePricesStorage.GetProductsPerShopAndShops(productCodesInMyCart, radius).then(function(result) {
                var numOfResults = result.length;
                for (var i=0; i < numOfResults; i++) {
                    result[i].shopInfo['NumOfProducts'] = result[i].rows.length;
                    if (result[i].shopInfo['NumOfProducts'] == 0) {
                        continue;
                    }
                    result[i].shopInfo['CartPrice'] = CalculatePriceForShop(cart, result[i].rows);
                    // Add brand image
                    result[i].shopInfo['BrandImage'] = 'img/markets/' + result[i].shopInfo['BrandName'] + '.jpg';
                }

                var findShopsResponse = FindMaxShopsWithMaxCommonProducts(cart, result);
                var suitableShops = findShopsResponse['suitableShops'];
                $scope.missingProducts = findShopsResponse['missingProducts'];

                // sort shops by price
                suitableShops.sort(dynamicSortMultiple("CartPrice", "Distance"));

                var totalShops = 0;
                var shopsOfSpecificBrand = [];
                var minimalPrice = suitableShops[0]['CartPrice'];

                for (var i=0; i < suitableShops.length; i++)
                {
                    if (totalShops < ComparePricesConstants.MAX_SHOPS_TO_SHOW)
                    {
                        if (suitableShops[i]['CartPrice'] > minimalPrice)
                        {
                            var percentsToShowNearPrice = Math.round((suitableShops[i]['CartPrice'] / minimalPrice - 1) * 100);
                            suitableShops[i]['PercentsToShowNearPrice'] = (percentsToShowNearPrice == 0) ? "" : ' (+' + percentsToShowNearPrice + '%) ';
                        }
                        else
                        {
                            suitableShops[i]['PercentsToShowNearPrice'] = "";
                        }

                        var brandName = suitableShops[i]['BrandName'];
                        if (typeof (shopsOfSpecificBrand[brandName]) == "undefined")
                        {
                            shopsOfSpecificBrand[brandName] = 1;
                            //singleShopInfo.shopInfo['IsChecked'] = (singleShopInfo.shopInfo['CartPrice'] == minimumPrice);
                            $scope.shopsNearThatHaveNeededProducts.push(suitableShops[i]);
                            totalShops++;
                        }
                        else {
                            if (shopsOfSpecificBrand[brandName] < ComparePricesConstants.MAX_SHOPS_OF_THE_SAME_BRAND) {
                                shopsOfSpecificBrand[brandName]++;
                                //singleShopInfo.shopInfo['IsChecked'] = (singleShopInfo.shopInfo['CartPrice'] == minimumPrice);
                                $scope.shopsNearThatHaveNeededProducts.push(suitableShops[i]);
                                totalShops++;
                            }
                        }
                    }
                    else
                    {
                        break;
                    }
                }

                // after all we need products names, images to show in accordions
                d.resolve(ComparePricesStorage.GetProductsInfo(productCodesInMyCart));
            });
            return d.promise;
        }
    }])

    // I assume that the device is ready when I get here
    .factory('ImageCache', ['$cordovaFileTransfer', '$cordovaFile', 'ComparePricesStorage',  function ($cordovaFileTransfer, $cordovaFile, ComparePricesStorage) {

        function IsImageCached(imageUrl) {
            // for browser cordova is not defined
            if (typeof (cordova) == "undefined") {
                return true;
            }

            var splitedImageUrl = imageUrl.split('/');
            var imageName       = splitedImageUrl[(splitedImageUrl.length - 1)];

            return $cordovaFile.checkFile(cordova.file.documentsDirectory, imageName);
        }

        return {
            CacheImage: function (productCode, imageUrl) {
                var isImageCached = IsImageCached(imageUrl);
                // wa for browser caching
                if (isImageCached) {
                    return;
                }

                isImageCached.then(
                    function(success) { // image is cached, do nothing
                    },
                    function(error) { // image is not cached
                        var splitedImageUrl = imageUrl.split('/');
                        var imageName       = splitedImageUrl[(splitedImageUrl.length - 1)];
                        var targetPath      = cordova.file.documentsDirectory + imageName;
                        var trustHosts      = false;
                        var options         = {};

                        $cordovaFileTransfer.download(imageUrl, targetPath, options, trustHosts)
                            .then(function (result) {
                                ComparePricesStorage.UpdateImageUrl(productCode, targetPath);
                            }, function (err) {

                            }, function (progress) {
                            });
                    }
                );
            },

            DeleteCachedImage: function (imageUrl) {
                var splitedImageUrl = imageUrl.split('/');
                var imageName       = splitedImageUrl[(splitedImageUrl.length - 1)];

                $cordovaFile.removeFile(cordova.file.dataDirectory, imageName)
                    .then(function (success) {
                        // success
                    }, function (error) {
                        // error
                    });

            }
        }
    }])

    .factory('GoogleReverseGeocoding', ['$q', '$resource', function($q, $resource) {
        return function(lat, lon) {
            var defer = $q.defer();

            var googleReverseGeocoding = $resource('https://maps.googleapis.com/maps/api/geocode/json',  {latlng:lat + ',' + lon, key:'AIzaSyBaHL-Agrso7SJGqUK5rfS0WQtpRlJdKF4',
                'language':'iw'});
            googleReverseGeocoding.get(function(result) {
                var addressComponents = result['results'][0]['address_components'];
                var numOfAddressComponents = addressComponents.length;
                var fullAddress = {};
                var numOfFieldsInFullAddress = 0;
                for (var i = 0; i < numOfAddressComponents; i++) {
                    var typesOfComponents = addressComponents[i]['types'];
                    if (typesOfComponents.indexOf('street_number') > -1) {
                        fullAddress['streetNumber'] = addressComponents[i]['long_name'];
                        numOfFieldsInFullAddress++
                    }
                    if (typesOfComponents.indexOf('route') > -1) {
                        fullAddress['route'] = addressComponents[i]['long_name'];
                        numOfFieldsInFullAddress++
                    }
                    if ((typesOfComponents.indexOf('locality') > -1) && (typesOfComponents.indexOf('political') > -1)) {
                        fullAddress['locality'] = addressComponents[i]['long_name'];
                        numOfFieldsInFullAddress++
                    }
                    if ((typesOfComponents.indexOf('country') > -1) && (typesOfComponents.indexOf('political') > -1)) {
                        fullAddress['country'] = addressComponents[i]['long_name'];
                        numOfFieldsInFullAddress++
                    }
                    if (numOfFieldsInFullAddress == 4) {
                        var fullAddress = fullAddress['route'] + ' ' + fullAddress['streetNumber'] + ',' + fullAddress['locality'] + ',' + fullAddress['country'];
                        defer.resolve(fullAddress);
                        break;
                    }
                }
            });
            return defer.promise;
        };
    }])

    .factory('MiscFunctions', [ function() {
        return {
            CalculateDistance: function (myLat, myLon, storeLat, storeLon) {
                var R = 6371; // Radius of the earth in km
                var dLat = (myLat - storeLat) * Math.PI / 180;  // deg2rad below
                var dLon = (myLon - storeLon) * Math.PI / 180;
                var a = 0.5 - Math.cos(dLat) / 2 + Math.cos(storeLat * Math.PI / 180) * Math.cos(myLat * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
                var distance = Math.round(R * 2 * Math.asin(Math.sqrt(a)));

                return distance;
            }
        }
    }])

    .factory('UpdateStores', ['$q', '$ionicSideMenuDelegate', 'GoogleReverseGeocoding', 'MiscFunctions', 'ComparePricesConstants', 'ComparePricesStorage', 'PopUpFactory', '$cordovaGoogleAnalytics', function($q, $ionicSideMenuDelegate, GoogleReverseGeocoding, MiscFunctions, ComparePricesConstants, ComparePricesStorage, PopUpFactory, $cordovaGoogleAnalytics) {

        function ReverseGeocodingAndUpdateStore($scope, lat, lon) {
            var defer = $q.defer();

            GoogleReverseGeocoding(lat, lon).then(function (fullAddress) {
                $scope.c.lastAddress = fullAddress;
                if ((localStorage.getItem('IsRunningOnDevice') || "0") != "0") {
                    $cordovaGoogleAnalytics.trackEvent('Settings', 'Change address', $scope.c.lastAddress, $scope.c.rangeForShops);
                }
                localStorage.setItem('lastAddress', fullAddress);
                localStorage.setItem('Lat', lat);
                localStorage.setItem('Lon', lon);

                // Need to recalculate and create missing stores info
                ComparePricesStorage.UpdateStoresInfo(lat, lon, $scope.c.rangeForShops).then(function () {
                    defer.resolve();
                });
            });
            return defer.promise;
        }

        return {
            UpdateStoresInfoIfRequired: function ($scope) {
                var defer = $q.defer();

                navigator.geolocation.getCurrentPosition(function (position) { // success callback

                        var lat = position.coords.latitude;
                        var lon = position.coords.longitude;
                        var savedLat = localStorage.getItem('Lat') || "";
                        var savedLon = localStorage.getItem('Lon') || "";

                        var addressAlreadySet = ((savedLat != "") && (savedLon != ""));
                        var distanceBetweenTwoLocations = 0;
                        // if address is set need to calculate what's the distance between previous and current location
                        if (addressAlreadySet) {
                            distanceBetweenTwoLocations = MiscFunctions.CalculateDistance(savedLat, savedLon, lat, lon);
                        }

                        // if address is set and distance is less than margin => nothing to do
                        if (addressAlreadySet && (distanceBetweenTwoLocations < ComparePricesConstants.LOCATION_CHANGES_MARGIN)) {
                            defer.resolve();
                            return;
                        }

                        // We get here in two cases:
                        // 1) address is not set => it's our first visit and we have to create tables
                        // 2) distance between previous and current location is greater than margin and we have to look for new shops
                        // Get an address from google
                        // in this case we have to show confirmation popup
                        if (addressAlreadySet) {
                            var popUpTitle  = $scope.c.localize.strings['LocationUpdatePopupTitle'];
                            var popUpText   = $scope.c.localize.strings['LocationUpdatePopupText'];
                            $scope.c.HideLoading();
                            PopUpFactory.ConfirmationPopUp($scope, popUpTitle, popUpText).then(function (confirmed) {
                                if (confirmed) {
                                    $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                                    ReverseGeocodingAndUpdateStore($scope, lat, lon).then(function() {
                                        defer.resolve();
                                    });
                                } else { // user doesn't want to update his location
                                    defer.resolve();
                                }
                            })
                        } else {
                            ReverseGeocodingAndUpdateStore($scope, lat, lon).then(function() {
                                defer.resolve();
                            });
                        }
                    } , function (error) { // error callback
                            defer.resolve();
                            $scope.c.HideLoading();

                            var title = $scope.c.localize.strings['NavigateToSettings'];
                            var text  = $scope.c.localize.strings['DoYouWantToOpenSettings'];
                            PopUpFactory.ConfirmationPopUp($scope, title, text).then(function(confirmed) {
                                if(confirmed) {
                                    // add timeout in order to have time to close the confirmation popup
                                    setTimeout(function() {
                                        localStorage.setItem('UserClickedSettingsLocation', 1);
                                        $ionicSideMenuDelegate.toggleRight();
                                        cordova.plugins.settings.open();
                                    }, 100);
                                } else {
                                    $ionicSideMenuDelegate.toggleRight();
                                    $scope.c.useUsersCurrentLocation = false;
                                }
                            });
                        }
                );
                return defer.promise;
            }
        }
    }]);
