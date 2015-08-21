/**
 * Created by dimakrest on 6/17/15.
 */

angular.module('ComparePrices.services', ['ngResource'])

    .factory('ReadJson', ['$resource',
        function($resource){
            return $resource('resources/:jsonName.json', {}, {
            })
        }])

    .factory('ComparePricesStorage', ['ReadJson', 'ComparePricesConstants', '$q',
        function (ReadJson, ComparePricesConstants, $q) {

        var createUserCartsTbQuery = 'CREATE TABLE IF NOT EXISTS tbUserCarts (CartID, ItemCode, Amount)';
        var createCartsTbQuery     = 'CREATE TABLE IF NOT EXISTS tbCarts (CartID, CartName, ImageUrl, CheckboxColor, IsPredefined)';
        // TODO: database size + don't want to call init every time
        var db = openDatabase("ComparePricesDB", "1.0", "Global storage", 4 * 1024 * 1024); // TODO: check what happens when we exceed this limit

        db.transaction(initDB, errorCB, successCB); // creates tables for the first time if required

        var initProductList = localStorage.getItem('initProductList') || 1;
        if (initProductList == 1) {
            CreateTbProducts();
            CreateStoresLocationTable();
            CreatePredefinedCarts();

            // For now do this only once
            localStorage.setItem('initProductList', 0);
        }


        function CreatePredefinedCarts()
        {
            var lastCartID = 1;

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
                                'VALUES (' + lastCartID + ', "' + productId + '", ' + products[productId] + ')');
                        }
                        lastCartID++;
                    });
                });
            });

        }

        // TODO: add index
        function CreateTbProducts()
        {
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS tbProducts');
                tx.executeSql('CREATE TABLE IF NOT EXISTS tbProducts (ItemCode, ItemName, ImagePath)')
            }, errorCB, successCB);

            ReadJson.query({jsonName:'all_products'}, function (products) {
                db.transaction(function (tx) {
                    var numOfProducts = products.length;
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfProducts; i++) {
                        var singleProduct = products[i];
                        var sqlQuery = 'INSERT INTO tbProducts VALUES ("' +
                            singleProduct['ItemCode'] + '", "' +
                            singleProduct['ItemName'].replace(/\"/g, "\'\'") + '", "' +
                            singleProduct['ImagePath'] + '")';
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, successCB)
            });
        }

        // TODO: add index
        function CreateStoresLocationTable()
        {
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS tbStoresLocation');
                tx.executeSql('CREATE TABLE IF NOT EXISTS tbStoresLocation (ChainID, BrandName, BrandNameHeb, StoreID, StoreName, Lat, Lon, City, Address, Distance, ProductListExists)')
            }, errorCB, successCB);

            ReadJson.query({jsonName:'stores'}, function (storesInfo) {
                db.transaction(function (tx) {
                    var numOfBrands = storesInfo.length;
                    for (var brandIndex=0; brandIndex < numOfBrands; brandIndex++) {
                        var brandInfo = storesInfo[brandIndex];
                        var brandName       = brandInfo['brand'];
                        var brandNameHeb    = brandInfo['brand']; // TODO: change to brandHeb when have the coreect json
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
                                singleBranch['StoreId'] + '", "' +
                                singleBranch['StoreName'].replace(/\"/g, "\'\'") + '", "' +
                                singleBranch['Lat'] + '", "' +
                                singleBranch['Lng'] + '", "' +
                                singleBranch['City'].replace(/\"/g, "\'\'") + '", "' +
                                singleBranch['Address'].replace(/\"/g, "\'\'") + '", "0", 0)';
                            tx.executeSql(sqlQuery)
                        }
                    }
                }, errorCB, successCB);
            });
        }

        // Function to mark that for this store products json exists
        function SuccessTableCreation(chainID, storeID) {
            db.transaction(function (tx) {
                var sqlQuery = 'UPDATE tbStoresLocation SET ProductListExists=1 WHERE ChainID="' + chainID + '" AND StoreID="' + storeID + '";'
                tx.executeSql(sqlQuery);
            })
        }

        // TODO: add index
        function CreateProductTableForSingleShop(tableName, fileName, chainID, storeID)
        {
            // TODO: change back to query after prices update
            ReadJson.get({jsonName:fileName}, function (response) {
                db.transaction(function (tx) {
                    tx.executeSql('DROP TABLE IF EXISTS ' + tableName);
                    tx.executeSql('CREATE TABLE IF NOT EXISTS ' + tableName + ' (ItemCode, ItemPrice)')
                    var products = response['items'];
                    var numOfProducts = products.length;
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfProducts; i++) {
                        var singleProduct = products[i];
                        var sqlQuery = 'INSERT INTO ' + tableName + ' VALUES ("' +
                            singleProduct['IC'] + '", "' +
                            singleProduct['IP'] + '")';
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, SuccessTableCreation(chainID, storeID))
            });
        }

        function CreateProductTablesForShops(radius)
        {
            // get all shops in defined radius
            // read json and create table
            IssueShopsInRadiusQuery(radius, false).then(function(shopsInfo) {
                var numOfShops = shopsInfo.rows.length;
                for (var i=0; i < numOfShops; i++) {
                    // need to pad store id with zeroes to get the right name
                    var singleShop  = shopsInfo.rows[i];
                    var storeID = ("000" + singleShop['StoreID']);
                    storeID  = storeID.substr(storeID.length - 3);

                    var tableName   = 'tb_' + singleShop['BrandName'] + '_' + singleShop['StoreID'];
                    var fileName    =  'stores\/' + singleShop['BrandName'] + '\/price-' + singleShop['BrandName'] + '-' + storeID;
                    CreateProductTableForSingleShop(tableName, fileName, singleShop['ChainID'], singleShop['StoreID']);
                }
            });
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
        function IssueShopsInRadiusQuery(radius, onlyWithProductList) {
            var d = $q.defer();

            var response = {};
            response.rows = [];
            // TODO: do I need all the elements?
            var selectQuery = "SELECT * FROM tbStoresLocation WHERE Distance < " + radius;
            if (onlyWithProductList) {
                selectQuery += ' AND ProductListExists = 1';
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
            var sqlQuery = "SELECT ChainID, StoreID, Lat, Lon FROM tbStoresLocation;";
            db.transaction(function (tx) {
                tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                    // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                    var len = rawresults.rows.length;
                    for (var i = 0; i < len; i++) {
                        var singleStore = rawresults.rows.item(i);
                        var storeLat = parseFloat(singleStore['Lat']);
                        var storeLon = parseFloat(singleStore['Lon']);

                        var R = 6371; // Radius of the earth in km
                        var dLat = (myLat - storeLat) * Math.PI / 180;  // deg2rad below
                        var dLon = (myLon - storeLon) * Math.PI / 180;
                        var a = 0.5 - Math.cos(dLat) / 2 + Math.cos(storeLat * Math.PI / 180) * Math.cos(myLat * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
                        var distance = Math.round(R * 2 * Math.asin(Math.sqrt(a)));

                        var sqlQuery = 'UPDATE tbStoresLocation SET Distance=' + distance + ' WHERE ChainID="' + singleStore['ChainID'] + '" AND StoreID="' +
                                        singleStore['StoreID'] + '";';
                        tx.executeSql(sqlQuery);
                    }
                })
            })
        }

        // TODO: succes, error handlers
        return {

            GetAllProducts: function (success) {
                console.log("GetAllProducts: Init");
                var response = {};
                response.rows = [];
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM tbProducts;', [], function (tx, rawresults) {
                        var len = rawresults.rows.length;
                        console.log("GetAllProducts: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            response.rows.push(rawresults.rows.item(i));
                        }
                        if (success) {
                            success(response)
                        }
                    });
                });
                return response
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

            GetProductsPerShopAndShops : function (productCodes, radius, success) {
                IssueShopsInRadiusQuery(radius, true).then(function(response) {
                    var shopsInfo = response.rows;
                    var numOfShops = shopsInfo.length;
                    var promises = [];
                    for (var i=0; i < numOfShops; i++) {
                        var tableName   = 'tb_' + shopsInfo[i]['BrandName'] + '_' + shopsInfo[i]['StoreID'];
                        promises.push(IssueProductsSelectQuery(productCodes, tableName, shopsInfo[i]));
                    }

                    $q.all(promises).then(function (data) {
                        if (success) {
                            success(data);
                        }
                    });
                });
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

            UpdateStoresInfo : function(myLat, myLon) {
                // Each time we update user location we have to recalculate distance to
                // each shop and if needed download/creat missing jsons/tables.
                UpdateStoreRadiusFromLocations(myLat, myLon);
                CreateProductTablesForShops(ComparePricesConstants.RADIUS);
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

            ErrorPopUp: function($scope, popUpText) {
                $ionicPopup.alert({
                    template: '<div style="text-align:right">' + popUpText + '</div>'
                });
            },

            ConfirmationPopUp: function($scope, popUpTitle, popUpText) {
                return $ionicPopup.confirm({
                    title: popUpTitle,
                    template: '<div style="text-align:right">' + popUpText + '</div>',
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

        return function($scope, cart) {
            var d = $q.defer();

            // At first get from myCart only ItemCodes
            var productCodesInMyCart = [];
            cart.forEach(function(singleItem) {
                productCodesInMyCart.push(singleItem['ItemCode'])
            });

            ComparePricesStorage.GetProductsPerShopAndShops(productCodesInMyCart, ComparePricesConstants.RADIUS, function(result) {
                var numOfResults = result.length;
                for (var i=0; i < numOfResults; i++) {
                    result[i].shopInfo['NumOfProducts'] = result[i].rows.length;
                    if (result[i].shopInfo['NumOfProducts'] == 0) {
                        continue;
                    }
                    result[i].shopInfo['CartPrice'] = CalculatePriceForShop(cart, result[i].rows);
                }

                var minimumPrice    = 0;
                // Find the lowest price
                result.forEach(function(singleShopInfo) {
                    // skip stores without products
                    if (singleShopInfo.shopInfo['NumOfProducts'] == 0) {
                        return;
                    }
                    if (minimumPrice == 0 || ((minimumPrice != 0) && (singleShopInfo.shopInfo['CartPrice'] < minimumPrice))) {
                        minimumPrice = singleShopInfo.shopInfo['CartPrice'];
                    }
                });

                // TODO: sort rhe shops near array to show at first shops that match the best))
                result.forEach(function(singleShopInfo) {
                    if (singleShopInfo.shopInfo['NumOfProducts'] == 0) {
                        return;
                    }
                    singleShopInfo.shopInfo['IsChecked'] = (singleShopInfo.shopInfo['CartPrice'] == minimumPrice);
                    $scope.shopsNear.push(singleShopInfo.shopInfo);
                });
                d.resolve();
            });
            return d.promise;
        }
    }])

    // I assume that the device is ready when I get here
    .factory('ImageCache', ['$cordovaFileTransfer', '$cordovaFile', 'ComparePricesStorage',  function ($cordovaFileTransfer, $cordovaFile, ComparePricesStorage) {

        function IsImageCached(imageUrl) {
            // TODO: doesn't work
            // for browser cordova is not defined
            if (cordova == "undefined") {
                return imageUrl;
            }

            var splitedImageUrl = imageUrl.split('/');
            var imageName       = splitedImageUrl[(splitedImageUrl.length - 1)];

            return $cordovaFile.checkFile(cordova.file.documentsDirectory, imageName);
        }

        return {
            CacheImage: function (productCode, imageUrl) {
                IsImageCached(imageUrl).then(
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
    }]);
