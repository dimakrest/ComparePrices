/**
 * Created by dimakrest on 6/17/15.
 */

angular.module('ComparePrices.services', ['ngResource'])

    // TODO: read about resources
    .factory('Shop', ['$resource',
        function($resource){
            return $resource('resources/:shopName.json', {}, {
            })
        }])

    .factory('Recipes', ['$resource',
        function($resource){
            return $resource('resources/recipes/:recipe.json', {}, {
                query: {method:'GET', params:{recipe:'recipes'}, isArray:true}
            });
    }])



    .factory('ComparePricesStorage', ['Shop', '$q', function (Shop, $q) {

        var createUserCartsTbQuery = 'CREATE TABLE IF NOT EXISTS tbUserCarts (CartID, ItemCode, Amount)'
        var createCartsTbQuery     = 'CREATE TABLE IF NOT EXISTS tbCarts (CartID, CartName)'
        var fileNameToTable = {'am_pm_products'     : 'tbAmPmProducts',
                               'mega_products'      : 'tbMegaProducts',
                               'supersal_products'  : 'tbSuperSalProducts'}

        // TODO: database size + don't want to call init every time
        var db = openDatabase("ComparePricesDB", "1.0", "Global storage", 100 * 1024 * 1024);
        db.transaction(initDB, errorCB, successCB); // creates tables for the first time if required


        initProductList = localStorage.getItem('initProductList') || 1
        if (initProductList == 1) {
            CreateTbProducts()
            CreateStoresLocationTable()
            CreateProductTablesForShops()

            // For now do this only once
            localStorage.setItem('initProductList', 0)
        }

        calcStoreRadius = localStorage.getItem('calcStoreRadius') || 1
        if (calcStoreRadius == 1) {
            var sqlQuery = "SELECT ChainID, StoreID, Lat, Lon FROM tbStoresLocation;"
            var response = {}
            response.rows = []
            db.transaction(function (tx) {
                tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                    // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                    var len = rawresults.rows.length;
                    console.log("CalcStoreInRadius: " + len + " rows found.");
                    for (var i = 0; i < len; i++) {
                        response.rows.push(rawresults.rows.item(i));
                    }

                   CalculateDistanceBasedOnLogLat(response)
                });
            });
            // For now do this only once
            localStorage.setItem('calcStoreRadius', 0)
        }

        function CalculateDistanceBasedOnLogLat(storeLocationsInfo)
        {
            // Netanya, Irus Argaman 70
            var myLat = 32.286227;
            var myLon = 34.847234;

            db.transaction(function (tx) {
                var len  = storeLocationsInfo.rows.length
                for (var i=0; i < len; i++) {

                    var singleStore = storeLocationsInfo.rows[i]
                    var storeLat = parseFloat(singleStore['Lat'])
                    var storeLon = parseFloat(singleStore['Lon'])

                    var R = 6371; // Radius of the earth in km
                    var dLat = (myLat - storeLat) * Math.PI / 180;  // deg2rad below
                    var dLon = (myLon - storeLon) * Math.PI / 180;
                    var a = 0.5 - Math.cos(dLat) / 2 + Math.cos(storeLat * Math.PI / 180) * Math.cos(myLat * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
                    var distance = Math.round(R * 2 * Math.asin(Math.sqrt(a)));

                    var sqlQuery = 'UPDATE tbStoresLocation SET Distance=' + distance + ' WHERE ChainID="' + singleStore['ChainID'] + '"AND StoreID="' +
                        singleStore['StoreID'] + '";'
                    tx.executeSql(sqlQuery)
                }
            })
        }

        // TODO: add index
        function CreateTbProducts()
        {
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS tbProducts')
                tx.executeSql('CREATE TABLE IF NOT EXISTS tbProducts (ItemCode, ItemName)')
            }, errorCB, successCB)

            Shop.query({shopName:'all_products'}, function (products) {
                db.transaction(function (tx) {
                    var numOfProducts = products.length
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfProducts; i++) {
                        var singleProduct = products[i]
                        var sqlQuery = 'INSERT INTO tbProducts VALUES ("' +
                            singleProduct['ItemCode'] + '", "' +
                            singleProduct['ItemName'].replace(/\"/g, "\'\'") + '")'
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, successCB)
            });
        }

        // TODO: add index
        function CreateStoresLocationTable()
        {
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS tbStoresLocation')
                tx.executeSql('CREATE TABLE IF NOT EXISTS tbStoresLocation (ChainID, StoreID, StoreName, Lat, Lon, Address, Distance)')
            }, errorCB, successCB)

            Shop.query({shopName:'all_stores_location'}, function (storeLocations) {
                db.transaction(function (tx) {
                    var numOfStoreLocations = storeLocations.length
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfStoreLocations; i++) {
                        var singleStore = storeLocations[i]
                        var sqlQuery = 'INSERT INTO tbStoresLocation VALUES ("' +
                            singleStore['ChainID'] + '", "' +
                            singleStore['StoreID'] + '", "' +
                            singleStore['StoreName'].replace(/\"/g, "\'\'") + '", "' +
                            singleStore['Lat'] + '", "' +
                            singleStore['Lon'] + '", "' +
                            singleStore['Address'].replace(/\"/g, "\'\'") + '", "0")'
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, successCB)
            });
        }

        // TODO: add index
        function CreateProductTableForSingleShop(tableName, fileName)
        {
            // create table if needed
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS ' + tableName)
                tx.executeSql('CREATE TABLE IF NOT EXISTS ' + tableName + ' (ItemCode, ItemPrice)')
            }, errorCB, successCB)
            Shop.query({shopName:fileName}, function (products) {
                db.transaction(function (tx) {
                    var numOfProducts = products.length
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfProducts; i++) {
                        var singleProduct = products[i]
                        var sqlQuery = 'INSERT INTO ' + tableName + ' VALUES ("' +
                            singleProduct['ItemCode'] + '", "' +
                            singleProduct['ItemPrice'] + '")'
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, successCB)
            });
        }

        function CreateProductTablesForShops(tableName, fileName)
        {
            for (fileName in fileNameToTable)
            {
                var tableName = fileNameToTable[fileName]
                CreateProductTableForSingleShop(tableName, fileName)
            }
        }

        function logError(errorCallBack) {
            return function (err) {
                console.log("DB error: " + err.code)
                if (errorCallBack)
                    errorCallBack(err)
            }

        }

        function initDB(tx) {
            tx.executeSql(createUserCartsTbQuery)
            tx.executeSql(createCartsTbQuery)
        }

        // TODO: add flag to mask all prints
        function errorCB(err) {
            console.log("Error processing SQL: " + err.code);
        }

        function successCB() {
            console.log("Db connection success!");
        }

        function IsssueSelectQuery(productCodes, tableName) {
            var d = $q.defer();

            var response = {}
            response.rows = []
            var selectQuery = 'SELECT * FROM ' + tableName + ' WHERE ItemCode IN ('

            var numOfProducts = productCodes.length
            for (var i=0; i < numOfProducts; i++) {
                selectQuery += '"' + productCodes[i] + '"'
                if (i != (numOfProducts-1)) {
                    selectQuery += ', '
                }
            }
            selectQuery += ')'

            db.transaction(function (tx) {
                tx.executeSql(selectQuery, [], function (tx, rawresults) {
                    var len = rawresults.rows.length;
                    for (var i = 0; i < len; i++) {
                        response.rows.push(rawresults.rows.item(i));
                    }
                    d.resolve(response)
                });
            });

            return d.promise
        }

        // TODO: succes, error handlers
        return {

            GetAllProducts: function(success) {
                console.log("GetAllProducts: Init")
                var response = {}
                response.rows = []
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

            // DELETE FROM table_name
            // WHERE some_column=some_value;
            // TODO: for now I assume single cart
            UpdateCart: function(cartID, newCart) {
                db.transaction(function (tx) {
                    tx.executeSql('DELETE FROM tbUserCarts WHERE CartID = "' + cartID + '"')
                    newCart.forEach(function(singleProduct) {
                        tx.executeSql('INSERT INTO tbUserCarts (CartID, ItemCode, Amount)' +
                                      'VALUES ("' + singleProduct['CartID'] + '", "' + singleProduct['ItemCode'] + '", "' + singleProduct['Amount'] + '")')
                    });
                });
            },

            ClearMyCart: function() {
                console.log("Clear my cart")
                db.transaction(function (tx) {
                    tx.executeSql('DROP TABLE IF EXISTS tbUserCarts')
                    tx.executeSql(createUserCartsTbQuery)
                }, logError())
            },

            GetMyCart: function(cartID, success, error) {
                console.log("GetMyCart: Init")
                var response = {}
                response.rows = []
                db.transaction(function (tx) {
                    tx.executeSql('SELECT tbProducts.ItemCode AS ItemCode, ' +
                                  'tbProducts.ItemName AS ItemName,' +
                                  'tbUserCarts.Amount AS Amount, ' +
                                  'tbUserCarts.CartID AS CartID ' +
                                  'FROM tbProducts JOIN tbUserCarts ON tbProducts.ItemCode=tbUserCarts.ItemCode ' +
                                  'WHERE tbUserCarts.CartID="' + cartID + '"', [], function (tx, rawresults) {
                        // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                        var len = rawresults.rows.length;
                        console.log("GetMyCart: " + len + " rows found.");
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

            GetProductsForEachShopByItemCode: function(productCodes, success) {
                $q.all([
                    IsssueSelectQuery(productCodes, 'tbAmPmProducts'),
                    IsssueSelectQuery(productCodes, 'tbMegaProducts'),
                    IsssueSelectQuery(productCodes, 'tbSuperSalProducts')]).then(function(data) {

                        // TODO: is there a way to do this prettier?
                        if (success) {
                            dataAdjusted = {'AM_PM':data[0],
                                            'Mega' :data[1],
                                            'SuperSal':data[2]}
                            success(dataAdjusted)
                        }
                    });
            },

            GetStoresInRadius: function($radius, success) {
                var sqlQuery = "SELECT * FROM tbStoresLocation WHERE Distance < " + $radius
                var response = {}
                response.rows = []
                db.transaction(function (tx) {
                    tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                        // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                        var len = rawresults.rows.length;
                        console.log("GetStoresInRadius: " + len + " rows found.");
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

            GetAllCarts: function(success) {
                var sqlQuery = 'SELECT * FROM tbCarts;'
                var response = {}
                response.rows = {}
                db.transaction(function (tx) {
                    tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                        // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                        var len = rawresults.rows.length;
                        console.log("GetAllCarts: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            response.rows[rawresults.rows.item(i)['CartID']] = rawresults.rows.item(i)['CartName']
                        }
                        if (success) {
                            success(response)
                        }
                    });
                });
                return response
            },

            UpdateCartsList: function(newCart) {
                var sqlQuery = 'INSERT INTO tbCarts VALUES ("' +
                    newCart['CartID'] + '", "' +
                    newCart['CartName'] + '")'

                db.transaction(function (tx) {
                    tx.executeSql(sqlQuery)
                });
            },

            DeleteCart: function(cartID) {
                db.transaction(function (tx) {
                    var sqlQuery = 'DELETE FROM tbCarts WHERE CartID = "' + cartID + '"'
                    tx.executeSql(sqlQuery)
                });
                db.transaction(function (tx) {
                    var sqlQuery = 'DELETE FROM tbUserCarts WHERE CartID = "' + cartID + '"'
                    tx.executeSql(sqlQuery)
                });
            }
        }
    }]);
