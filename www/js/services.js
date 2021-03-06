/**
 * Created by dimakrest on 6/17/15.
 */

angular.module('ComparePrices.services', ['ngResource'])
    .factory('S3Jsons', ['$resource', function($resource) {
        return $resource('https://s3.amazonaws.com/compare.prices/stores/:jsonName.json.gz');
    }])

    .factory('ComparePricesStorage', ['S3Jsons', 'MiscFunctions', '$q',
        function (S3Jsons, MiscFunctions, $q) {

            // TODO: database size + don't want to call init every time
            var db = openDatabase("ComparePricesDB", "1.0", "Global storage", 4 * 1024 * 1024); // TODO: check what happens when we exceed this limit
            var productPricesInRange = {};

            // Function to mark that for this store products json exists
            function SuccessTableCreation(brandName, storeID, defer) {
                db.transaction(function (tx) {
                    var sqlQuery = 'UPDATE tbStoresLocation SET ProductListExists=1 WHERE BrandName="' + brandName + '" AND StoreID="' + storeID + '";';
                    tx.executeSql(sqlQuery);
                }, errorCB, function() {
                    defer.resolve();
                });
            }

            function CreateProductTableForSingleShop($scope, numOfShops, tableName, fileName, brandName, storeID)
            {
                var defer = $q.defer();
                // TODO: change back to query after prices update
                S3Jsons.get({jsonName:fileName}, function(response) {
                    db.transaction(function (tx) {
                        tx.executeSql('DROP TABLE IF EXISTS ' + tableName);
                        tx.executeSql('CREATE TABLE IF NOT EXISTS ' + tableName + ' (ItemCode TEXT PRIMARY KEY, ItemPrice TEXT, DiscountAmount TEXT KEY, DiscountPrice TEXT)'); // TODO: change item price to be double
                        var products = response['items'];
                        for (var itemCode in products) {
                            if (!products.hasOwnProperty(itemCode)) {
                                continue;
                            }

                            var singleProduct = products[itemCode];
                            var singleProductPrice;

                            // Take care of discounts
                            if ((parseInt(singleProduct['Q']) == 1) && (parseFloat(singleProduct['dP']) != 0) && (parseFloat(singleProduct['dP']) < parseFloat(singleProduct['P'])))
                            {
                                singleProductPrice = parseFloat(singleProduct['dP']);
                            }
                            else
                            {
                                singleProductPrice = parseFloat(singleProduct['P']);
                            }

                            if (typeof(productPricesInRange[itemCode]) == "undefined") {
                                productPricesInRange[itemCode] = {min : singleProductPrice, max : singleProductPrice};
                            } else {
                                if (productPricesInRange[itemCode]['min'] > singleProductPrice) {
                                    productPricesInRange[itemCode]['min'] = singleProductPrice;
                                }
                                if (productPricesInRange[itemCode]['max'] < singleProductPrice) {
                                    productPricesInRange[itemCode]['max'] = singleProductPrice;
                                }
                            }

                            // we don't have discounts for all the items
                            var sqlQuery = "";
                            if (typeof(singleProduct['Q']) == "undefined" || typeof(singleProduct['dP']) == "undefined" || (parseFloat(singleProduct['dP']) == 0) || (parseFloat(singleProduct['Q']) == 0)) {
                                sqlQuery = 'INSERT INTO ' + tableName + ' VALUES ("' +
                                    itemCode + '", "' +
                                    singleProduct['P'] + '","","")';
                            } else {
                                sqlQuery = 'INSERT INTO ' + tableName + ' VALUES ("' +
                                    itemCode + '", "' +
                                    singleProduct['P'] + '", "' +
                                    singleProduct['Q'] + '", "' +
                                    singleProduct['dP'] + '")';
                            }
                            tx.executeSql(sqlQuery)
                        }
                }, function() { // error cb
                        $scope.c.currentlyShopsDownloaded++;
                        $scope.c.currentlyShopsDownloadedPercentage = Math.max(1, Math.round($scope.c.currentlyShopsDownloaded / numOfShops * 100));
                        defer.resolve();

                        if ($scope.c.globalProgressLoadingPointer != "" || typeof ($scope.c.globalProgressLoadingPointer) != "undefined") {
                            $scope.c.globalProgressLoadingPointer.update($scope.c.currentlyShopsDownloadedPercentage);
                        }
                    }, function() { // transaction success cb
                        $scope.c.currentlyShopsDownloaded++;
                        $scope.c.currentlyShopsDownloadedPercentage = Math.max(1, Math.round($scope.c.currentlyShopsDownloaded / numOfShops * 100));
                        SuccessTableCreation(brandName, storeID, defer);
                        if ($scope.c.globalProgressLoadingPointer != "" || typeof ($scope.c.globalProgressLoadingPointer) != "undefined") {
                            $scope.c.globalProgressLoadingPointer.update($scope.c.currentlyShopsDownloadedPercentage);
                        }
                    });
                }, function() { // storeJson error cb
                    $scope.c.currentlyShopsDownloaded++;
                    $scope.c.currentlyShopsDownloadedPercentage = Math.max(1, Math.round($scope.c.currentlyShopsDownloaded / numOfShops * 100));
                    defer.resolve();
                    if ($scope.c.globalProgressLoadingPointer != "" || typeof ($scope.c.globalProgressLoadingPointer) != "undefined") {
                        $scope.c.globalProgressLoadingPointer.update($scope.c.currentlyShopsDownloadedPercentage);
                    }
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

            // TODO: add flag to mask all prints
            function errorCB(err) {
                console.log("Error processing SQL: " + err.code);
                console.log("Error processing SQL: " + err.message);
            }

            function successCB() {
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

            function UpdateMinimumAndMaximumPrices() {
                db.transaction(function (tx) {
                    for (var key in productPricesInRange) {
                        if (productPricesInRange.hasOwnProperty(key)) {
                            // set min price
                            var sqlQuery = 'UPDATE tbProducts SET MinPrice=' + productPricesInRange[key]['min'] + ' WHERE ItemCode="' + key + '" AND (MinPrice=0 OR MinPrice > ' + productPricesInRange[key]['min'] + ')';
                            tx.executeSql(sqlQuery);
                            // set max price
                            var sqlQuery = 'UPDATE tbProducts SET MaxPrice=' + productPricesInRange[key]['max'] + ' WHERE ItemCode="' + key + '" AND MaxPrice < ' + productPricesInRange[key]['max'];
                            tx.executeSql(sqlQuery);
                        }
                    }
                    productPricesInRange = {};
                }, errorCB, function() {});
            };

            return {
                DownloadNewJsons : function(newStoresInfoExists) {
                    var defer = $q.defer();

                    if (newStoresInfoExists == 1) {
                        // TODO: clear here existing tb_brand* tables
                        $q.all([this.CreateStoresLocationTable(), this.CreateTbProducts()]).then(function() {
                            defer.resolve();
                        });
                    } else {
                        defer.resolve();
                    }
                    return defer.promise;
                },

                CreateTbProducts : function() {
                    var defer = $q.defer();

                    var jsonsVersion = localStorage.getItem('localVer');
                    S3Jsons.query({jsonName:jsonsVersion + '/stores/all_products'}, function (products) {
                        db.transaction(function (tx) {
                            tx.executeSql('DROP TABLE IF EXISTS tbProducts');
                            tx.executeSql('CREATE TABLE IF NOT EXISTS tbProducts (ItemCode TEXT PRIMARY KEY, ItemName TEXT, ImagePath TEXT, MinPrice FLOAT, MaxPrice FLOAT)');
                            var numOfProducts = products.length;
                            // TODO: how better mask ' and "
                            for (var i = 0; i < numOfProducts; i++) {
                                var singleProduct = products[i];
                                // build the image path: 1 is jpg, 2 for png all others are no_product_img.jpg
                                var imagePath = '';
                                if (singleProduct['T'] == '1') {
                                    imagePath = 'https://s3.eu-central-1.amazonaws.com/compare.prices.frankfurt/product_images/product_' + singleProduct['C'] + '.jpg';
                                } else if (singleProduct['T'] == '2') {
                                    imagePath = 'https://s3.eu-central-1.amazonaws.com/compare.prices.frankfurt/product_images/product_' + singleProduct['C'] + '.png';
                                } else if (singleProduct['T'] == '3') {
                                    imagePath = 'img/products_in_sub_groups/product_' + singleProduct['C'] + '.png';
                                } else if (singleProduct['T'] == '4') {
                                    imagePath = 'img/products_in_sub_groups/product_' + singleProduct['C'] + '.jpg';
                                }  else {
                                    imagePath = 'img/no_product_img.jpg';
                                }

                                var sqlQuery = 'INSERT INTO tbProducts VALUES ("' +
                                    singleProduct['C'] + '", "' +
                                    singleProduct['N'].replace(/\"/g, "\'\'").replace(/^\s+/, '').replace(/\s+$/, '') + '", "' +
                                    imagePath + '", 0.0, 0.0)';
                                tx.executeSql(sqlQuery)
                            }
                        }, function() {
                            defer.resolve();
                        }, function() {
                            defer.resolve();
                        })
                    });
                    return defer.promise;
                },

                CreateStoresLocationTable : function() {
                    var defer = $q.defer();

                    var jsonsVersion = localStorage.getItem('localVer');
                    S3Jsons.query({jsonName: jsonsVersion + '/stores'}, function (storesInfo) {
                        db.transaction(function (tx) {
                            tx.executeSql('DROP TABLE IF EXISTS tbStoresLocation');
                            tx.executeSql('CREATE TABLE IF NOT EXISTS tbStoresLocation (BrandName TEXT, BrandNameHeb TEXT, StoreID TEXT, Lat REAL, Lon REAL, ' +
                                'City TEXT, Address TEXT, Distance FLOAT, ProductListExists INTEGER, PRIMARY KEY (BrandName, StoreID))');
                            var numOfBrands = storesInfo.length;
                            for (var brandIndex=0; brandIndex < numOfBrands; brandIndex++) {
                                var brandInfo       = storesInfo[brandIndex];
                                var brandName       = brandInfo['brand'];
                                var brandNameHeb    = brandInfo['heb'];

                                var numOfBranches = brandInfo['branches'].length;
                                // TODO: how better mask ' and "
                                for (var branchIndex = 0; branchIndex < numOfBranches; branchIndex++) {
                                    var singleBranch = brandInfo['branches'][branchIndex];
                                    // TODO: Kirill has to remove undefined
                                    if ((typeof (singleBranch['Lat']) == "undefined") || (typeof (singleBranch['Lng']) == "undefined") ||
                                        (singleBranch['Lat'] == "unknown") || (singleBranch['Lng'] == "unknown")) {
                                        continue;
                                    }
                                    // skip the online stores
                                    if ((singleBranch['Lat'] == 0) || (singleBranch['Lng'] == 0)) {
                                        continue;
                                    }

                                    var sqlQuery = 'INSERT INTO tbStoresLocation VALUES ("' +
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
                        }, function() {
                            defer.resolve();
                        }, function() {
                            defer.resolve();
                        });
                    });
                    return defer.promise;
                },

                CreatePredefinedCarts: function ()
                {
                    var lastCartID = 1;
                    var defer = $q.defer();

                    S3Jsons.query({jsonName:'predefined_carts'}, function (predefinedCarts) {
                        var carts = predefinedCarts;
                        var products;

                        db.transaction(function (tx) {
                            tx.executeSql('DROP TABLE IF EXISTS tbCarts');
                            tx.executeSql('CREATE TABLE IF NOT EXISTS tbCarts (CartID INTEGER PRIMARY KEY, CartName TEXT, ImageUrl TEXT, IsPredefined INTEGER)');

                            tx.executeSql('DROP TABLE IF EXISTS tbUserCarts');
                            tx.executeSql('CREATE TABLE IF NOT EXISTS tbUserCarts (CartID INTEGER, ItemCode TEXT, Amount INTEGER)');

                            carts.forEach(function(singleCart) {
                                tx.executeSql('INSERT INTO tbCarts (CartID, CartName, ImageUrl, IsPredefined)' +
                                    'VALUES (' + lastCartID + ', "' + singleCart['CartName'] + '", "' + singleCart['ImageUrl'] + '",1)');

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
                    return defer.promise;
                },

                CreatePredefinedProducts: function ()
                {
                    var lastProductGroupID  = 1;
                    var lastSubProductID    = 1;
                    var defer = $q.defer();

                    S3Jsons.query({jsonName:'predefined_products'}, function (predefinedProducts) {
                        var productGroups = predefinedProducts;
                        var productSubGroups;
                        var products;

                        db.transaction(function (tx) {
                            tx.executeSql('DROP TABLE IF EXISTS tbProductGroups');
                            tx.executeSql('CREATE TABLE IF NOT EXISTS tbProductGroups (ProductGroupID INTEGER PRIMARY KEY, ProductGroupName TEXT, ImageUrl TEXT)');

                            tx.executeSql('DROP TABLE IF EXISTS tbSubProductGroups');
                            tx.executeSql('CREATE TABLE IF NOT EXISTS tbSubProductGroups (ProductGroupID INTEGER, SubProductGroupID INTEGER, SubProductGroupName TEXT, ImageUrl TEXT,  PRIMARY KEY (ProductGroupID, SubProductGroupID))');

                            tx.executeSql('DROP TABLE IF EXISTS tbProductsInProductGroups');
                            tx.executeSql('CREATE TABLE IF NOT EXISTS tbProductsInProductGroups (ProductGroupID INTEGER, SubProductGroupID INTEGER, ItemCode TEXT)');
                            productGroups.forEach(function(singleProductGroup) {
                                tx.executeSql('INSERT INTO tbProductGroups (ProductGroupID, ProductGroupName, ImageUrl)' +
                                    'VALUES (' + lastProductGroupID + ', "' + singleProductGroup['ProductGroupName'] + '", "' + singleProductGroup['ImageUrl'] + '")');

                                productSubGroups = singleProductGroup['ProductSubGroups'];
                                productSubGroups.forEach(function(singleSubProduct) {
                                    tx.executeSql('INSERT INTO tbSubProductGroups (ProductGroupID, SubProductGroupID, SubProductGroupName, ImageUrl) ' +
                                        'VALUES (' + lastProductGroupID + ',' + lastSubProductID + ',' + '"' + singleSubProduct['SubGroupName'] + '","' + singleSubProduct['ImageUrl'] + '")');

                                    products = singleSubProduct['Products'];
                                    products.forEach(function(singleProductID) {
                                        tx.executeSql('INSERT INTO tbProductsInProductGroups (ProductGroupID, SubProductGroupID, ItemCode) ' +
                                            'VALUES (' + lastProductGroupID + ',' + lastSubProductID + ', "' + singleProductID + '")');
                                    });
                                    lastSubProductID++;
                                });
                                lastProductGroupID++;
                            });

                        }, errorCB, function(){
                            defer.resolve();
                        });
                    });
                    return defer.promise;
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

                GetProductsBySearchPattern: function (pattern, isItemCode) {
                    var d = $q.defer();

                    var searchField = isItemCode == 1 ? 'ItemCode' : 'ItemName';
                    var response = {};
                    response.rows = [];

                    db.transaction(function (tx) {
                        tx.executeSql('SELECT ItemCode, ItemName, ImagePath, MinPrice, MaxPrice FROM tbProducts WHERE (' + searchField + ' LIKE ?)', [pattern], function (tx, rawresults) {
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

                GetMyCart: function (cartID, success, error) {
                    var response = {};
                    response.rows = [];
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT tbProducts.ItemCode AS ItemCode, ' +
                            'tbProducts.ItemName AS ItemName,' +
                            'tbProducts.ImagePath AS ImagePath,' +
                            'tbUserCarts.Amount AS Amount, ' +
                            'tbUserCarts.CartID AS CartID ' +
                            'FROM tbProducts JOIN tbUserCarts ON tbProducts.ItemCode=tbUserCarts.ItemCode ' +
                            'WHERE tbUserCarts.CartID = ' + cartID, [], function (tx, rawresults) {
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

                GetProductsInSubGroups: function () {
                    var defer = $q.defer();

                    var response = {};
                    response.rows = [];
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT tbProducts.ItemCode AS ItemCode, tbProducts.ItemName AS ItemName, tbProducts.ImagePath AS ImagePath, ' +
                            'tbProductsInProductGroups.ProductGroupID AS ProductGroupID, tbProductsInProductGroups.SubProductGroupID AS SubProductGroupID ' +
                            'FROM tbProducts JOIN tbProductsInProductGroups ON tbProducts.ItemCode=tbProductsInProductGroups.ItemCode', [], function (tx, rawresults) {
                            var len = rawresults.rows.length;
                            for (var i = 0; i < len; i++) {
                                // Amount is changed in the cart, so I have to make a copy,
                                // otherwise it doesn't work in Safari. The properties are immutable.
                                response.rows.push(angular.copy(rawresults.rows.item(i)));
                            }
                            defer.resolve(response)
                        });
                    }, errorCB, successCB);
                    return defer.promise;
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
                            var len = rawresults.rows.length;
                            for (var i = 0; i < len; i++) {
                                singleItem = rawresults.rows.item(i);
                                // Add IsChecked field
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

                GetAllProductGroups: function () {
                    var defer = $q.defer();

                    var sqlQuery = 'SELECT * FROM tbProductGroups;';
                    var response = {};
                    response.rows = [];
                    db.transaction(function (tx) {
                        tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                            var len = rawresults.rows.length;
                            for (var i = 0; i < len; i++) {
                                response.rows.push(rawresults.rows.item(i))
                            }
                            defer.resolve(response);
                        });
                    });
                    return defer.promise;
                },

                GetAllSubProductGroups : function(success) {
                    var defer = $q.defer();

                    var sqlQuery = 'SELECT * FROM tbSubProductGroups;';
                    var response = {};
                    response.rows = [];
                    db.transaction(function (tx) {
                        tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                            var len = rawresults.rows.length;
                            for (var i = 0; i < len; i++) {
                                response.rows.push(rawresults.rows.item(i))
                            }
                            defer.resolve(response);
                        });
                    });
                    return defer.promise;
                },

                UpdateCartsList: function (newCart) {
                    var sqlQuery = 'INSERT INTO tbCarts VALUES (' +
                        newCart['CartID'] + ', "' +
                        newCart['CartName'] + '", "' +
                        newCart['ImageUrl'] + '", 0)';

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

                UpdateImageUrl: function(productCode, targetPath) {
                    db.transaction(function (tx) {
                        var sqlQuery = 'UPDATE tbProducts SET ImagePath="' + targetPath + '" WHERE ItemCode="' + productCode +'";';
                        tx.executeSql(sqlQuery, successCB, errorCB);
                    })
                },

                UpdateStoreRadiusFromLocations: function(myLat, myLon) {
                    var defer = $q.defer();

                    var sqlQuery = "SELECT BrandName, StoreID, Lat, Lon FROM tbStoresLocation;";
                    db.transaction(function (tx) {
                        tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                            var len = rawresults.rows.length;
                            for (var i = 0; i < len; i++) {
                                var singleStore = rawresults.rows.item(i);
                                var storeLat = singleStore['Lat'];
                                var storeLon = singleStore['Lon'];

                                var distance = 0.0;
                                // For online shop the distance is 0
                                if (storeLat != 0 || storeLon != 0) {
                                    distance = MiscFunctions.CalculateDistance(myLat, myLon, storeLat, storeLon);
                                }

                                var sqlQuery = 'UPDATE tbStoresLocation SET Distance=' + distance + ' WHERE BrandName="' + singleStore['BrandName'] + '" AND StoreID="' +
                                    singleStore['StoreID'] + '";';
                                tx.executeSql(sqlQuery);
                            }
                        })
                    }, errorCB, function(){
                        defer.resolve();
                    });
                    return defer.promise;
                },

                CreateProductTablesForShops: function($scope, radius)
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
                    },500);

                    // get all shops in defined radius
                    // read json and create table
                    IssueShopsInRadiusQuery(radius, false).then(function(shopsInfo) {
                        var numOfShops = shopsInfo.rows.length;

                        // calculate real number of shops
                        var realNumOfShops = 0;
                        for (var i=0; i < numOfShops; i++) {
                            var singleShop  = shopsInfo.rows[i];
                            if (singleShop['ProductListExists']) {
                                continue;
                            }
                            realNumOfShops++;
                        }
                        var promises = [];

                        var jsonsVersion = localStorage.getItem('localVer');
                        for (var i=0; i < numOfShops; i++) {
                            // need to pad store id with zeroes to get the right name
                            var singleShop  = shopsInfo.rows[i];
                            // skip shops that already downloaded
                            if (singleShop['ProductListExists']) {
                                continue;
                            }

                            var storeID = ("000" + singleShop['StoreID']);
                            storeID  = storeID.substr(storeID.length - 3);
                            var brandName = singleShop['BrandName'];

                            var tableName   = 'tb_' + singleShop['BrandName'] + '_' + singleShop['StoreID'];
                            var fileName    =  jsonsVersion + '\/stores/' + brandName + '\/price-' + singleShop['BrandName'] + '-' + storeID;
                            var storeID     = singleShop['StoreID'];

                            promises.push(CreateProductTableForSingleShop($scope, realNumOfShops, tableName, fileName, brandName, storeID));
                        }
                        $q.all(promises).then(function() {
                            // Set minimum and maximum price
                            UpdateMinimumAndMaximumPrices();
                            defer.resolve();
                        });
                    });

                    return defer.promise;
                }
            }
        }])

    .factory('PopUpFactory', ['$ionicLoading', '$timeout', '$ionicPopup', 'ionicMaterialInk', function($ionicLoading, $timeout, $ionicPopup, ionicMaterialInk) {
        return {

            ErrorPopUp: function($scope, popUpText, showTitle, callback) {
                var alertPopup = $ionicPopup.alert({
                    title : showTitle ? 'שגיאה' : '',
                    template: '<div style="text-align:right">' + popUpText + '</div>',
                    cssClass: 'non-transparent-pop-up'
                });

                if (callback) {
                    alertPopup.then(callback);
                }
            },

            ConfirmationPopUp: function($scope, popUpTitle, popUpText, noButtonText, yesButtonText) {

                if (typeof(noButtonText) == "undefined") {
                    noButtonText = $scope.c.localize.strings['NoButton'];
                }
                if (typeof(yesButtonText) == "undefined") {
                    yesButtonText = $scope.c.localize.strings['YesButton']
                }
                return $ionicPopup.confirm({
                    title: popUpTitle,
                    template: '<div style="text-align:right; direction: rtl">' + popUpText + '</div>',
                    cssClass: 'non-transparent-pop-up',
                    buttons: [
                        { text: noButtonText,
                            onTap: function(e) {
                                return false;
                            }
                        },
                        { text: '<b>' + yesButtonText + '</b>',
                            type: 'button-positive',
                            onTap: function(e) {
                                return true
                            }
                        }
                    ]
                });
            },

            ConfirmationPopUpVerticalButtons: function($scope, popUpTitle, popUpText, noButtonText, yesButtonText) {

                if (typeof(noButtonText) == "undefined") {
                    noButtonText = $scope.c.localize.strings['NoButton'];
                }
                if (typeof(yesButtonText) == "undefined") {
                    yesButtonText = $scope.c.localize.strings['YesButton']
                }
                var template;
                if (popUpText == '') {
                    template = ''
                } else {
                    template = '<div style="text-align:right; direction:rtl">' + popUpText + '</div>';
                }
                return $ionicPopup.confirm({
                    title: popUpTitle,
                    template: template,
                    cssClass: 'non-transparent-pop-up popup-vertical-buttons',
                    buttons: [
                        { text: '<span>' + noButtonText + ' &nbsp;</span>' + '<i class="ion-edit align-right-text"></i>',
                            onTap: function(e) {
                                return false;
                            }
                        },
                        { text: '<span>' + yesButtonText + ' &nbsp;</span>' + '<i class="ion-location align-right-text"></i>',
                            onTap: function(e) {
                                return true
                            }
                        }
                    ]
                });
            }
        }
    }])

    .factory('ShowModal', ['$ionicModal', function($ionicModal) {
        return function($scope, templateURL) {
            return $ionicModal.fromTemplateUrl(templateURL, {
                                               scope: $scope,
                                               animation: 'slide-in-up',
                                               backdropClickToClose: true,
                                               hardwareBackButtonClose: true});
        }
    }])

    .factory('FindBestShops', ['ComparePricesStorage', 'MiscFunctions', 'SortShops', 'UpdateStores', 'ShowModal', 'PopUpFactory', '$q', '$cordovaGoogleAnalytics', function(ComparePricesStorage, MiscFunctions, SortShops, UpdateStores, ShowModal, PopUpFactory, $q, $cordovaGoogleAnalytics) {

        function CalculatePriceForShop($scope, productCart, productPriceInStore, neededProductsItemCodes) {
            var totalPrice = 0.0;
            var productsToShowInAccordion = [];
            productPriceInStore.forEach(function(product) {
                var numOfProductsInCart = productCart.length;

                for (var i=0; i < numOfProductsInCart; i++) {
                    if ((productCart[i]['ItemCode'] == product['ItemCode']) && (neededProductsItemCodes.indexOf(product['ItemCode']) != -1)) {
                        // check that we have discount for that products + sanity check that discount price is better
                        // whole discount logic is in image on Slava mail with "ComparePrices discount description"
                        if ((product['DiscountAmount'] != "") && (product['DiscountPrice'] != "") && (product['DiscountPrice'] != 0) && (product['DiscountPrice'] / product['DiscountAmount'] < product['ItemPrice']))
                        {
                            // easy case, when discount is even for single item
                            if (product['DiscountAmount'] == 1)
                            {
                                var singleProductInAccordion = [];
                                singleProductInAccordion['ItemCode']     = product['ItemCode'];
                                singleProductInAccordion['ItemPrice']    = product['DiscountPrice'];
                                singleProductInAccordion['Amount']       = productCart[i]['Amount'];
                                singleProductInAccordion['Type']         = "DiscountS";
                                var percentsDiscount = Math.round((product['ItemPrice'] - product['DiscountPrice']/product['DiscountAmount']) / product['ItemPrice'] * 100);
                                singleProductInAccordion['DiscountText'] = $scope.c.localize.strings['Discount'] + " " + percentsDiscount + '%';
                                singleProductInAccordion['DiscountAmount'] = "";
                                productsToShowInAccordion.push(singleProductInAccordion);

                                totalPrice += parseFloat(singleProductInAccordion['ItemPrice']) * singleProductInAccordion['Amount'];
                            }
                            else // discount like '3 for 10 shekel'
                            {
                                // we have some items with discount
                                if (Math.floor(productCart[i]['Amount'] / product['DiscountAmount']) > 0)
                                {
                                    var singleProductInAccordion = [];
                                    singleProductInAccordion['ItemCode']     = product['ItemCode'];
                                    singleProductInAccordion['ItemPrice']    = product['DiscountPrice'];
                                    singleProductInAccordion['Amount']       = Math.floor(productCart[i]['Amount'] / product['DiscountAmount']);
                                    singleProductInAccordion['Type']         = "DiscountM";
                                    if ((product['DiscountAmount'] == 2) && (product['DiscountPrice'] == product['ItemPrice']))// special case for mivca 1+1
                                    {
                                        singleProductInAccordion['DiscountText'] = '1+1 ' + $scope.c.localize.strings['Mivca'];
                                    }
                                    else
                                    {
                                        singleProductInAccordion['DiscountText'] = product['DiscountPrice'] + ' ' + $scope.c.localize.strings['Mivca'] + '  ' + parseInt(product['DiscountAmount']) + ' ' + $scope.c.localize.strings['For'];
                                    }
                                    singleProductInAccordion['DiscountAmount'] = Math.floor(productCart[i]['Amount'] / product['DiscountAmount']) * product['DiscountAmount'];
                                    productsToShowInAccordion.push(singleProductInAccordion);

                                    totalPrice += parseFloat(singleProductInAccordion['ItemPrice']) * singleProductInAccordion['Amount'];
                                }

                                // we have some items that are not in discount because not enough items
                                if (productCart[i]['Amount'] % product['DiscountAmount'] != 0)
                                {
                                    var singleProductInAccordion = [];
                                    singleProductInAccordion['ItemCode']     = product['ItemCode'];
                                    singleProductInAccordion['ItemPrice']    = product['ItemPrice'];
                                    singleProductInAccordion['Amount']       = productCart[i]['Amount'] % product['DiscountAmount'];
                                    singleProductInAccordion['Type']         = "NotEnoughForDiscount";
                                    if ((product['DiscountAmount'] == 2) && (product['DiscountPrice'] == product['ItemPrice']))// special case for mivca 1+1
                                    {
                                        singleProductInAccordion['DiscountText'] = '1+1 ' + $scope.c.localize.strings['HaveMivca'];
                                    }
                                    else
                                    {
                                        singleProductInAccordion['DiscountText'] = product['DiscountPrice'] + ' ' + $scope.c.localize.strings['HaveMivca'] + ' ' + parseInt(product['DiscountAmount']) + ' ' + $scope.c.localize.strings['For'];
                                    }
                                    singleProductInAccordion['DiscountAmount'] = "";
                                    productsToShowInAccordion.push(singleProductInAccordion);

                                    totalPrice += parseFloat(singleProductInAccordion['ItemPrice']) * singleProductInAccordion['Amount'];
                                }
                            }
                        }
                        else // don't have any discount, regular price
                        {
                            var singleProductInAccordion = [];
                            singleProductInAccordion['ItemCode']     = product['ItemCode'];
                            singleProductInAccordion['ItemPrice']    = product['ItemPrice'];
                            singleProductInAccordion['Amount']       = productCart[i]['Amount'];
                            singleProductInAccordion['Type']         = "Regular";
                            singleProductInAccordion['DiscountText'] = "";
                            singleProductInAccordion['DiscountAmount'] = "";
                            productsToShowInAccordion.push(singleProductInAccordion);

                            totalPrice += parseFloat(singleProductInAccordion['ItemPrice']) * singleProductInAccordion['Amount'];
                        }
                        break;
                    }
                }
            });

            var cartFinalPrice = (productPriceInStore.length == 1 ) ? totalPrice.toFixed(2) : Math.round(totalPrice);
            return {"CartPrice":cartFinalPrice,"ProductsToShowInAccordion":productsToShowInAccordion};
        }

        function TwoArraysAreIdentical(Array1, Array2) {
            // if lengths are different return false
            if (Array1.length != Array2.length)
            {
                return false;
            }

            // go over array 1 elements and remove elements that don't present in second one
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

        function SecondArrayContainsAllElementsOfFirstArray(Array1, Array2) {
            // go over array 1 elements and remove elements that don't present in second one
            var tmpArray1 = Array1.filter(function(n) {
                return (Array2.indexOf(n) != -1);
            });

            // if length of tmpArray1 still the same, all its elements present in the second array
            if (tmpArray1.length == Array1.length)
            {
                return true;
            }
            return false;
        }

        function sortShopsByNumOfProducts(a,b) {
            if (a.rows.length < b.rows.length)
                return -1;
            if (a.rows.length > b.rows.length)
                return 1;
            return 0;
        }

        // finds more than one shop with big but not certainly maximum available combination of products
        // in case there is 1 shop with 5 products, and 3 shops with 4 products, it will return 3 shops with 4 products
        // we look also if shops with more products contain also all products of smaller shops
        // but we don't do real intersection of products here, too much compute power
        function FindAtLeast2BrandsWithCommonProducts($scope, cart, shops) {
            var allOptionalCarts = [];
            var tmpShops = angular.copy(shops);

            tmpShops.sort(sortShopsByNumOfProducts);

            // find max number of products in any carts and optional carts with maximum products
            // For example found that 3 items is max, but 3 optional carts with 3 items: [1,2,3],[1,4,3],[1,2,4]
            // optionalCartsWithMaxNumOfProducts - this struct holds [1,2,3],[1,4,3],[1,2,4]
            for (var i=0; i < tmpShops.length; i++) {
                var productCodesInShop = [];
                var shopBrand = tmpShops[i].shopInfo['BrandName'];
                tmpShops[i].rows.forEach(function(singleItem) {
                    productCodesInShop.push(singleItem['ItemCode']);
                });
                tmpShops[i].shopInfo['NumOfProducts'] = tmpShops[i].rows.length;
                tmpShops[i].shopInfo['Products'] = tmpShops[i].rows;

                // group identical carts in shops to groups, take only shops that have at least some products
                if (tmpShops[i].shopInfo['NumOfProducts'] != 0)
                {
                    var cartAlreadyPresent = 0;
                    for (var j = 0; j < allOptionalCarts.length; j++) {
                        // this exact type present
                        if (TwoArraysAreIdentical(allOptionalCarts[j].productsInCart, productCodesInShop)) {
                            allOptionalCarts[j].shopsWithThisCart++;
                            cartAlreadyPresent = 1;
                            // in case we don't have this brand yet we need to add it
                            if (allOptionalCarts[j].shopBrands.indexOf(shopBrand) == -1) {
                                allOptionalCarts[j].shopBrands.push(shopBrand);
                                allOptionalCarts[j].numOfDifferentBrands++;
                            }
                        }
                        else
                        {
                            // this shop contain all products of smaller group
                            if (SecondArrayContainsAllElementsOfFirstArray(allOptionalCarts[j].productsInCart, productCodesInShop)) {
                                allOptionalCarts[j].shopsWithThisCart++;
                                // in case we don't have this brand yet we need to add it
                                if (allOptionalCarts[j].shopBrands.indexOf(shopBrand) == -1) {
                                    allOptionalCarts[j].shopBrands.push(shopBrand);
                                    allOptionalCarts[j].numOfDifferentBrands++;
                                }
                            }
                        }
                    }
                    // new cart type
                    if (cartAlreadyPresent == 0) {
                        // add optional cart
                        allOptionalCarts.push({ "shopsWithThisCart": 1,"productsInCart": productCodesInShop, "shopBrands": [shopBrand], "numOfDifferentBrands": 1});
                    }
                }
            }

            //console.log("******** CARTS *******");
            //console.log(allOptionalCarts);
            //for (var j = 0; j < allOptionalCarts.length; j++) {
            //    console.log("Products:"+allOptionalCarts[j].productsInCart.length+" Shops:"+allOptionalCarts[j].shopsWithThisCart+" Brands:"+allOptionalCarts[j].numOfDifferentBrands);
            //}

            // go over optional carts, and find max cart with at least 2 brands
            // in case there are 2 carts with equal amount of products will take the one with more shops
            var productsInCartWith2BrandsOrMore = [];
            var amountOfProductsInLastBestCart = 1;
            var amountOfShopsInLastBestCart = 1;
            for (var i=0; i < allOptionalCarts.length; i++) {
                // if we increased number of products and have more than 2 brands take new cart, doesn't matter how many shops
                if ((allOptionalCarts[i].numOfDifferentBrands > 1) && (allOptionalCarts[i].productsInCart.length > amountOfProductsInLastBestCart)){
                    amountOfShopsInLastBestCart = allOptionalCarts[i].shopsWithThisCart;
                    amountOfProductsInLastBestCart = allOptionalCarts[i].productsInCart.length;
                    productsInCartWith2BrandsOrMore = allOptionalCarts[i].productsInCart;
                }
                // if we have the same number of products and have more than 2 brands take new cart only in case more shops
                if ((allOptionalCarts[i].numOfDifferentBrands > 1) && (allOptionalCarts[i].productsInCart.length == amountOfProductsInLastBestCart) && (allOptionalCarts[i].shopsWithThisCart > amountOfShopsInLastBestCart)){
                    amountOfShopsInLastBestCart = allOptionalCarts[i].shopsWithThisCart;
                    amountOfProductsInLastBestCart = allOptionalCarts[i].productsInCart.length;
                    productsInCartWith2BrandsOrMore = allOptionalCarts[i].productsInCart;
                }
            }

            // CODE NEEDED FOR CALCULATING CART PRICE WITH MINIMAL PRICE FOR ITEM FROM ANY SHOP
            var pseudoShopWithMinimalPrices = [];
            var pseudoShopWithMinimalPricesWithDiscount = []; // in this case we transform price to be discounted, as theoretically when we order many things we will use this discount together with other customers

            for (var i=0; i < productsInCartWith2BrandsOrMore.length; i++)
            {
                // create pseudo shop with minimal price for each item
                var tmpCode = productsInCartWith2BrandsOrMore[i];
                pseudoShopWithMinimalPrices[tmpCode] = new Object();
                pseudoShopWithMinimalPrices[tmpCode]["DiscountAmount"] = "1";
                pseudoShopWithMinimalPrices[tmpCode]["DiscountPrice"] = "100000";
                pseudoShopWithMinimalPrices[tmpCode]["ItemCode"] = tmpCode;
                pseudoShopWithMinimalPrices[tmpCode]["ItemPrice"] = "100000";

                pseudoShopWithMinimalPricesWithDiscount[tmpCode] = new Object();
                pseudoShopWithMinimalPricesWithDiscount[tmpCode]["DiscountAmount"] = "1";
                pseudoShopWithMinimalPricesWithDiscount[tmpCode]["DiscountPrice"] = "100000";
                pseudoShopWithMinimalPricesWithDiscount[tmpCode]["ItemCode"] = tmpCode;
                pseudoShopWithMinimalPricesWithDiscount[tmpCode]["ItemPrice"] = "100000";
            }

            // take only shops that have needed cart of products
            var suitableShops = [];
            var minimalPriceForShop = 100000;
            for (var i=0; i < tmpShops.length; i++)
            {
                var productCodesInShop = [];
                tmpShops[i].rows.forEach(function(singleItem) {
                    productCodesInShop.push(singleItem['ItemCode']);
                });
                if (SecondArrayContainsAllElementsOfFirstArray(productsInCartWith2BrandsOrMore,productCodesInShop) && (productsInCartWith2BrandsOrMore.length > 0))
                {
                    var calcPriceResult = CalculatePriceForShop($scope, cart, tmpShops[i].rows, productsInCartWith2BrandsOrMore);
                    tmpShops[i].shopInfo['CartPrice'] = calcPriceResult['CartPrice'];
                    tmpShops[i].shopInfo['ProductsToShowInAccordion'] = calcPriceResult['ProductsToShowInAccordion'];
                    tmpShops[i].shopInfo['BrandImage'] = 'img/markets/' + tmpShops[i].shopInfo['BrandName'] + '.jpg';

                    suitableShops.push(tmpShops[i].shopInfo);

                    // CODE NEEDED FOR CALCULATING CART PRICE WITH MINIMAL PRICE FOR ITEM FROM ANY SHOP
                    if (calcPriceResult['CartPrice'] < minimalPriceForShop)
                    {
                        minimalPriceForShop = calcPriceResult['CartPrice'];
                    }
                }

                // CODE NEEDED FOR CALCULATING CART PRICE WITH MINIMAL PRICE FOR ITEM FROM ANY SHOP
                // go over all items in shop and check whether it has minimal price
                for (var k=0; k < tmpShops[i].rows.length; k++)
                {
                    var tmpItemCode = tmpShops[i].rows[k]["ItemCode"];
                    // check whether we need to check this product price
                    if (productsInCartWith2BrandsOrMore.indexOf(tmpItemCode) > -1) {
                        if (parseFloat(tmpShops[i].rows[k]["ItemPrice"]) < parseFloat(pseudoShopWithMinimalPrices[tmpItemCode]["ItemPrice"]))
                        {
                            pseudoShopWithMinimalPrices[tmpItemCode]["ItemPrice"] = tmpShops[i].rows[k]["ItemPrice"];
                        }
                        if (parseFloat(tmpShops[i].rows[k]["ItemPrice"]) < parseFloat(pseudoShopWithMinimalPricesWithDiscount[tmpItemCode]["ItemPrice"]))
                        {
                            pseudoShopWithMinimalPricesWithDiscount[tmpItemCode]["ItemPrice"] = tmpShops[i].rows[k]["ItemPrice"];
                        }
                        // in some cases it will not be correct, as we may take some better discount, but will not have enough products to activate it, but it's ok
                        if ((tmpShops[i].rows[k]["DiscountPrice"] != "") && (tmpShops[i].rows[k]["DiscountAmount"] != "") )
                        {
                            if ((parseFloat(tmpShops[i].rows[k]["DiscountPrice"]) / parseFloat(tmpShops[i].rows[k]["DiscountAmount"])) < (parseFloat(pseudoShopWithMinimalPrices[tmpItemCode]["DiscountPrice"]) / parseFloat(pseudoShopWithMinimalPrices[tmpItemCode]["DiscountAmount"]))) {
                                pseudoShopWithMinimalPrices[tmpItemCode]["DiscountPrice"] = tmpShops[i].rows[k]["DiscountPrice"];
                                pseudoShopWithMinimalPrices[tmpItemCode]["DiscountAmount"] = tmpShops[i].rows[k]["DiscountAmount"];
                                // we use all possible discounts in that case
                                if ((parseFloat(tmpShops[i].rows[k]["DiscountPrice"]) / parseFloat(tmpShops[i].rows[k]["DiscountAmount"])) < parseFloat(pseudoShopWithMinimalPricesWithDiscount[tmpItemCode]["ItemPrice"]))
                                {
                                    pseudoShopWithMinimalPricesWithDiscount[tmpItemCode]["ItemPrice"] = parseFloat(tmpShops[i].rows[k]["DiscountPrice"]) / parseFloat(tmpShops[i].rows[k]["DiscountAmount"]);
                                }
                            }
                        }
                    }
                }
            }

            // CODE NEEDED FOR CALCULATING CART PRICE WITH MINIMAL PRICE FOR ITEM FROM ANY SHOP
            // get rid of associative ItemCode keys
            var pseudoShopWithMinimalPricesArray = [];
            var pseudoShopWithMinimalPricesWithDiscountArray = [];
            for (var itemCodeTmp2 in pseudoShopWithMinimalPrices){
                pseudoShopWithMinimalPricesArray.push(pseudoShopWithMinimalPrices[itemCodeTmp2]);
                pseudoShopWithMinimalPricesWithDiscountArray.push(pseudoShopWithMinimalPricesWithDiscount[itemCodeTmp2]);
            }
            var calcMinCompoundPrice = CalculatePriceForShop($scope, cart, pseudoShopWithMinimalPricesArray, productsInCartWith2BrandsOrMore);
            var calcMinCompoundPriceWithDiscounts = CalculatePriceForShop($scope, cart, pseudoShopWithMinimalPricesWithDiscountArray, productsInCartWith2BrandsOrMore);

            //console.log(minimalPriceForShop);
            //console.log(calcMinCompoundPrice['CartPrice']);
            //console.log(calcMinCompoundPriceWithDiscounts['CartPrice']);

            // calculate missing items
            var productCodesInMyCart = [];
            cart.forEach(function(singleItem) {
                productCodesInMyCart.push(singleItem['ItemCode']);
            });

            var missingProducts = productCodesInMyCart.filter(function(n) {
                return (productsInCartWith2BrandsOrMore.indexOf(n) == -1);
            });

            return {"suitableShops":suitableShops,"missingProducts":missingProducts,"minPriceForShop":minimalPriceForShop,"minCompoundPrice":calcMinCompoundPrice['CartPrice'],"minCompoundPriceWithDiscounts":calcMinCompoundPriceWithDiscounts['CartPrice']};
        }

        // finds the maximum available combination of products in shops, even if it's only 1 shop
        // in case there are 2 shops with 5 products, and 3 shops with 5 other products, it will also take cart with more shops, i.e. with 3 shops
        function FindShopsWithMaxCommonProducts($scope, cart, shops) {
            var maxNumOfProducts = 1; // we don't want to end with shops that have 0 products
            var optionalCartsWithMaxNumOfProducts = [];
            var tmpShops = angular.copy(shops);

            // find max number of products in any carts and optional carts with maximum products
            // For example found that 3 items is max, but 3 optional carts with 3 items: [1,2,3],[1,4,3],[1,2,4]
            // optionalCartsWithMaxNumOfProducts - this struct holds [1,2,3],[1,4,3],[1,2,4]
            for (var i=0; i < tmpShops.length; i++) {
                var productCodesInShop = [];
                tmpShops[i].rows.forEach(function(singleItem) {
                    productCodesInShop.push(singleItem['ItemCode']);
                });
                tmpShops[i].shopInfo['NumOfProducts'] = tmpShops[i].rows.length;
                tmpShops[i].shopInfo['Products'] = tmpShops[i].rows;

                if (tmpShops[i].shopInfo['NumOfProducts'] != 0)
                {
                    // found new max amount of products
                    if (tmpShops[i].shopInfo['NumOfProducts'] > maxNumOfProducts)
                    {
                        maxNumOfProducts = tmpShops[i].shopInfo['NumOfProducts'];
                        // start filling optional carts from beginning
                        optionalCartsWithMaxNumOfProducts = [];
                        optionalCartsWithMaxNumOfProducts.push({"shopsWithThisCart":1,"productsInCart":productCodesInShop});
                    }
                    else
                    {
                        // we already have this amount, now need to understand if we already have the same cart or it is new
                        if (tmpShops[i].shopInfo['NumOfProducts'] == maxNumOfProducts) {
                            var cartAlreadyPresent = 0;
                            for (var j = 0; j < optionalCartsWithMaxNumOfProducts.length; j++) {
                                if (TwoArraysAreIdentical(optionalCartsWithMaxNumOfProducts[j].productsInCart, productCodesInShop)) {
                                    optionalCartsWithMaxNumOfProducts[j].shopsWithThisCart++;
                                    cartAlreadyPresent = 1;
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

            // go over optional carts, and find max carts for the max amount of products.
            // For example above ([1,2,3],[1,4,3],[1,2,4]), we have 2 carts of [1,2,3] and 1 cart [1,2,4]
            var maxCartsWithMaxAmountOfProducts = 0;
            var productsInCartWithMaxAmount = [];
            for (var i=0; i < optionalCartsWithMaxNumOfProducts.length; i++) {
                if (optionalCartsWithMaxNumOfProducts[i].shopsWithThisCart > maxCartsWithMaxAmountOfProducts) {
                    maxCartsWithMaxAmountOfProducts = optionalCartsWithMaxNumOfProducts[i].shopsWithThisCart;
                    productsInCartWithMaxAmount = optionalCartsWithMaxNumOfProducts[i].productsInCart;
                }
            }

            // CODE NEEDED FOR CALCULATING CART PRICE WITH MINIMAL PRICE FOR ITEM FROM ANY SHOP
            var pseudoShopWithMinimalPrices = [];
            var pseudoShopWithMinimalPricesWithDiscount = []; // in this case we transform price to be discounted, as theoretically when we order many things we will use this discount together with other customers

            for (var i=0; i < productsInCartWithMaxAmount.length; i++)
            {
                // create pseudo shop with minimal price for each item
                var tmpCode = productsInCartWithMaxAmount[i];
                pseudoShopWithMinimalPrices[tmpCode] = new Object();
                pseudoShopWithMinimalPrices[tmpCode]["DiscountAmount"] = "1";
                pseudoShopWithMinimalPrices[tmpCode]["DiscountPrice"] = "100000";
                pseudoShopWithMinimalPrices[tmpCode]["ItemCode"] = tmpCode;
                pseudoShopWithMinimalPrices[tmpCode]["ItemPrice"] = "100000";

                pseudoShopWithMinimalPricesWithDiscount[tmpCode] = new Object();
                pseudoShopWithMinimalPricesWithDiscount[tmpCode]["DiscountAmount"] = "1";
                pseudoShopWithMinimalPricesWithDiscount[tmpCode]["DiscountPrice"] = "100000";
                pseudoShopWithMinimalPricesWithDiscount[tmpCode]["ItemCode"] = tmpCode;
                pseudoShopWithMinimalPricesWithDiscount[tmpCode]["ItemPrice"] = "100000";
            }

            // take only shops that have needed cart of products
            var suitableShops = [];
            var minimalPriceForShop = 100000;
            for (var i=0; i < tmpShops.length; i++)
            {
                var productCodesInShop = [];
                tmpShops[i].rows.forEach(function(singleItem) {
                    productCodesInShop.push(singleItem['ItemCode']);
                });
                if (TwoArraysAreIdentical(productsInCartWithMaxAmount,productCodesInShop))
                {
                    var calcPriceResult = CalculatePriceForShop($scope, cart, tmpShops[i].rows, productsInCartWithMaxAmount);
                    tmpShops[i].shopInfo['CartPrice'] = calcPriceResult['CartPrice'];
                    tmpShops[i].shopInfo['ProductsToShowInAccordion'] = calcPriceResult['ProductsToShowInAccordion'];
                    tmpShops[i].shopInfo['BrandImage'] = 'img/markets/' + tmpShops[i].shopInfo['BrandName'] + '.jpg';

                    suitableShops.push(tmpShops[i].shopInfo);

                    // CODE NEEDED FOR CALCULATING CART PRICE WITH MINIMAL PRICE FOR ITEM FROM ANY SHOP
                    if (calcPriceResult['CartPrice'] < minimalPriceForShop)
                    {
                        minimalPriceForShop = calcPriceResult['CartPrice'];
                    }
                }

                // CODE NEEDED FOR CALCULATING CART PRICE WITH MINIMAL PRICE FOR ITEM FROM ANY SHOP
                // go over all items in shop and check whether it has minimal price
                for (var k=0; k < tmpShops[i].rows.length; k++)
                {
                    var tmpItemCode = tmpShops[i].rows[k]["ItemCode"];
                    // check whether we need to check this product price
                    if (productsInCartWithMaxAmount.indexOf(tmpItemCode) > -1) {
                        if (parseFloat(tmpShops[i].rows[k]["ItemPrice"]) < parseFloat(pseudoShopWithMinimalPrices[tmpItemCode]["ItemPrice"]))
                        {
                            pseudoShopWithMinimalPrices[tmpItemCode]["ItemPrice"] = tmpShops[i].rows[k]["ItemPrice"];
                        }
                        if (parseFloat(tmpShops[i].rows[k]["ItemPrice"]) < parseFloat(pseudoShopWithMinimalPricesWithDiscount[tmpItemCode]["ItemPrice"]))
                        {
                            pseudoShopWithMinimalPricesWithDiscount[tmpItemCode]["ItemPrice"] = tmpShops[i].rows[k]["ItemPrice"];
                        }
                        // in some cases it will not be correct, as we may take some better discount, but will not have enough products to activate it, but it's ok
                        if ((tmpShops[i].rows[k]["DiscountPrice"] != "") && (tmpShops[i].rows[k]["DiscountAmount"] != "") )
                        {
                            if ((parseFloat(tmpShops[i].rows[k]["DiscountPrice"]) / parseFloat(tmpShops[i].rows[k]["DiscountAmount"])) < (parseFloat(pseudoShopWithMinimalPrices[tmpItemCode]["DiscountPrice"]) / parseFloat(pseudoShopWithMinimalPrices[tmpItemCode]["DiscountAmount"]))) {
                                pseudoShopWithMinimalPrices[tmpItemCode]["DiscountPrice"] = tmpShops[i].rows[k]["DiscountPrice"];
                                pseudoShopWithMinimalPrices[tmpItemCode]["DiscountAmount"] = tmpShops[i].rows[k]["DiscountAmount"];
                                // we use all possible discounts in that case
                                if ((parseFloat(tmpShops[i].rows[k]["DiscountPrice"]) / parseFloat(tmpShops[i].rows[k]["DiscountAmount"])) < parseFloat(pseudoShopWithMinimalPricesWithDiscount[tmpItemCode]["ItemPrice"]))
                                {
                                    pseudoShopWithMinimalPricesWithDiscount[tmpItemCode]["ItemPrice"] = parseFloat(tmpShops[i].rows[k]["DiscountPrice"]) / parseFloat(tmpShops[i].rows[k]["DiscountAmount"]);
                                }
                            }
                        }
                    }
                }
            }

            // CODE NEEDED FOR CALCULATING CART PRICE WITH MINIMAL PRICE FOR ITEM FROM ANY SHOP
            // get rid of associative ItemCode keys
            var pseudoShopWithMinimalPricesArray = [];
            var pseudoShopWithMinimalPricesWithDiscountArray = [];
            for (var itemCodeTmp2 in pseudoShopWithMinimalPrices){
                pseudoShopWithMinimalPricesArray.push(pseudoShopWithMinimalPrices[itemCodeTmp2]);
                pseudoShopWithMinimalPricesWithDiscountArray.push(pseudoShopWithMinimalPricesWithDiscount[itemCodeTmp2]);
            }
            var calcMinCompoundPrice = CalculatePriceForShop($scope, cart, pseudoShopWithMinimalPricesArray, productsInCartWithMaxAmount);
            var calcMinCompoundPriceWithDiscounts = CalculatePriceForShop($scope, cart, pseudoShopWithMinimalPricesWithDiscountArray, productsInCartWithMaxAmount);

            //console.log(minimalPriceForShop);
            //console.log(calcMinCompoundPrice['CartPrice']);
            //console.log(calcMinCompoundPriceWithDiscounts['CartPrice']);

            // calculate missing items
            var productCodesInMyCart = [];
            cart.forEach(function(singleItem) {
                productCodesInMyCart.push(singleItem['ItemCode']);
            });

            var missingProducts = productCodesInMyCart.filter(function(n) {
                return (productsInCartWithMaxAmount.indexOf(n) == -1);
            });

            return {"suitableShops":suitableShops,"missingProducts":missingProducts,"minPriceForShop":minimalPriceForShop,"minCompoundPrice":calcMinCompoundPrice['CartPrice'],"minCompoundPriceWithDiscounts":calcMinCompoundPriceWithDiscounts['CartPrice']};
        }

        function FindBestShopInRadius ($scope, cart, radius) {
            var d = $q.defer();

            // At first get from myCart only ItemCodes
            var productCodesInMyCart = [];
            cart.forEach(function(singleItem) {
                productCodesInMyCart.push(singleItem['ItemCode']);
            });

            ComparePricesStorage.GetProductsPerShopAndShops(productCodesInMyCart, radius).then(function(result) {

                // we have 3 possible options of how we show results:
                // 1. All products > 2 brands                     --> comes from FindAtLeast2BrandsWithCommonProducts
                // 2. SINGLE product in 1 brand                   --> comes from FindShopsWithMaxCommonProducts
                // 3. All products in 1 brand                     --> comes from FindShopsWithMaxCommonProducts
                //    Best collection > 2 brands                  --> comes from FindAtLeast2BrandsWithCommonProducts
                // 4. Best collection > 2 brands                  --> comes from FindAtLeast2BrandsWithCommonProducts
                // For that purpose we first find maximum cart with at least 2 brands
                // Then we check if there are missing products, if not it is case 1
                // If there are missing products we will need to additionally run function with maximum products for any carts.
                // then we check if in that maximum cart there are missing products, if yes it is case 4, if all products inside it is case 2 or 3
                var findShopsResponse = FindAtLeast2BrandsWithCommonProducts($scope, cart, result);
                var findShopsWithMaxProductsResponse = [];
                var suitableShopsWithAllProducts = [];



                if (findShopsResponse['missingProducts'].length > 0)
                {
                    // finds the maximum available combination of products in shops, even if it's only 1 shop
                    // in case there are 2 shops with 5 products, and 3 shops with 5 other products, it will take cart with more shops, i.e. with 3 shops
                    findShopsWithMaxProductsResponse = FindShopsWithMaxCommonProducts($scope, cart, result);
                    // only in that case we take results, i.e. in best collection there are missing products, while in all products no missing products
                    if(findShopsWithMaxProductsResponse['missingProducts'].length == 0)
                    {
                        suitableShopsWithAllProducts = findShopsWithMaxProductsResponse['suitableShops'];
                    }
                }

                var suitableShops = findShopsResponse['suitableShops'];

                $scope.c.missingProducts = findShopsResponse['missingProducts'];

                // SEND ANALYTICS
                if ((localStorage.getItem('IsRunningOnDevice') || "0") != "0")
                {
                    if (suitableShops.length != 0)
                    {
                        // Single product
                        if ((suitableShops[0].Products.length == 1) && ($scope.c.missingProducts == 0))
                        {
                            // send product id, and num of shops in result
                            $cordovaGoogleAnalytics.trackEvent('FindBestShop', 'Product', suitableShops[0].Products[0].ItemCode, suitableShops.length);
                        }
                        else // cart
                        {
                            var analyticArg = productCodesInMyCart.length+"_"+findShopsResponse['minPriceForShop']+"_"+findShopsResponse['minCompoundPrice']+"_"+findShopsResponse['minCompoundPriceWithDiscounts']+"_"+suitableShops.length;
                            if (($scope.c.cartID == 1) || ($scope.c.cartID == 2)) // predefined cart
                            {
                                // send missing products as first argument, and then totalProducts_minPriceForShop_minCompoundPrice_minCompoundPriceWithDiscounts_suitableShops
                                $cordovaGoogleAnalytics.trackEvent('FindBestShop', 'PredefinedCart'+$scope.c.cartID, $scope.c.missingProducts.length, analyticArg);
                            }
                            else // user cart
                            {
                                // send missing products as first argument, and then totalProducts_minPriceForShop_minCompoundPrice_minCompoundPriceWithDiscounts_suitableShops
                                $cordovaGoogleAnalytics.trackEvent('FindBestShop', 'UserCart', $scope.c.missingProducts.length, analyticArg);
                            }
                        }
                    }

                    if (suitableShopsWithAllProducts.length != 0)
                    {
                        // Single product
                        if (suitableShopsWithAllProducts[0].Products.length == 1)
                        {
                            // send product id, and num of shops in result
                            $cordovaGoogleAnalytics.trackEvent('FindBestShop', 'Product', suitableShopsWithAllProducts[0].Products[0].ItemCode, suitableShopsWithAllProducts.length);
                        }
                        else // cart
                        {
                            var analyticArg = productCodesInMyCart.length+"_"+findShopsWithMaxProductsResponse['minPriceForShop']+"_"+findShopsWithMaxProductsResponse['minCompoundPrice']+"_"+findShopsWithMaxProductsResponse['minCompoundPriceWithDiscounts']+"_"+suitableShopsWithAllProducts.length;
                            if (($scope.c.cartID == 1) || ($scope.c.cartID == 2)) // predefined cart
                            {
                                // send missing products (in that case it's always 0) as first argument, and then totalProducts_minPriceForShop_minCompoundPrice_minCompoundPriceWithDiscounts_suitableShops
                                $cordovaGoogleAnalytics.trackEvent('FindBestShop', 'PredefinedCart'+$scope.c.cartID, 0, analyticArg);
                            }
                            else // user cart
                            {
                                // send missing products (in that case it's always 0) as first argument, and then totalProducts_minPriceForShop_minCompoundPrice_minCompoundPriceWithDiscounts_suitableShops
                                $cordovaGoogleAnalytics.trackEvent('FindBestShop', 'UserCart', 0, analyticArg);
                            }
                        }
                    }
                }


                if ((suitableShops.length != 0) || (suitableShopsWithAllProducts.length != 0)) {
                    SortShops.SortByPriceAndStoreInGlobalVar($scope, suitableShops, suitableShopsWithAllProducts); // needed to add % of additional price
                    if ($scope.c.SortShopsByDistance == 1) {
                        SortShops.SortAndLimitAmount($scope, "Distance", "CartPrice");
                    }
                    else {
                        SortShops.SortAndLimitAmount($scope, "CartPrice", "Distance");
                    }
                }
                else
                {
                    $scope.c.allShopsNearThatHaveNeededProducts = [];
                    $scope.c.allShopsNearThatHaveAllProducts = [];
                }

                // after all we need products names, images to show in accordions
                d.resolve(ComparePricesStorage.GetProductsInfo(productCodesInMyCart));
            });
            return d.promise;
        }

        function FindBestShopPrivate ($scope, productsToCalculatePrice) {
            $scope.c.missingProducts = [];
            $scope.c.ShowLoading($scope.c.localize.strings['LookingForBestShop']);
            // closes opened accordions in best_shops.html
            $scope.c.ClearShowPriceDetailsForShop();
            $scope.c.comparedProducts = [];

            productsToCalculatePrice.forEach(function(singleProduct)
            {
                $scope.c.comparedProducts[singleProduct.ItemCode] = [];
                $scope.c.comparedProducts[singleProduct.ItemCode]['Amount'] = singleProduct.Amount;
            });

            FindBestShopInRadius($scope, productsToCalculatePrice, $scope.c.rangeForShops).then(function (productsInfo) {

                for (var i = 0; i < productsInfo.rows.length; i++) {
                    $scope.c.comparedProducts[productsInfo.rows[i].ItemCode]['Image'] = productsInfo.rows[i].ImagePath;
                    $scope.c.comparedProducts[productsInfo.rows[i].ItemCode]['Name'] = productsInfo.rows[i].ItemName;
                }

                // no items found
                if (($scope.c.allShopsNearThatHaveNeededProducts.length == 0) && ($scope.c.allShopsNearThatHaveAllProducts.length == 0))
                {
                        $scope.c.HideLoading();
                        var text  = $scope.c.localize.strings['NoShopWithSuchItemInTheArea'];
                        PopUpFactory.ErrorPopUp($scope, text, false, function() {});
                }
                else
                {
                    ShowModal($scope, 'templates/best_shops.html').then(function (modal) {
                        $scope.c.HideLoading();
                        $scope.modal = modal;
                        $scope.modal.show();

                        $scope.modal.close = function () {
                            $scope.modal.remove()
                        };
                    });
                }
            });
        }

        return function($scope, fullProductsToCalculatePrice) {
            var productsToCalculatePrice = [];
            // need to remove products with 0 amount
            var numOfProducts = fullProductsToCalculatePrice.length;
            for (var i=0; i < numOfProducts; i++) {
                if (fullProductsToCalculatePrice[i]['Amount'] == 0) {
                    continue;
                }
                productsToCalculatePrice.push(fullProductsToCalculatePrice[i]);
            }

            if (productsToCalculatePrice.length == 0) {
                var popUpText = $scope.c.localize.strings['NoProductsInCart'];
                PopUpFactory.ErrorPopUp($scope, popUpText, true);
            } else {
                $scope.c.shopsNearThatHaveNeededProducts = [];
                $scope.c.shopsNearThatHaveAllProducts = [];
                // user closed the app before all tables were created
                var updateStoreInfoCompleted = localStorage.getItem('UpdateStoreInfoCompleted');
                if (updateStoreInfoCompleted == "0") {
                    // Need to check for internet connection
                    if (!MiscFunctions.IsConnectedToInternet()) {
                        var popUpText = $scope.c.localize.strings['NoInternetConnectionCannotUpdateStoresInRange'];
                        PopUpFactory.ErrorPopUp($scope, popUpText, true);
                    } else {
                        $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                        var myLat = localStorage.getItem('Lat');
                        var myLon = localStorage.getItem('Lon');
                        UpdateStores.UpdateStoresInfo($scope, myLat, myLon, $scope.c.rangeForShops).then(function () {
                            $scope.c.HideLoading();
                            FindBestShopPrivate($scope, productsToCalculatePrice);
                        });
                    }
                } else {
                    // if user wants to use his current location, need to check if his location changed
                    var newStoresVersionExists = localStorage.getItem('newStoresVersionExists') || 0;
                    if ($scope.c.useUsersCurrentLocation || newStoresVersionExists == 1) {
                        $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                        UpdateStores.UpdateStoresInfoIfRequired($scope).then(function (isConnectedToInternet) {
                            $scope.c.HideLoading();
                            if (isConnectedToInternet == 1) {
                                FindBestShopPrivate($scope, productsToCalculatePrice);
                            } else if (isConnectedToInternet == 0) {
                                var popUpText = $scope.c.localize.strings['NoInternetConnectionCannotUpdateStoresInRange'];
                                PopUpFactory.ErrorPopUp($scope, popUpText, true);
                            }
                        });
                    } else {
                        FindBestShopPrivate($scope, productsToCalculatePrice);
                    }
                }
            }
        }
    }])

    .factory('GoogleReverseGeocoding', ['$q', '$resource', function($q, $resource) {
        return function(lat, lon) {
            var defer = $q.defer();
            var googleReverseGeocoding = $resource('https://maps.googleapis.com/maps/api/geocode/json',  {latlng:lat + ',' + lon, key:'AIzaSyBkW_9B1eMOoHIIkJ17PSQ8_yQ9ZJjPwME',
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
                    if (numOfFieldsInFullAddress == 3) {
                        var fullAddress = fullAddress['route'] + ' ' + fullAddress['streetNumber'] + ',' + fullAddress['locality'];
                        defer.resolve(fullAddress);
                        break;
                    }
                }
                // TODO: in this case need to try and set more accurate location
                // if for some reason the address is not full, take the most parts
                if (numOfFieldsInFullAddress != 3) {
                    var fullAddressString = '';
                    if (typeof(fullAddress['route']) != "undefined") {
                        fullAddressString += fullAddress['route'] + ' ';
                    }
                    if (typeof(fullAddress['streetNumber']) != "undefined") {
                        fullAddressString += fullAddress['streetNumber']  + ' ';
                    }
                    if (typeof(fullAddress['locality']) != "undefined") {
                        fullAddressString += fullAddress['locality'] + ' ';
                    }
                    defer.resolve(fullAddressString);
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
                var distance = R * 2 * Math.asin(Math.sqrt(a));
                distance = Math.max((Math.round(distance * 10) / 10), 0.1);

                return distance;
            },

            IsConnectedToInternet : function() {
                var isRunningOnDevice = localStorage.getItem('IsRunningOnDevice') || 0;
                if(isRunningOnDevice == 1) {
                    var networkState = navigator.connection.type;
                    return (networkState != Connection.NONE);
                } else {
                    return true;
                }
            }
        }
    }])

    .factory('SortShops', ['ComparePricesConstants', function(ComparePricesConstants) {
        function dynamicSort(property) {
            var sortOrder = 1;
            if(property[0] === "-") {
                sortOrder = -1;
                property = property.substr(1);
            }
            return function (a,b) {
                var result = (parseFloat(a[property]) < parseFloat(b[property])) ? -1 : (parseFloat(a[property]) > parseFloat(b[property])) ? 1 : 0;
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

        return {
            SortByPriceAndStoreInGlobalVar : function ($scope, suitableShops, suitableShopsWithAllProducts) {
                if (suitableShops.length > 0)
                {
                    // sort shops by price
                    suitableShops.sort(dynamicSortMultiple("CartPrice", "Distance"));

                    var minimalPrice = suitableShops[0]['CartPrice'];

                    for (var i = 0; i < suitableShops.length; i++) {
                        if (parseFloat(suitableShops[i]['CartPrice']) > parseFloat(minimalPrice)) {
                            var percentsToShowNearPrice = Math.round((suitableShops[i]['CartPrice'] / minimalPrice - 1) * 100);
                            suitableShops[i]['PercentsToShowNearPrice'] = (percentsToShowNearPrice == 0) ? "" : ' (+' + percentsToShowNearPrice + '%) ';
                            suitableShops[i]['PriceColor'] = (percentsToShowNearPrice == 0) ? "green" : (percentsToShowNearPrice < 30) ? "orange" : "red";
                        }
                        else {
                            suitableShops[i]['PercentsToShowNearPrice'] = "";
                            suitableShops[i]['PriceColor'] = "green";
                        }
                    }
                    $scope.c.allShopsNearThatHaveNeededProducts = suitableShops;
                }
                else
                {
                    $scope.c.allShopsNearThatHaveNeededProducts = [];
                }

                if (suitableShopsWithAllProducts.length > 0)
                {
                    // sort shops by price
                    suitableShopsWithAllProducts.sort(dynamicSortMultiple("CartPrice", "Distance"));

                    var minimalPriceWithAllProducts = suitableShopsWithAllProducts[0]['CartPrice'];

                    for (var i = 0; i < suitableShopsWithAllProducts.length; i++) {
                        if (parseFloat(suitableShopsWithAllProducts[i]['CartPrice']) > parseFloat(minimalPriceWithAllProducts)) {
                            var percentsToShowNearPrice = Math.round((suitableShopsWithAllProducts[i]['CartPrice'] / minimalPriceWithAllProducts - 1) * 100);
                            suitableShopsWithAllProducts[i]['PercentsToShowNearPrice'] = (percentsToShowNearPrice == 0) ? "" : ' (+' + percentsToShowNearPrice + '%) ';
                            suitableShopsWithAllProducts[i]['PriceColor'] = (percentsToShowNearPrice == 0) ? "green" : (percentsToShowNearPrice < 30) ? "orange" : "red";
                        }
                        else {
                            suitableShopsWithAllProducts[i]['PercentsToShowNearPrice'] = "";
                            suitableShopsWithAllProducts[i]['PriceColor'] = "green";
                        }
                    }
                    $scope.c.allShopsNearThatHaveAllProducts = suitableShopsWithAllProducts;
                }
                else
                {
                    $scope.c.allShopsNearThatHaveAllProducts = [];
                }
            },


            SortAndLimitAmount : function ($scope, firstSort, secondSort) {
                $scope.c.shopsNearThatHaveNeededProducts = [];
                $scope.c.shopsNearThatHaveAllProducts = [];

                var suitableShops = $scope.c.allShopsNearThatHaveNeededProducts;

                // sort shops by price
                suitableShops.sort(dynamicSortMultiple(firstSort, secondSort));

                var totalShops = 0;
                var shopsOfSpecificBrand = [];

                for (var i = 0; i < suitableShops.length; i++) {
                    if (totalShops < ComparePricesConstants.DEFAULT_MAX_SHOPS_TO_SHOW) {
                        var brandName = suitableShops[i]['BrandName'];
                        if (typeof (shopsOfSpecificBrand[brandName]) == "undefined") {
                            shopsOfSpecificBrand[brandName] = 1;
                            $scope.c.shopsNearThatHaveNeededProducts.push(suitableShops[i]);
                            totalShops++;
                        }
                        else {
                            if (shopsOfSpecificBrand[brandName] < ComparePricesConstants.DEFAULT_MAX_SHOPS_OF_THE_SAME_BRAND) {
                                shopsOfSpecificBrand[brandName]++;
                                $scope.c.shopsNearThatHaveNeededProducts.push(suitableShops[i]);
                                totalShops++;
                            }
                        }
                    }
                    else {
                        break;
                    }
                }

                if ($scope.c.allShopsNearThatHaveAllProducts.length > 0)
                {
                    var suitableShopsWithAllProducts = $scope.c.allShopsNearThatHaveAllProducts;

                    // sort shops by price
                    suitableShopsWithAllProducts.sort(dynamicSortMultiple(firstSort, secondSort));

                    var totalShopsWithAllProducts = 0;
                    var shopsOfSpecificBrandWithAllProducts = [];


                    for (var i = 0; i < suitableShopsWithAllProducts.length; i++) {
                        if (totalShopsWithAllProducts < ComparePricesConstants.DEFAULT_MAX_SHOPS_TO_SHOW) {
                            var brandName = suitableShopsWithAllProducts[i]['BrandName'];
                            if (typeof (shopsOfSpecificBrandWithAllProducts[brandName]) == "undefined") {
                                shopsOfSpecificBrandWithAllProducts[brandName] = 1;
                                $scope.c.shopsNearThatHaveAllProducts.push(suitableShopsWithAllProducts[i]);
                                totalShopsWithAllProducts++;
                            }
                            else {
                                if (shopsOfSpecificBrandWithAllProducts[brandName] < ComparePricesConstants.DEFAULT_MAX_SHOPS_OF_THE_SAME_BRAND) {
                                    shopsOfSpecificBrandWithAllProducts[brandName]++;
                                    $scope.c.shopsNearThatHaveAllProducts.push(suitableShopsWithAllProducts[i]);
                                    totalShopsWithAllProducts++;
                                }
                            }
                        }
                        else {
                            break;
                        }
                    }
                }

            }
        }
    }])

    .factory('PrepareInfoForControllers', ['$q', '$ionicLoading', 'ComparePricesStorage', 'UpdatesFromServer', function($q, $ionicLoading, ComparePricesStorage, UpdatesFromServer) {
        var _hasUserCarts       = 0;
        var _myCartsInfo        = [];
        var _myCartID           = -1;
        var _myCart             = [];
        var _productGroups       = [];
        var _productSubGroups    = [];
        var _productsInSubGroups = [];

        function FirstTimeLoadInits(firstTimeLoad) {
            var defer = $q.defer();

            if (firstTimeLoad == 1) {
                $ionicLoading.show({
                    template: '<div class="loader"><svg class="circular"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="2" stroke-miterlimit="10"/></svg></div>'
                });

                UpdatesFromServer.InitConfigFirstTimeLoad().then(function() {
                    $q.all([ComparePricesStorage.CreateTbProducts(),
                        ComparePricesStorage.CreateStoresLocationTable(),
                        ComparePricesStorage.CreatePredefinedProducts(),
                        ComparePricesStorage.CreatePredefinedCarts()]).then(function () {
                        defer.resolve();
                        localStorage.setItem('firstTimeLoad', 0);
                        setTimeout(function() {
                            $ionicLoading.hide();
                        }, 0);
                    });
                });
            } else {
                defer.resolve();
            }
            return defer.promise;
        }

        function MyCartsInitPrivate() {
            var defer = $q.defer();
            if (_myCartsInfo.length == 0) {
                ComparePricesStorage.GetAllCarts(function (result) {
                    _myCartsInfo = result.rows;
                    // check if user has own carts
                    var numOfCarts = _myCartsInfo.length;
                    for (var i = 0; i < numOfCarts; i++) {
                        if (_myCartsInfo[i]['IsPredefined'] == 0) {
                            _hasUserCarts = 1;
                            break;
                        }
                    }
                    defer.resolve();
                });
            } else {
                defer.resolve();
            }
            return defer.promise;
        }

        function InitMyCartPrivate (cartID) {
            var defer = $q.defer();

            if ((_myCartID != cartID) || (_myCart.length == 0)) {
                ComparePricesStorage.GetMyCart(cartID, function (result) {
                    _myCartID   = cartID;
                    _myCart     = result.rows;
                    defer.resolve();
                });
            } else {
                defer.resolve();
            }
            return defer.promise;
        }

        function InitProductGroupsPrivate() {
            var defer = $q.defer();

            $q.all([ComparePricesStorage.GetAllProductGroups(), ComparePricesStorage.GetAllSubProductGroups(), ComparePricesStorage.GetProductsInSubGroups()]).then(function(results) {
                _productGroups       = results[0].rows;
                _productSubGroups    = results[1].rows;
                _productsInSubGroups = results[2].rows;

                defer.resolve();
            });

            return defer.promise;
        }

        return {
            'MyCartsInit': function(firstTimeLoad) {
                var defer = $q.defer();

                FirstTimeLoadInits(firstTimeLoad).then(function() {
                    MyCartsInitPrivate().then(function() {
                        defer.resolve();
                    });
                });
                return defer.promise;
            },

            InitMyCart : function(cartID) {
                return InitMyCartPrivate(cartID);
            },

            InitProductGroups : function(firstTimeLoad) {
                var defer = $q.defer();
                FirstTimeLoadInits(firstTimeLoad).then(function() {
                    InitProductGroupsPrivate().then(function() {
                        defer.resolve();
                    });
                });
                return defer.promise;
            },

            GetUserCarts : function() {
                return _myCartsInfo;
            },

            GetHasUserCarts : function() {
                return _hasUserCarts;
            },

            GetMyCart : function() {
                return _myCart;
            },

            GetProductGroups : function() {
                return _productGroups;
            },

            GetProductSubGroups : function() {
                return _productSubGroups;
            },

            GetProductsInSubGroups : function() {
                return _productsInSubGroups;
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
                UpdateStoresInfoPrivate($scope, lat, lon, $scope.c.rangeForShops).then(function () {
                    defer.resolve();
                });
            });
            return defer.promise;
        }

        function UpdateStoresInfoPrivate($scope, myLat, myLon, radius) {
            var defer = $q.defer();

            localStorage.setItem('UpdateStoreInfoCompleted', 0);

            var newStoresVersionExists = localStorage.getItem('newStoresVersionExists') || 0;
            ComparePricesStorage.DownloadNewJsons(newStoresVersionExists).then(function() {
                // Each time we update user location we have to recalculate distance to
                // each shop and if needed download/create missing jsons/tables.
                $q.all([ComparePricesStorage.UpdateStoreRadiusFromLocations(myLat, myLon),
                    ComparePricesStorage.CreateProductTablesForShops($scope, radius)]).then(function() {
                    localStorage.setItem('newStoresVersionExists', 0);
                    localStorage.setItem('UpdateStoreInfoCompleted', 1);
                    defer.resolve();
                });
            });
            return defer.promise;
        }

        return {
            UpdateStoresInfo : function($scope, myLat, myLon, radius) {
                return UpdateStoresInfoPrivate($scope, myLat, myLon, radius);
            },

            UpdateStoresInfoIfRequired: function ($scope) {
                var defer = $q.defer();

                navigator.geolocation.getCurrentPosition(function (position) { // success callback

                        var newStoresVersionExists = localStorage.getItem('newStoresVersionExists') || 0;

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
                            if (newStoresVersionExists == "1") { // force store updates
                                UpdateStoresInfoPrivate($scope, savedLat, savedLon, $scope.c.rangeForShops).then(function () {
                                    defer.resolve(1);
                                });
                            } else {
                                defer.resolve(1);
                            }
                            return;
                        }

                        // We get here in two cases:
                        // 1) address is not set => it's our first visit and we have to create tables
                        // 2) distance between previous and current location is greater than margin and we have to look for new shops
                        // 3) user entered location manually and now want to use geolocation for a first time
                        // Get an address from google
                        // in this case we have to show confirmation popup

                        // when user just enabled geolocation, local storage still has the old value and we can know that user just turned on
                        // the geolocation and no need to show popup
                        var useUsersCurrentLocation = localStorage.getItem('UseUsersCurrentLocation');

                        if (addressAlreadySet && useUsersCurrentLocation == "1") {
                            var popUpTitle  = $scope.c.localize.strings['LocationUpdatePopupTitle'];
                            var popUpText   = $scope.c.localize.strings['LocationUpdateYourLastAddress'] + ' <b>' + $scope.c.lastAddress + '</b>.</br> ' + $scope.c.localize.strings['LocationUpdatePopupText'];
                            $scope.c.HideLoading();
                            PopUpFactory.ConfirmationPopUp($scope, popUpTitle, popUpText).then(function (confirmed) {
                                if (confirmed) {
                                    $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                                    // check for internet connection
                                    if (MiscFunctions.IsConnectedToInternet()) {
                                        ReverseGeocodingAndUpdateStore($scope, lat, lon).then(function() {
                                            defer.resolve(1);
                                        });
                                    } else {
                                        defer.resolve(0);
                                    }
                                } else { // user doesn't want to update his location
                                    if (newStoresVersionExists == "1") { // force store updates
                                        $scope.c.ShowLoading($scope.c.localize.strings['UpdatingListOfStores']);
                                        UpdateStoresInfoPrivate($scope, savedLat, savedLon, $scope.c.rangeForShops).then(function() {
                                            defer.resolve(1);
                                        });
                                    } else {
                                        defer.resolve(1);
                                    }
                                }
                            })
                        } else { // use geolocation
                            if (MiscFunctions.IsConnectedToInternet()) {
                                ReverseGeocodingAndUpdateStore($scope, lat, lon).then(function () {
                                    defer.resolve(1);
                                });
                            } else {
                                defer.resolve(0);
                            }

                        }
                    } , function (error) { // error callback
                            // when user just enabled geolocation, local storage still has the old value and we can know that user just turned on
                            // the geolocation and no need to show popup
                            var useUsersCurrentLocation = localStorage.getItem('UseUsersCurrentLocation');
                            var savedLat = localStorage.getItem('Lat') || "";
                            var savedLon = localStorage.getItem('Lon') || "";
                            // we got user's geolocation before that and now we came here because we are price for cart and wanted
                            // to check if his location changed. In this case we assume that user didn't change his location
                            if ((useUsersCurrentLocation == 1) && (savedLat != "") && (savedLon != "")) {
                                if (MiscFunctions.IsConnectedToInternet()) {
                                    defer.resolve(1);
                                } else {
                                    defer.resolve(0);
                                }
                                return;
                            }
                            $scope.c.HideLoading();

                            // on ios for some reason error.types is undefined
                            // error.PERMISSION_DENIED = 1
                            // error.code == error.TIMEOUT = 3
                            if ((error.code == 1) || (error.code == 3)) {
                                defer.resolve(2);

                                var title = $scope.c.localize.strings['NavigateToSettings'];
                                var text = $scope.c.localize.strings['DoYouWantToOpenSettings'];
                                var noButtonText  = $scope.c.localize.strings['NoButtonOpenSettings'];
                                var yesButtonText = $scope.c.localize.strings['YesButtonOpenSettings'];

                                PopUpFactory.ConfirmationPopUp($scope, title, text, noButtonText, yesButtonText).then(function (confirmed) {
                                    if (confirmed) {
                                        localStorage.setItem('UserClickedSettingsLocation', 1);
                                        if ($ionicSideMenuDelegate.isOpen()) {
                                            $ionicSideMenuDelegate.toggleRight();
                                        }
                                        cordova.plugins.settings.open();
                                    } else {
                                        if ($ionicSideMenuDelegate.isOpen()) {
                                            $ionicSideMenuDelegate.toggleRight();
                                        }
                                        $scope.c.useUsersCurrentLocation = false;
                                    }
                                });
                            } else {
                                defer.resolve(0);
                            }
                        }, { maximumAge: 3000, timeout: 5000, enableHighAccuracy: true}
                );
                return defer.promise;
            }
        }
    }])

    .factory('UpdatesFromServer', ['$resource', '$q', function($resource, $q) {
        var _config;
        return {

            CheckIfUpdateIsRequired : function() {
                var configJson = $resource('https://s3.amazonaws.com/compare.prices/stores/config.json',  {});
                configJson.get(function(config) {
                    _config = config;
                    var localTimeStamp = localStorage.getItem('localTimeStamp');
                    var localVer       = localStorage.getItem('localVer');
                    // it's no supposed to happen
                    if (localTimeStamp == null || localVer == null) {
                        localStorage.setItem('firstTimeLoad', 1);
                    } else if (localTimeStamp != _config['timeStamp']) { // need to update the timestamp and mark that new version exists
                            localStorage.setItem('localTimeStamp', _config['timeStamp']);
                            localStorage.setItem('localVer', _config['ver']);
                            localStorage.setItem('newStoresVersionExists', 1);
                    }
                });
            },

            InitConfigFirstTimeLoad : function() {
                var defer = $q.defer();

                var configJson = $resource('https://s3.amazonaws.com/compare.prices/stores/config.json',  {});
                configJson.get(function(config) {
                    _config = config;
                    var localTimeStamp = localStorage.getItem('localTimeStamp');
                    var localVer       = localStorage.getItem('localVer');
                    localStorage.setItem('localTimeStamp', _config['timeStamp']);
                    localStorage.setItem('localVer', _config['ver']);
                    defer.resolve();
                });
                return defer.promise;
            }
        }
    }])

    .factory('GroupsAndSubGroups', ['PrepareInfoForControllers', function(PrepareInfoForControllers) {

        return {
            'InitProductGroupsAndSubGroups' : function($scope) {
                $scope.productGroupsInfo = PrepareInfoForControllers.GetProductGroups();
                // Add sub groups to groups, if I do it without timeout it takes a lot of time to load the page
                $scope.$on('$ionicView.afterEnter', function () {
                    setTimeout(function () {
                        var productSubGroups = PrepareInfoForControllers.GetProductSubGroups();
                        for (var groupID = 0; groupID < $scope.productGroupsInfo.length; groupID++) {
                            $scope.productGroupsInfo[groupID]['SubGroups'] = [];
                            for (var subGroupsID = 0; subGroupsID < productSubGroups.length; subGroupsID++) {
                                if (productSubGroups[subGroupsID]['ProductGroupID'] == $scope.productGroupsInfo[groupID]['ProductGroupID']) {
                                    $scope.productGroupsInfo[groupID]['SubGroups'].push(productSubGroups[subGroupsID]);
                                }
                            }
                        }
                    }, 50);
                })
            },

            // IMPORTANT!!!!: open sub groups are closed automatically and event is propagated to this function, so no need to take care of
            // scrolling issue
            'AddProductsAndCloseAccordions' : function($scope, groupIndex, ionicScrollDelegate, offsetToScroll) {
                var needToScroll        = false;
                var useOldScrollValues  = false;
                // came for the first time => nothing to close
                if (($scope.openGroupID != -1) && ($scope.openGroupID != groupIndex)) {
                    needToScroll = true;
                    // force to close open groups
                    $scope.isGroupOpen[$scope.openGroupID] = false;
                    // force to close sub groups
                    for (var key in $scope.isSubGroupOpen[$scope.openGroupID]) {
                        if ($scope.isSubGroupOpen[$scope.openGroupID].hasOwnProperty(key)) {
                            $scope.isSubGroupOpen[$scope.openGroupID][key] = false;
                        }
                    }
                    $scope.openSubGroupID = 0;
                    // change the value of open subgroupIndex
                    for (var key in $scope.isSubGroupOpen[groupIndex]) {
                        if (($scope.isSubGroupOpen[groupIndex].hasOwnProperty(key)) && ($scope.isSubGroupOpen[groupIndex][key])) {
                            $scope.openSubGroupID = parseInt(key) + 1;
                            break;
                        }
                    }
                    $scope.openGroupID = groupIndex;
                } else if ($scope.openGroupID == -1) {
                    $scope.openGroupID = groupIndex;
                    needToScroll = true;
                } else if ($scope.openGroupID == groupIndex) {
                    useOldScrollValues = true;
                }

                // we get here also in case that user clicked on sub group, in this case we need index of this sub group
                for (var key in $scope.isSubGroupOpen[groupIndex]) {
                    if (($scope.isSubGroupOpen[groupIndex].hasOwnProperty(key)) && ($scope.isSubGroupOpen[$scope.openGroupID][key])) {
                        if ((parseInt(key) + 1) != $scope.openSubGroupID) {
                            needToScroll = true;
                            $scope.openSubGroupID = (parseInt(key) + 1);
                        }
                        break;
                    }
                }

                // if group is clicked. need to add all products to sub groups
                var productsInSubGroups = PrepareInfoForControllers.GetProductsInSubGroups();
                var numOfSubGroups = $scope.productGroupsInfo[groupIndex]['SubGroups'].length;
                for (var subGroupsID=0; subGroupsID < numOfSubGroups; subGroupsID++) {
                    // found sub group, need to copy products
                    $scope.productGroupsInfo[groupIndex]['SubGroups'][subGroupsID]['Products'] = [];
                    for (var i=0; i < productsInSubGroups.length; i++) {
                        if ((productsInSubGroups[i]['ProductGroupID'] == $scope.productGroupsInfo[groupIndex]['ProductGroupID']) &&
                            (productsInSubGroups[i]['SubProductGroupID'] == $scope.productGroupsInfo[groupIndex]['SubGroups'][subGroupsID]['SubProductGroupID'])) {
                            $scope.productGroupsInfo[groupIndex]['SubGroups'][subGroupsID]['Products'].push(productsInSubGroups[i]);
                        }
                    }
                }

                var scrollTo = (74 * groupIndex + 74 * $scope.openSubGroupID) + offsetToScroll;
                ionicScrollDelegate.freezeScroll(true);
                var scrollPosition = ionicScrollDelegate.getScrollPosition();
                setTimeout(function() {
                    ionicScrollDelegate.freezeScroll(false);
                    ionicScrollDelegate.resize();
                    if (needToScroll) {
                        ionicScrollDelegate.scrollTo(0, scrollTo, true);
                    } else if (useOldScrollValues) {
                        ionicScrollDelegate.scrollTo(0, scrollPosition.top, true);
                    }
                }, 350);
            }
        }
    }]);
